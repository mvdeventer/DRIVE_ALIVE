"""
Booking models for lesson scheduling
"""

import enum

from sqlalchemy import Boolean, Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class BookingStatus(str, enum.Enum):
    """Booking status enumeration"""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class PaymentStatus(str, enum.Enum):
    """Payment status enumeration"""

    PENDING = "pending"
    PAID = "paid"
    REFUNDED = "refunded"
    FAILED = "failed"


class Booking(Base):
    """Booking model for driving lessons"""

    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String, unique=True, index=True, nullable=False)

    # Relations
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    instructor_id = Column(Integer, ForeignKey("instructors.id"), nullable=False)

    # Lesson details
    lesson_date = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)
    lesson_type = Column(
        String, nullable=False
    )  # "beginner", "intermediate", "advanced", "test_preparation"

    # Location
    pickup_latitude = Column(Float, nullable=False)
    pickup_longitude = Column(Float, nullable=False)
    pickup_address = Column(String, nullable=False)

    dropoff_latitude = Column(Float, nullable=True)
    dropoff_longitude = Column(Float, nullable=True)
    dropoff_address = Column(String, nullable=True)

    # Status
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PENDING)

    # Payment
    amount = Column(Float, nullable=False)  # In ZAR
    payment_status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(String, nullable=True)  # "stripe", "payfast"
    payment_id = Column(String, nullable=True)

    # Notes
    student_notes = Column(Text, nullable=True)
    instructor_notes = Column(Text, nullable=True)

    # Cancellation
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_by = Column(String, nullable=True)  # "student" or "instructor"
    cancellation_reason = Column(Text, nullable=True)
    refund_amount = Column(Float, nullable=True)
    cancellation_fee = Column(
        Float, nullable=True, default=0.0
    )  # 50% fee if cancelled/rescheduled within 6 hours

    # Reschedule tracking
    rebooking_count = Column(
        Integer, nullable=False, default=0
    )  # Number of times rescheduled
    original_lesson_date = Column(
        DateTime(timezone=True), nullable=True
    )  # Original booking date

    # WhatsApp reminders
    reminder_sent = Column(
        Boolean, nullable=False, default=False
    )  # Student 24hr reminder sent
    instructor_reminder_sent = Column(
        Boolean, nullable=False, default=False
    )  # Instructor 15min reminder sent
    daily_summary_sent = Column(
        Boolean, nullable=False, default=False
    )  # Included in daily summary

    # Booking fee (admin configurable per instructor, default R20)
    booking_fee = Column(Float, nullable=False, default=20.0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="bookings")
    instructor = relationship("Instructor", back_populates="bookings")
    review = relationship("Review", back_populates="booking", uselist=False)


class Review(Base):
    """Review model for completed lessons"""

    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False)

    # Rating (1-5 stars)
    rating = Column(Integer, nullable=False)

    # Review text
    comment = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    booking = relationship("Booking", back_populates="review")
