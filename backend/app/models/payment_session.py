"""
Payment session model for tracking pending payments
"""

import enum
import json

from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from ..database import Base


class PaymentSessionStatus(str, enum.Enum):
    """Payment session status"""

    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PaymentSession(Base):
    """
    Payment session to track multi-booking payments
    Created before bookings, referenced after payment confirms
    """

    __tablename__ = "payment_sessions"

    id = Column(Integer, primary_key=True, index=True)
    payment_session_id = Column(String, unique=True, index=True, nullable=False)

    # User info
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    instructor_id = Column(Integer, ForeignKey("instructors.id"), nullable=False)

    # Booking data (stored as JSON until payment completes)
    bookings_data = Column(Text, nullable=False)  # JSON array of booking details

    # Payment amounts
    amount = Column(Float, nullable=False)  # Lesson fees
    booking_fee = Column(Float, nullable=False)  # R10 per booking
    total_amount = Column(Float, nullable=False)  # amount + booking_fee

    # Payment gateway
    payment_gateway = Column(String, nullable=False)  # "payfast" or "stripe"
    gateway_transaction_id = Column(
        String, nullable=True
    )  # PayFast pf_payment_id or Stripe ID
    gateway_response = Column(Text, nullable=True)  # Full gateway response (JSON)

    # Status
    status = Column(SQLEnum(PaymentSessionStatus), default=PaymentSessionStatus.PENDING)

    # Reschedule tracking
    reschedule_booking_id = Column(
        Integer, nullable=True
    )  # Original booking ID being rescheduled

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    @property
    def bookings_list(self):
        """Parse bookings_data JSON"""
        try:
            return json.loads(self.bookings_data)
        except Exception:
            return []

    @bookings_list.setter
    def bookings_list(self, value):
        """Set bookings_data as JSON"""
        self.bookings_data = json.dumps(value)
