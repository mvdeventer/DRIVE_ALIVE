"""Company administrator endpoints.

Every route here is scoped by ``require_company_admin``, which resolves the
caller's company from their own profile. Routes must take the company id from
that context and never from a path, query or body parameter — otherwise one
school could act on another's records.
"""

from datetime import datetime, timezone
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..middleware.company import CompanyContext, require_company_admin
from ..models.company_invite import (
    CompanyInstructorInvite,
    InviteDirection,
    InviteStatus,
)
from ..models.user import Instructor, Student, User
from ..schemas.user import StudentCreate
from ..services.auth import AuthService
from ..services.role_transition_policy import TransitionChannel
from ..services.billing_service import accrue_subscription, company_statement
from ..services.email_service import EmailService
from ..services.recruitment_service import (
    accept_invite,
    assert_instructor_can_join,
    assert_invite_open,
    leave_company,
)
from ..services.fees import (
    MARKUP_AMOUNT,
    MARKUP_PERCENT,
    break_even_markup_ratio,
    calculate_platform_charge,
    get_platform_commission_percent,
    resolve_student_price,
)

router = APIRouter(prefix="/company", tags=["company-admin"])

# A one-hour lesson is the reference used for every figure shown in the markup
# editor, so schools compare like with like.
_PREVIEW_MINUTES = 60


class MarkupUpdate(BaseModel):
    """Set an instructor's markup. ``none`` clears it."""

    markup_type: Literal["percent", "amount", "none"]
    markup_value: float = Field(default=0.0, ge=0, le=100000)


def _pricing_preview(
    instructor: Instructor,
    commission_percent: float,
    is_platform_host: bool,
) -> dict:
    """What one hour with this instructor earns everybody."""
    base, markup, total = resolve_student_price(instructor, _PREVIEW_MINUTES)
    charge = calculate_platform_charge(
        total, commission_percent, is_platform_host=is_platform_host
    )
    return {
        "instructor_base": base,
        "company_markup": markup,
        "student_pays": total,
        "platform_charge": charge,
        "company_net": round(markup - charge, 2),
    }


def _instructor_row(
    instructor: Instructor,
    user: Optional[User],
    commission_percent: float,
    is_platform_host: bool,
) -> dict:
    return {
        "instructor_id": instructor.id,
        "full_name": user.full_name if user else None,
        "email": user.email if user else None,
        "verification_status": instructor.verification_status,
        "markup_type": instructor.company_markup_type,
        "markup_value": instructor.company_markup_value or 0.0,
        "pricing": _pricing_preview(instructor, commission_percent, is_platform_host),
    }


@router.get("/pricing")
async def get_company_pricing(
    ctx: Annotated[CompanyContext, Depends(require_company_admin)],
    db: Session = Depends(get_db),
):
    """Every instructor at this school, with their markup and margin.

    ``break_even_markup_ratio`` is returned so the client can warn before a
    school saves a markup that loses money on every platform-sourced booking.
    """
    commission_percent = get_platform_commission_percent(db, ctx.company)
    is_host = bool(ctx.company.is_platform_host)

    instructors = (
        db.query(Instructor).filter(Instructor.company_id == ctx.company_id).all()
    )
    rows = []
    for instructor in instructors:
        user = db.query(User).filter(User.id == instructor.user_id).first()
        rows.append(_instructor_row(instructor, user, commission_percent, is_host))

    return {
        "company_id": ctx.company_id,
        "company_name": ctx.company.name,
        "commission_percent": commission_percent,
        "is_platform_host": is_host,
        # Fraction of base, e.g. 0.08696 at 8%. Below this the school pays the
        # platform more than the markup earns it.
        "break_even_markup_ratio": (
            0.0 if is_host else round(break_even_markup_ratio(commission_percent), 5)
        ),
        "instructors": rows,
    }


