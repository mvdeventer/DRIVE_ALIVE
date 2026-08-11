"""Lesson pricing and platform revenue.

Who pays what
-------------
The **student** pays one price and never sees it broken down::

    student_price = instructor_base + company_markup

The **instructor** is paid their own ``hourly_rate`` and never sees the
markup — it is their school's margin, not a deduction from their earnings.

The **school** pays the platform. Commission is charged on the gross student
price, but only for bookings the marketplace generated (``booking_source ==
"platform"``) and never to the company that operates the platform itself.

Break-even
----------
Because commission is a share of the gross rather than of the margin, a school
loses money on a platform-sourced booking if its markup is too thin::

    company_net = markup - commission% x (base + markup)

which is positive only when ``markup > base x c / (1 - c)`` — about 8.7% of
base at an 8% commission. ``break_even_markup_ratio`` exposes that so the
markup editor can refuse a loss-making setting rather than let a school
discover it in a statement.

History
-------
Commission used to be ``max(instructor flat fee, lesson x commission%)``,
added on top of the lesson and charged to the *student*. The flat floor
existed to guarantee a minimum cut on cheap lessons; the student is no longer
the payer, so both the floor and the per-instructor flat fee are gone.
"""

from typing import Optional

from sqlalchemy.orm import Session

from ..models.company import Company
from ..models.user import Instructor, User, UserRole

DEFAULT_COMMISSION_PERCENT = 8.0  # % of the gross student price

MARKUP_PERCENT = "percent"
MARKUP_AMOUNT = "amount"

#: Bookings the platform's marketplace generated. Only these attract commission.
SOURCE_PLATFORM = "platform"
#: Bookings a school brought itself. The school already pays a subscription.
SOURCE_COMPANY = "company"


def get_platform_commission_percent(
    db: Session,
    company: Optional[Company] = None,
) -> float:
    """Resolve the commission percent that applies to a booking.

    Order of precedence:

    1. the company's own negotiated rate, when one is passed and set;
    2. the platform host company's rate — the source of truth;
    3. the first admin row, for deployments predating the host company;
    4. ``DEFAULT_COMMISSION_PERCENT``.

    ``company`` is keyword-optional so existing callers, which have no company
    in hand, keep resolving the platform-wide rate unchanged.
    """
    if company is not None and company.platform_commission_percent is not None:
        return float(company.platform_commission_percent)

    host = db.query(Company).filter(Company.is_platform_host.is_(True)).first()
    if host is not None and host.platform_commission_percent is not None:
        return float(host.platform_commission_percent)

    # Legacy fallback: the rate used to live on the lowest-id admin row.
    first_admin = (
        db.query(User)
        .filter(User.role == UserRole.ADMIN)
        .order_by(User.id.asc())
        .first()
    )
    if first_admin is None or first_admin.commission_percent is None:
        return DEFAULT_COMMISSION_PERCENT
    return float(first_admin.commission_percent)


def resolve_markup(
    base_amount: float,
    hours: float,
    markup_type: Optional[str],
    markup_value: Optional[float],
) -> float:
    """The school's margin on a lesson.

    ``percent`` is a share of the base amount. ``amount`` is ZAR per hour, so
    it scales with duration exactly as ``percent`` does. Anything unrecognised
    yields no markup, so a bad value can never inflate a student's price.
    """
    if not markup_type or not markup_value:
        return 0.0
    if markup_type == MARKUP_PERCENT:
        return round(base_amount * (float(markup_value) / 100.0), 2)
    if markup_type == MARKUP_AMOUNT:
        return round(float(markup_value) * hours, 2)
    return 0.0


def resolve_student_price(
    instructor: Instructor,
    duration_minutes: int,
) -> tuple[float, float, float]:
    """Price one lesson: ``(instructor_base, company_markup, student_total)``.

    The single source of truth for what a lesson costs. Every booking path
    calls this, so the price quoted, the price charged and the price stored
    can never disagree.
    """
    hours = (duration_minutes or 0) / 60
    base = round((instructor.hourly_rate or 0.0) * hours, 2)
    markup = resolve_markup(
        base,
        hours,
        getattr(instructor, "company_markup_type", None),
        getattr(instructor, "company_markup_value", 0.0),
    )
    return base, markup, round(base + markup, 2)


def resolve_booking_source(student, company) -> str:
    """Did the marketplace generate this booking, or did the school bring it?

    Commission is a finder's fee, so it is owed only on demand the platform
    created. The discriminator is **where the learner came from**, recorded
    once on ``Student.origin_company_id`` when a school signs one up itself:

    * a learner a school enrolled, booking with that same school -> ``company``
    * anyone else -> ``platform``

    Attribution deliberately lives on the learner rather than on the booking.
    Deriving it per booking from who pressed the button would let a school
    dodge commission on a learner the marketplace found simply by making the
    bookings on their behalf. Deriving it from the request body would let the
    caller name its own price. Both are closed by reading a field only the
    enrolling school can set, and only at the moment it creates the learner.

    A learner enrolled by school A who books an instructor at school B is
    platform-sourced: from B's side the marketplace did the introducing.
    """
    if company is None:
        return SOURCE_PLATFORM
    origin = getattr(student, "origin_company_id", None)
    if origin is not None and origin == company.id:
        return SOURCE_COMPANY
    return SOURCE_PLATFORM


def calculate_platform_charge(
    gross_amount: float,
    commission_percent: float,
    *,
    booking_source: str = SOURCE_PLATFORM,
    is_platform_host: bool = False,
    has_company: bool = True,
) -> float:
    """The commission the school owes the platform for one booking.

    Zero when the school brought the booking itself, and zero for the company
    that operates the platform (it would be invoicing itself).

    ``has_company=False`` is the legacy case only. Instructors who register
    independently are given a one-person company of their own precisely so
    that they do pay commission; the branch remains for rows predating that
    and for any instructor left unattached, where billing would otherwise
    leave a charge on the booking that no ledger row backs.
    """
    if not has_company or is_platform_host:
        return 0.0
    if booking_source != SOURCE_PLATFORM:
        return 0.0
    return round(max(gross_amount, 0.0) * (commission_percent / 100.0), 2)


def break_even_markup_ratio(commission_percent: float) -> float:
    """Smallest markup, as a fraction of base, that does not lose money.

    Solving ``markup - c(base + markup) > 0`` gives ``markup > base c/(1-c)``.
    At 8% that is roughly 0.087, i.e. 8.7% of the instructor's base rate.
    """
    c = commission_percent / 100.0
    if c >= 1:
        return float("inf")
    return c / (1 - c)
