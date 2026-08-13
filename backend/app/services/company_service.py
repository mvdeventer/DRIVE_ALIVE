"""
Company service - business logic for instructor companies / driving schools
"""
import re
from sqlalchemy.orm import Session

from ..models.company import Company
from ..models.company_admin import CompanyAdmin
from ..models.user import Instructor, User, UserRole

# Fallback name for the platform host company when initial setup did not
# supply one. The operator can rename it afterwards from admin settings.
DEFAULT_HOST_COMPANY_NAME = "RoadReady"


def slugify(name: str) -> str:
    """Convert a company name to a URL-safe slug. e.g. 'Cape Town Drivers' → 'cape-town-drivers'"""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def _unique_slug(db: Session, base_slug: str) -> str:
    """Ensure the slug is unique; append -2, -3 … on collision."""
    slug = base_slug
    counter = 2
    while db.query(Company).filter(Company.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def get_joinable_schools(db: Session) -> list[Company]:
    """Schools an instructor may ask to join, for the public registration picker.

    Deliberately narrower than "all active companies":

    * **Solo companies are excluded.** ``ensure_solo_company`` gives every
      independent instructor a one-person company named after *them*, so they
      appear in the list as a person's name. Worse, ``needs_company_approval``
      treats solo membership as needing no approval, so picking one from a
      public dropdown would attach a stranger to someone's one-person business
      with nobody asked. The sanctioned route in is an invitation, which calls
      ``promote_solo_to_school`` first.
    * **The platform host is excluded.** It operates the platform; it is not a
      driving school anyone joins.
    """
    return (
        db.query(Company)
        .filter(
            Company.is_active.is_(True),
            Company.is_solo.isnot(True),
            Company.is_platform_host.isnot(True),
        )
        .order_by(Company.name)
        .all()
    )


def get_company_by_id(db: Session, company_id: int) -> Company | None:
    return db.query(Company).filter(Company.id == company_id).first()


def create_company(
    db: Session,
    name: str,
    *,
    is_platform_host: bool = False,
    owner_user_id: int | None = None,
    billing_email: str | None = None,
) -> Company:
    """Create a new company with a unique slug.

    Does not commit — the caller owns the transaction, so a company and the
    admin who owns it are always created together or not at all.
    """
    base_slug = slugify(name)
    slug = _unique_slug(db, base_slug)
    company = Company(
        name=name.strip(),
        slug=slug,
        is_platform_host=is_platform_host,
        owner_user_id=owner_user_id,
        billing_email=billing_email,
    )
    db.add(company)
    db.flush()  # get id without committing
    return company


def ensure_solo_company(db: Session, user: User, instructor: Instructor) -> Company:
    """Give an independent instructor a one-person business of their own.

    Every booking is billed to a company. An instructor with no company
    therefore generated no platform revenue at all, which made registering
    independently a way to use the marketplace for free. Creating a company
    for them closes that, and keeps a single pricing and billing path rather
    than a second one for independents.

    What it deliberately does *not* do:

    * charge a per-instructor subscription — that is a fee for running a
      school's roster, and a solo has no roster. Set to zero so the
      arrangement is purely the commission take rate.
    * apply a markup. A solo sets their own hourly rate; there is nobody to
      hide a margin from. Commission comes out of what they charge, so they
      keep ``100% - commission``. Raising their rate is how they pass it on.

    They also get a ``CompanyAdmin`` profile: they now owe the platform money
    and must be able to see the statement that says so.

    Idempotent: an instructor who left a school reclaims the same company row
    they had before, so the charges they accrued while last independent stay
    attached to them rather than stranded on an orphan record.

    Does not commit — the caller owns the transaction.
    """
    existing = (
        db.query(Company)
        .filter(Company.owner_user_id == user.id, Company.is_solo.is_(True))
        .first()
    )
    if existing is not None:
        existing.is_active = True
        instructor.company_id = existing.id
        instructor.company_markup_type = None
        instructor.company_markup_value = 0.0
        if (
            db.query(CompanyAdmin).filter(CompanyAdmin.user_id == user.id).first()
            is None
        ):
            db.add(
                CompanyAdmin(user_id=user.id, company_id=existing.id, is_primary=True)
            )
        return existing

    name = f"{user.first_name} {user.last_name}".strip() or user.email
    company = create_company(
        db,
        name,
        owner_user_id=user.id,
        billing_email=user.email,
    )
    company.is_solo = True
    company.owner_instructor_id = instructor.id
    # Not a school: no roster fee.
    company.subscription_price_per_instructor = 0.0

    instructor.company_id = company.id
    # The legacy owner flag drives company-verification prompts meant for
    # multi-instructor schools; a solo has nobody to approve them.
    instructor.is_company_owner = False
    instructor.company_markup_type = None
    instructor.company_markup_value = 0.0

    existing = db.query(CompanyAdmin).filter(CompanyAdmin.user_id == user.id).first()
    if existing is None:
        db.add(CompanyAdmin(user_id=user.id, company_id=company.id, is_primary=True))

    return company



def retire_solo_company(db: Session, instructor: Instructor) -> None:
    """Stand down an instructor's one-person business when they join a school.

    They are an employee now, not a business: the company is deactivated and
    their administrator profile removed, so they stop seeing a billing console
    for a business that no longer trades. The row itself is kept — bookings and
    commission charges reference it, and ``ensure_solo_company`` hands the same
    one back if they go independent again.

    Does not commit.
    """
    if not instructor.company_id:
        return
    company = (
        db.query(Company)
        .filter(Company.id == instructor.company_id, Company.is_solo.is_(True))
        .first()
    )
    if company is None:
        return

    company.is_active = False
    profile = (
        db.query(CompanyAdmin)
        .filter(
            CompanyAdmin.user_id == instructor.user_id,
            CompanyAdmin.company_id == company.id,
        )
        .first()
    )
    if profile is not None:
        db.delete(profile)


def promote_solo_to_school(company: Company | None) -> None:
    """A one-person business taking on staff is a school from now on.

    Left solo it would keep skipping the break-even guard and the per-instructor
    subscription while running an actual roster.
    """
    if company is not None and company.is_solo:
        company.is_solo = False


def get_platform_host_company(db: Session) -> Company | None:
    """Return the company that operates the platform, if one exists.

    A partial unique index guarantees there is at most one.
    """
    return db.query(Company).filter(Company.is_platform_host.is_(True)).first()


def ensure_platform_host_company(
    db: Session,
    *,
    name: str | None = None,
    owner_user: User | None = None,
) -> Company | None:
    """Create the platform host company and its administrator if absent.

    Idempotent, and safe to call on every boot. Returns the host company, or
    None when the system has not been set up yet (no admin exists, so there is
    nobody to own it — initial setup creates both together instead).

    This exists because deployments predating the host-company model already
    have an admin and no host row. Without it those systems would have no
    owner for platform commission.
    """
    host = get_platform_host_company(db)
    if host is not None:
        return host

    admin = owner_user or (
        db.query(User)
        .filter(User.role == UserRole.ADMIN)
        .order_by(User.id.asc())
        .first()
    )
    if admin is None:
        return None

    host = create_company(
        db,
        name or DEFAULT_HOST_COMPANY_NAME,
        is_platform_host=True,
        owner_user_id=admin.id,
        billing_email=admin.email,
    )
    # Carry the existing platform commission across so the rate in force does
    # not silently change when the source of truth moves off the admin row.
    host.platform_commission_percent = admin.commission_percent

    # The platform operator administers the host company like any other school.
    existing_profile = (
        db.query(CompanyAdmin).filter(CompanyAdmin.user_id == admin.id).first()
    )
    if existing_profile is None:
        db.add(CompanyAdmin(user_id=admin.id, company_id=host.id, is_primary=True))

    return host


def backfill_legacy_company_admins(db: Session) -> int:
    """Give every legacy instructor-owner a CompanyAdmin profile. Commits.

    Before company administrators existed, a school was run by the instructor
    who created it (``Instructor.is_company_owner``). Those owners keep working
    through the legacy path, but without a profile they cannot reach the
    pricing, roster or billing screens. Idempotent.
    """
    owners = (
        db.query(Instructor)
        .filter(
            Instructor.is_company_owner.is_(True),
            Instructor.company_id.isnot(None),
        )
        .all()
    )
    added = 0
    for owner in owners:
        exists = (
            db.query(CompanyAdmin)
            .filter(CompanyAdmin.user_id == owner.user_id)
            .first()
        )
        if exists is None:
            db.add(
                CompanyAdmin(
                    user_id=owner.user_id,
                    company_id=owner.company_id,
                    is_primary=True,
                )
            )
            added += 1
    if added:
        db.commit()
    return added


def get_instructor_company(db: Session, instructor) -> Company | None:
    """The school an instructor teaches for, or None if independent.

    Determines the markup applied to their lessons, whose commission rate
    applies, and who is billed for the booking.
    """
    if not getattr(instructor, "company_id", None):
        return None
    return db.query(Company).filter(Company.id == instructor.company_id).first()


def resolve_managed_company_id(db: Session, user: User) -> int | None:
    """The company this user may administer, or None.

    Two routes grant authority over a school:

    * a ``CompanyAdmin`` profile — the current model;
    * ``Instructor.is_company_owner`` — the legacy model, kept so schools
      created before company administrators existed keep working.

    Callers must use the returned id rather than any caller-supplied one.
    """
    profile = db.query(CompanyAdmin).filter(CompanyAdmin.user_id == user.id).first()
    if profile is not None:
        return profile.company_id

    instructor = db.query(Instructor).filter(Instructor.user_id == user.id).first()
    if instructor is not None and instructor.is_company_owner and instructor.company_id:
        return instructor.company_id

    return None


def get_company_owner(db: Session, company_id: int) -> Instructor | None:
    """Return the owning instructor for this company, or None."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or not company.owner_instructor_id:
        return None
    return db.query(Instructor).filter(Instructor.id == company.owner_instructor_id).first()


def needs_company_approval(db: Session, instructor) -> bool:
    """Whether this instructor still needs their school owner to approve them.

    Admin approval is the first of two gates, but the second gate only exists
    for someone who joined a school they do not run. Two cases must not be
    sent to it:

    * the owner of the school — nobody is above them to approve;
    * a solo instructor. ``ensure_solo_company`` gives every independent a
      one-person company and deliberately leaves ``is_company_owner`` False,
      so a bare ``company_id is not None and not is_company_owner`` test reads
      them as a school member and parks them in ``pending_company`` awaiting
      approval from themselves.
    * someone whose school has **already** approved them. The two gates can be
      cleared in either order — a school owner can act on their link before any
      admin does — so this asks whether the school gate is still open, not
      whether the instructor is a school member. Without it, admin approval
      keeps returning an already-approved instructor to ``pending_company``,
      and the pair loop forever.
    """
    company_id = getattr(instructor, "company_id", None)
    if company_id is None:
        return False
    if getattr(instructor, "is_company_owner", False):
        return False
    if getattr(instructor, "verified_by_instructor_id", None) is not None:
        return False
    company = db.query(Company).filter(Company.id == company_id).first()
    if company is None or company.is_solo:
        return False
    return True