@router.put("/instructors/{instructor_id}/markup")
async def set_instructor_markup(
    instructor_id: int,
    payload: MarkupUpdate,
    ctx: Annotated[CompanyContext, Depends(require_company_admin)],
    db: Session = Depends(get_db),
):
    """Set the markup added to one instructor's lessons.

    Refuses a markup that would lose money on a platform-sourced booking:
    commission is charged on the gross, so a thin markup costs the school more
    than it earns. A school that discovers that in a statement has already
    lost the money.
    """
    instructor = (
        db.query(Instructor)
        .filter(
            Instructor.id == instructor_id,
            # Scoped to the caller's own school.
            Instructor.company_id == ctx.company_id,
        )
        .first()
    )
    if instructor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "INSTRUCTOR_NOT_IN_COMPANY",
                "message": "That instructor does not belong to your school.",
            },
        )

    commission_percent = get_platform_commission_percent(db, ctx.company)
    is_host = bool(ctx.company.is_platform_host)

    if payload.markup_type == "none":
        new_type, new_value = None, 0.0
    else:
        new_type, new_value = payload.markup_type, payload.markup_value

    # Evaluate against a reference hour before committing anything.
    candidate = Instructor(
        hourly_rate=instructor.hourly_rate,
        company_markup_type=new_type,
        company_markup_value=new_value,
    )
    preview = _pricing_preview(candidate, commission_percent, is_host)

    # A solo business is exempt: the "loss" is not a mispriced lesson, it is
    # simply the commission coming out of their own rate, and absorbing it
    # rather than passing it to their learners is a legitimate choice.
    if new_type is not None and preview["company_net"] < 0 and not ctx.company.is_solo:
        minimum = round(
            (instructor.hourly_rate or 0.0) * break_even_markup_ratio(commission_percent),
            2,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "MARKUP_BELOW_BREAK_EVEN",
                "message": (
                    f"That markup loses R{abs(preview['company_net']):.2f} an hour. "
                    f"Commission is {commission_percent:g}% of the full price the "
                    f"student pays, so you need at least R{minimum:.2f} an hour "
                    f"to break even."
                ),
                "minimum_markup_amount_per_hour": minimum,
                "company_net": preview["company_net"],
            },
        )

    instructor.company_markup_type = new_type
    instructor.company_markup_value = new_value
    instructor.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(instructor)

    user = db.query(User).filter(User.id == instructor.user_id).first()
    return _instructor_row(instructor, user, commission_percent, is_host)


# ==================== Instructor recruitment ====================


class InviteCreate(BaseModel):
    """Invite an instructor to join this school."""

    email: str = Field(..., max_length=255)
    markup_type: Literal["percent", "amount", "none"] = "none"
    markup_value: float = Field(default=0.0, ge=0, le=100000)


def _invite_row(invite: CompanyInstructorInvite) -> dict:
    return {
        "id": invite.id,
        "direction": invite.direction,
        "email": invite.email,
        "instructor_id": invite.instructor_id,
        "status": invite.status,
        "markup_type": invite.proposed_markup_type,
        "markup_value": invite.proposed_markup_value,
        "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
        "created_at": invite.created_at.isoformat() if invite.created_at else None,
    }


def _assert_markup_viable(
    hourly_rate: float,
    markup_type: Optional[str],
    markup_value: float,
    commission_percent: float,
    is_host: bool,
    is_solo: bool = False,
) -> None:
    """Refuse a markup the school would lose money on.

    Applied to invitations as well as edits, so an offer cannot smuggle in a
    rate the pricing screen would have rejected. The host company pays no
    commission, and a solo business is choosing what to absorb of its own
    rate, so neither can be loss-making in the sense this guards against.
    """
    if markup_type is None or is_host or is_solo:
        return
    candidate = Instructor(
        hourly_rate=hourly_rate,
        company_markup_type=markup_type,
        company_markup_value=markup_value,
    )
    preview = _pricing_preview(candidate, commission_percent, is_host)
    if preview["company_net"] < 0:
        minimum = round(hourly_rate * break_even_markup_ratio(commission_percent), 2)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "MARKUP_BELOW_BREAK_EVEN",
                "message": (
                    f"That markup loses R{abs(preview['company_net']):.2f} an hour. "
                    f"You need at least R{minimum:.2f} an hour to break even."
                ),
                "minimum_markup_amount_per_hour": minimum,
                "company_net": preview["company_net"],
            },
        )


@router.get("/invites")
async def list_invites(
    ctx: Annotated[CompanyContext, Depends(require_company_admin)],
    db: Session = Depends(get_db),
):
    """Every invitation this school has sent or received."""
    invites = (
        db.query(CompanyInstructorInvite)
        .filter(CompanyInstructorInvite.company_id == ctx.company_id)
        .order_by(CompanyInstructorInvite.id.desc())
        .all()
    )
    return {"invites": [_invite_row(invite) for invite in invites]}


