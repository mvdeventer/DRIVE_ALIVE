"""
Booking Credit model for tracking cancellation credits.
Credits are given when a student cancels a paid booking.
- Admin cancels: 100% credit
- 24+ hours before lesson: 90% credit
- <24 hours before lesson: 50% credit
Credits are automatically applied to the next booking payment.
"""

import enum

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class CreditStatus(str, enum.Enum):
    """Credit status enumeration"""

    PENDING = "pending"          # Credit calculated but not yet usable (awaiting next payment)
    AVAILABLE = "available"      # Credit can be used
    APPLIED = "applied"          # Credit was applied to a new booking
    EXPIRED = "expired"          # Credit expired (optional future use)


class BookingCredit(Base):
    """
    Tracks credits given to students when bookings are cancelled.

    Policy:
    - Admin cancels = 100% credit
    - Cancellation 24+ hours before lesson = 90% credit
    - Cancellation <24 hours before lesson = 50% credit
    - Credit is automatically applied at payment time
    - If credit exceeds booking cost, remainder stays for next booking
    """

    __tablename__ = "booking_credits"

    id = Column(Integer, primary_key=True, index=True)

    # Which student owns this credit
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)

    # The cancelled booking that generated this credit
    original_booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)

    # The new booking this credit was applied to (null until used)
    applied_booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)

    # Credit amount (percentage of original based on timing)
    credit_amount = Column(Float, nullable=False)

    # Original booking amount for reference
    original_amount = Column(Float, nullable=False)

    # Status
    status = Column(SQLEnum(CreditStatus), default=CreditStatus.AVAILABLE)

    # Reason: "cancellation" or "reschedule"
    reason = Column(String, nullable=False)

    # Additional notes
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    applied_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    student = relationship("Student", backref="booking_credits")
    original_booking = relationship(
        "Booking", foreign_keys=[original_booking_id], backref="credit_issued"
    )
    applied_booking = relationship(
        "Booking", foreign_keys=[applied_booking_id], backref="credit_applied"
    )
