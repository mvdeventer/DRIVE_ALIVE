"""Joining and leaving a driving school.

Both recruitment directions — a school inviting an instructor, and an
instructor asking to join — converge on ``accept_invite``. Keeping one
acceptance path means the membership rule, the markup handover and the
verification interaction cannot drift apart between the two flows.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.company_invite import (
    CompanyInstructorInvite,
    InviteStatus,
)
from ..models.user import Instructor, InstructorVerificationStatus, User


def _now() -> datetime:
    return datetime.now(timezone.utc)


def apply_company_approval(instructor: Instructor) -> None:
    """Record that the instructor's school has approved them.

    Never lowers an instructor's standing. Accepting an invitation is a
    company-side approval, so an instructor waiting on their school moves on
    to the admin step — but one who is already verified stays verified rather
    than being knocked back into a queue they have already cleared.
    """
    current = instructor.verification_status
    if current == InstructorVerificationStatus.PENDING_COMPANY.value:
        instructor.verification_status = InstructorVerificationStatus.PENDING_ADMIN.value
    # VERIFIED, PENDING_ADMIN and None are all left untouched.


def find_invite_by_token(db: Session, token: str) -> CompanyInstructorInvite:
    """Look up an invitation, or raise 404."""
    invite = (
        db.query(CompanyInstructorInvite)
        .filter(CompanyInstructorInvite.token == token)
        .first()
    )
    if invite is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "INVITE_NOT_FOUND",
                "message": "That invitation link is not valid.",
            },
        )
    return invite


def assert_invite_open(invite: CompanyInstructorInvite) -> None:
    """Raise unless the invitation is still awaiting an answer."""
    if not invite.is_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVITE_NOT_OPEN",
                "message": "That invitation has already been answered or has expired.",
                "status": invite.status,
            },
        )


def assert_instructor_can_join(instructor: Optional[Instructor]) -> Instructor:
    """The instructor is real, not rejected, and not already at a school.

    Belonging to one's own one-person business does not count as being at a
    school — every independent instructor has one, so treating it as
    membership would make them permanently unrecruitable.
    """
    if instructor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "INSTRUCTOR_PROFILE_REQUIRED",
                "message": "You need an instructor profile to join a driving school.",
            },
        )
    if instructor.verification_status == InstructorVerificationStatus.REJECTED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "INSTRUCTOR_REJECTED",
                "message": "This instructor account has been rejected.",
            },
        )
    # Fails closed: if the company cannot be resolved from here, assume it is
    # a school rather than waving through a move that may not be allowed.
    company = getattr(instructor, "company", None)
    own_business = company is not None and company.is_solo
    if instructor.company_id is not None and not own_business:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "INSTRUCTOR_ALREADY_IN_COMPANY",
                "message": "This instructor already belongs to a driving school.",
            },
        )
    return instructor


def accept_invite(
    db: Session,
    invite: CompanyInstructorInvite,
    instructor: Instructor,
) -> Instructor:
    """Join the instructor to the school. Does not commit.

    The membership check is repeated here against a freshly read row because
    the check made when the invitation was created is only a courtesy — two
    schools can invite the same instructor, and both invitations can be
    accepted at once. On PostgreSQL the row is locked for the duration; on
    SQLite the write is serialised anyway.
    """
    locked = db.query(Instructor).filter(Instructor.id == instructor.id)
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        locked = locked.with_for_update()
    fresh = locked.first()

    # Re-checked inside the transaction: this is the actual guarantee.
    assert_instructor_can_join(fresh)

    # They are joining a school, so their own one-person business stands down
    # and the school they join is no longer a one-person business either.
    from .company_service import (
        get_company_by_id,
        promote_solo_to_school,
        retire_solo_company,
    )

    retire_solo_company(db, fresh)
    promote_solo_to_school(get_company_by_id(db, invite.company_id))

    fresh.company_id = invite.company_id
    fresh.company_markup_type = invite.proposed_markup_type
    fresh.company_markup_value = invite.proposed_markup_value or 0.0
    fresh.company_joined_at = _now()
    fresh.is_company_owner = False
    apply_company_approval(fresh)

    invite.status = InviteStatus.ACCEPTED.value
    invite.instructor_id = fresh.id
    invite.responded_at = _now()

    # Any other offer on the table is moot now that they have joined.
    supersede_other_invites(db, fresh, keep_invite_id=invite.id)

    return fresh


def supersede_other_invites(
    db: Session,
    instructor: Instructor,
    *,
    keep_invite_id: Optional[int] = None,
) -> int:
    """Expire every other open invitation aimed at this instructor.

    Prevents a stale link from a second school still looking live after the
    instructor has committed elsewhere.
    """
    user = db.query(User).filter(User.id == instructor.user_id).first()
    query = db.query(CompanyInstructorInvite).filter(
        CompanyInstructorInvite.status == InviteStatus.PENDING.value
    )
    if user is not None:
        query = query.filter(
            (CompanyInstructorInvite.instructor_id == instructor.id)
            | (CompanyInstructorInvite.email == user.email)
        )
    else:
        query = query.filter(CompanyInstructorInvite.instructor_id == instructor.id)

    superseded = 0
    for other in query.all():
        if keep_invite_id is not None and other.id == keep_invite_id:
            continue
        other.status = InviteStatus.EXPIRED.value
        other.responded_at = _now()
        superseded += 1
    return superseded


def leave_company(db: Session, instructor: Instructor) -> None:
    """Detach an instructor from their school. Does not commit.

    Clears the markup along with the membership so their lessons revert to
    their own rate. Existing bookings are untouched: they carry their own
    snapshot of the price that was charged.
    """
    # Their own one-person business is not a school to resign from; leaving it
    # would only hand the same company straight back.
    own_business = getattr(instructor, "company", None)
    if instructor.company_id is None or (
        own_business is not None and own_business.is_solo
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INSTRUCTOR_NOT_IN_COMPANY",
                "message": "You do not belong to a driving school.",
            },
        )

    instructor.company_id = None
    instructor.company_markup_type = None
    instructor.company_markup_value = 0.0
    instructor.company_joined_at = None
    instructor.is_company_owner = False

    # Back to trading on their own account. Without this they would leave with
    # no company at all, and their lessons would earn the platform nothing.
    from .company_service import ensure_solo_company

    user = db.query(User).filter(User.id == instructor.user_id).first()
    if user is not None:
        ensure_solo_company(db, user, instructor)


def expire_stale_invites(db: Session) -> int:
    """Mark every lapsed invitation expired. Commits."""
    stale = (
        db.query(CompanyInstructorInvite)
        .filter(
            CompanyInstructorInvite.status == InviteStatus.PENDING.value,
            CompanyInstructorInvite.expires_at < _now(),
        )
        .all()
    )
    for invite in stale:
        invite.status = InviteStatus.EXPIRED.value
    if stale:
        db.commit()
    return len(stale)
