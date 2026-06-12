"""
Platform fee calculation.

Hybrid commission model: every booking earns the platform
``max(instructor flat booking fee, lesson_amount * commission%)``.

The commission percent is a global admin setting stored on the first admin
user (``User.commission_percent``), consistent with the other global
settings (SMTP, Twilio, backup interval, inactivity timeout).
"""

from sqlalchemy.orm import Session

from ..models.user import Instructor, User, UserRole

DEFAULT_BOOKING_FEE = 20.0  # ZAR flat fallback when instructor has no fee set
DEFAULT_COMMISSION_PERCENT = 8.0  # % of lesson amount


def get_platform_commission_percent(db: Session) -> float:
    """Return the global commission percent from the first admin user."""
    first_admin = (
        db.query(User)
        .filter(User.role == UserRole.ADMIN)
        .order_by(User.id.asc())
        .first()
    )
    if first_admin is None or first_admin.commission_percent is None:
        return DEFAULT_COMMISSION_PERCENT
    return float(first_admin.commission_percent)


def calculate_booking_fee(
    instructor: Instructor,
    lesson_amount: float,
    commission_percent: float,
) -> float:
    """Effective platform fee for one booking: max(flat fee, % of lesson)."""
    flat_fee = instructor.booking_fee or DEFAULT_BOOKING_FEE
    commission = lesson_amount * (commission_percent / 100.0)
    return round(max(flat_fee, commission), 2)