@router.post("/invites", status_code=status.HTTP_201_CREATED)
async def create_invite(
    payload: InviteCreate,
    ctx: Annotated[CompanyContext, Depends(require_company_admin)],
    db: Session = Depends(get_db),
):
    """Invite an instructor to join this school.

    The invitee need not have an account: the link carries them through
    registration and joins them on the way out. If they do have one and
    already teach for another school, refuse now rather than let them
    discover it on the far side of the email.
    """
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_EMAIL", "message": "Enter a valid email address."},
        )

    existing_open = (
        db.query(CompanyInstructorInvite)
        .filter(
            CompanyInstructorInvite.company_id == ctx.company_id,
            CompanyInstructorInvite.email == email,
            CompanyInstructorInvite.status == InviteStatus.PENDING.value,
        )
        .first()
    )
    if existing_open is not None and existing_open.is_valid():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "INVITE_ALREADY_PENDING",
                "message": "You have already invited this person.",
            },
        )

    markup_type = None if payload.markup_type == "none" else payload.markup_type
    markup_value = 0.0 if markup_type is None else payload.markup_value

    user = db.query(User).filter(User.email == email).first()
    instructor = (
        db.query(Instructor).filter(Instructor.user_id == user.id).first()
        if user
        else None
    )
    if instructor is not None:
        # Surfaces "already at another school" before the email goes out.
        assert_instructor_can_join(instructor)
        commission_percent = get_platform_commission_percent(db, ctx.company)
        _assert_markup_viable(
            instructor.hourly_rate or 0.0,
            markup_type,
            markup_value,
            commission_percent,
            bool(ctx.company.is_platform_host),
            bool(ctx.company.is_solo),
        )

    invite = CompanyInstructorInvite(
        company_id=ctx.company_id,
        invited_by_user_id=ctx.user.id,
        direction=InviteDirection.INVITE.value,
        email=email,
        instructor_id=instructor.id if instructor else None,
        token=CompanyInstructorInvite.generate_token(),
        status=InviteStatus.PENDING.value,
        proposed_markup_type=markup_type,
        proposed_markup_value=markup_value,
        expires_at=CompanyInstructorInvite.get_expiration_time(),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    link = f"{settings.FRONTEND_URL}/instructor-invite?token={invite.token}"
    body = (
        f"{ctx.company.name} has invited you to join their driving school on RoadReady.\n\n"
        f"Accept or decline here:\n{link}\n\n"
        f"This invitation expires in 7 days."
    )
    # Returns False when SMTP is unconfigured rather than raising, so report it
    # instead of letting the admin believe the email went out.
    email_sent = EmailService.for_admin(db).send_simple_email(
        email, f"Invitation to join {ctx.company.name}", body
    )

    return {
        **_invite_row(invite),
        "email_sent": email_sent,
        "invite_link": link,
        "warning": (
            None if email_sent else "Email could not be sent. Share the link yourself."
        ),
    }


@router.post("/invites/{invite_id}/revoke")
async def revoke_invite(
    invite_id: int,
    ctx: Annotated[CompanyContext, Depends(require_company_admin)],
    db: Session = Depends(get_db),
):
    """Withdraw an invitation this school sent."""
    invite = (
        db.query(CompanyInstructorInvite)
        .filter(
            CompanyInstructorInvite.id == invite_id,
            CompanyInstructorInvite.company_id == ctx.company_id,
        )
        .first()
    )
    if invite is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "INVITE_NOT_FOUND",
                "message": "That invitation is not valid.",
            },
        )
    assert_invite_open(invite)

    invite.status = InviteStatus.REVOKED.value
    invite.responded_at = datetime.now(timezone.utc)
    db.commit()
    return _invite_row(invite)


@router.post("/invites/{invite_id}/approve")
async def approve_join_request(
    invite_id: int,
    ctx: Annotated[CompanyContext, Depends(require_company_admin)],
    db: Session = Depends(get_db),
):
    """Accept an instructor's request to join this school."""
    invite = (
        db.query(CompanyInstructorInvite)
        .filter(
            CompanyInstructorInvite.id == invite_id,
            CompanyInstructorInvite.company_id == ctx.company_id,
            CompanyInstructorInvite.direction == InviteDirection.REQUEST.value,
        )
        .first()
    )
    if invite is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "INVITE_NOT_FOUND", "message": "That request is not valid."},
        )
    assert_invite_open(invite)

    instructor = (
        db.query(Instructor).filter(Instructor.id == invite.instructor_id).first()
    )
    assert_instructor_can_join(instructor)
    accept_invite(db, invite, instructor)
    db.commit()

    user = db.query(User).filter(User.id == instructor.user_id).first()
    commission_percent = get_platform_commission_percent(db, ctx.company)
    return _instructor_row(
        instructor, user, commission_percent, bool(ctx.company.is_platform_host)
    )


@router.post("/instructors/{instructor_id}/remove")
async def remove_instructor(
    instructor_id: int,
    ctx: Annotated[CompanyContext, Depends(require_company_admin)],
    db: Session = Depends(get_db),
):
    """Remove an instructor from this school.

    Their account and history survive; only the membership and the markup go.
    """
    instructor = (
        db.query(Instructor)
        .filter(
            Instructor.id == instructor_id,
            Instructor.company_id == ctx.company_id,
        )
        .first()
    )
    if instructor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "INSTRUCTOR_NOT_IN_COMPANY",
                "message": "That instructor does not belong to your school.",
            },
        )

    leave_company(db, instructor)
    db.commit()
    return {"instructor_id": instructor_id, "removed": True}


