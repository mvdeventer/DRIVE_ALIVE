"""What each driving school owes the platform.

Two kinds of charge, one per table:

* ``company_platform_charges``     — commission on a single booking;
* ``company_subscription_charges`` — the monthly per-instructor fee.

Deliberately not folded into ``Transaction`` (``models/payment.py``): that
model records a payment-gateway event and has ``payment_gateway`` NOT NULL. A
platform charge is an internal accrual with no gateway behind it, so putting
the two in one table would corrupt every existing transaction query.

These are accruals, not movements of money. The platform is merchant of record
and already holds the student's payment, so what a school "owes" is really a
deduction from its payout. Settlement is recorded here (``status``,
``settled_at``, ``settlement_reference``) but performed out of band.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class ChargeStatus(str, enum.Enum):
    ACCRUED = "accrued"
    INVOICED = "invoiced"
    SETTLED = "settled"
    WAIVED = "waived"
    REVERSED = "reversed"


def period_key_for(moment: datetime | None = None) -> str:
    """The billing period a moment falls in, as ``YYYY-MM``.

    A string rather than a date range so monthly rollups are a plain equality
    filter that behaves identically on SQLite and PostgreSQL.
    """
    moment = moment or datetime.now(timezone.utc)
    return f"{moment.year:04d}-{moment.month:02d}"


class CompanyPlatformCharge(Base):
    """Commission accrued on one booking."""

    __tablename__ = "company_platform_charges"
    __table_args__ = (
        # One charge per booking. This is the idempotency key: a replayed
        # Stripe webhook, or a retried booking write, cannot bill twice.
        UniqueConstraint("booking_id", name="uq_company_platform_charges_booking"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    booking_id = Column(
        Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )

    # Snapshots. The rate and the amount it was taken on must survive later
    # edits to either the booking or the school's negotiated terms.
    basis_amount = Column(Float, nullable=False)
    commission_percent = Column(Float, nullable=False)
    charge_amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="ZAR")

    status = Column(String(20), nullable=False, default=ChargeStatus.ACCRUED.value, index=True)
    period_key = Column(String(7), nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    settled_at = Column(DateTime(timezone=True), nullable=True)
    settlement_reference = Column(String(100), nullable=True)

    # A cancelled lesson earned the platform nothing, so its commission is
    # reversed rather than deleted: the row stays as the record that it was
    # charged and then withdrawn, which is what makes a statement auditable.
    reversed_at = Column(DateTime(timezone=True), nullable=True)
    reversal_reason = Column(String(200), nullable=True)

    company = relationship("Company", foreign_keys=[company_id])
    booking = relationship("Booking", foreign_keys=[booking_id])


class CompanySubscriptionCharge(Base):
    """The monthly per-instructor fee for one school."""

    __tablename__ = "company_subscription_charges"
    __table_args__ = (
        # One subscription line per school per month, so re-running the
        # accrual is a no-op rather than a second bill.
        UniqueConstraint(
            "company_id", "period_key", name="uq_company_subscription_period"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )

    instructor_count = Column(Integer, nullable=False, default=0)
    price_per_instructor = Column(Float, nullable=False, default=0.0)
    charge_amount = Column(Float, nullable=False, default=0.0)
    currency = Column(String(3), nullable=False, default="ZAR")

    status = Column(String(20), nullable=False, default=ChargeStatus.ACCRUED.value, index=True)
    period_key = Column(String(7), nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    settled_at = Column(DateTime(timezone=True), nullable=True)
    settlement_reference = Column(String(100), nullable=True)

    company = relationship("Company", foreign_keys=[company_id])