# ==================== Billing ====================


# ==================== Own learners ====================


@router.post("/students", status_code=status.HTTP_201_CREATED)
async def enrol_learner(
    student_data: StudentCreate,
    ctx: Annotated[CompanyContext, Depends(require_company_admin)],
    db: Session = Depends(get_db),
):
    """Sign up a learner the school brought itself.

    This is the other half of the revenue model. A learner who arrives through
    the marketplace earns the platform its commission; one the school recruited
    does not, and this is how a school records the difference. The attribution
    is taken from the caller's own company context, so a school can only ever
    claim a learner as its own — never as another school's.

    It is deliberately one-way: there is no endpoint to reassign an existing
    learner, because that would let a school claim marketplace learners after
    the fact and wipe out the commission on them.
    """
    user, student = AuthService.create_student(
        db=db,
        student_data=student_data,
        channel=TransitionChannel.SCHOOL_ENROLMENT,
        actor_user=ctx.user,
        origin_company_id=ctx.company_id,
    )
    return {
        "message": f"{user.first_name} {user.last_name} enrolled.",
        "user_id": user.id,
        "student_id": student.id,
        "origin_company_id": student.origin_company_id,
    }


@router.get("/students")
async def list_own_learners(
    ctx: Annotated[CompanyContext, Depends(require_company_admin)],
    db: Session = Depends(get_db),
):
    """The learners this school signed up itself."""
    rows = (
        db.query(Student, User)
        .join(User, Student.user_id == User.id)
        .filter(Student.origin_company_id == ctx.company_id)
        .order_by(User.first_name, User.last_name)
        .all()
    )
    return {
        "students": [
            {
                "student_id": student.id,
                "name": f"{user.first_name} {user.last_name}",
                "email": user.email,
                "phone": user.phone,
                # The school needs to see who never confirmed their address,
                # because they are the ones who will phone the school about it.
                "status": user.status.value if hasattr(user.status, "value") else user.status,
            }
            for student, user in rows
        ]
    }


@router.post("/students/{student_id}/resend-verification")
async def resend_learner_verification(
    student_id: int,
    ctx: Annotated[CompanyContext, Depends(require_company_admin)],
    db: Session = Depends(get_db),
):
    """Send a learner their account verification link again.

    A fallback, nothing more. A learner who signed up at the counter and never
    received the email would otherwise have to reach the platform operator; the
    school that enrolled them can now send it again themselves.

    Deliberately **not** an override: this re-sends the link, it never marks the
    account verified. An address nobody has confirmed must not become an active
    account just because a school says so.

    Scoped to learners this school enrolled itself — `origin_company_id` comes
    from the caller's own company context, never from the request.
    """
    row = (
        db.query(Student, User)
        .join(User, Student.user_id == User.id)
        .filter(
            Student.id == student_id,
            Student.origin_company_id == ctx.company_id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "LEARNER_NOT_IN_SCHOOL",
                "message": "That learner is not one this school enrolled.",
            },
        )

    _, user = row
    user_status = user.status.value if hasattr(user.status, "value") else user.status
    if user_status == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "LEARNER_ALREADY_VERIFIED",
                "message": "That learner has already verified their account.",
            },
        )

    from ..routes.verification import _get_admin_email_config_or_503
    from ..services.verification_service import VerificationService

    admin, smtp_password = _get_admin_email_config_or_503(db)
    token = VerificationService.create_verification_token(
        db=db,
        user_id=user.id,
        token_type="email",
        validity_minutes=admin.verification_link_validity_minutes or 30,
    )
    result = VerificationService.send_verification_messages(
        db=db,
        user=user,
        verification_token=token,
        frontend_url=settings.FRONTEND_URL,
        admin_smtp_email=admin.smtp_email,
        admin_smtp_password=smtp_password,
    )

    if not result.get("email_sent") and not result.get("whatsapp_sent"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "LEARNER_UNREACHABLE",
                "message": (
                    "Could not reach that learner. Check the email address and "
                    "phone number on their account."
                ),
            },
        )

    return {
        "message": f"Verification link resent to {user.first_name} {user.last_name}.",
        "email_sent": result.get("email_sent", False),
        "whatsapp_sent": result.get("whatsapp_sent", False),
        "expires_in_minutes": result.get("expires_in_minutes"),
    }


@router.get("/statement")
async def get_company_statement(
    ctx: Annotated[CompanyContext, Depends(require_company_admin)],
    db: Session = Depends(get_db),
    period: Optional[str] = None,
):
    """What this school owes the platform for a billing period.

    Defaults to the current month. Refreshes the subscription line first so
    the figure reflects today's headcount rather than whenever the accrual
    last ran.
    """
    accrue_subscription(db, ctx.company, period=period)
    return company_statement(db, ctx.company, period=period)
