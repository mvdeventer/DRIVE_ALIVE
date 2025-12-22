"""
Availability models for instructor scheduling
"""

import enum
from datetime import datetime, time

from sqlalchemy import Boolean, Column, Date, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class DayOfWeek(str, enum.Enum):
    """Day of week enumeration"""

    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class InstructorSchedule(Base):
    """Weekly recurring availability schedule for instructors"""

    __tablename__ = "instructor_schedules"

    id = Column(Integer, primary_key=True, index=True)
    instructor_id = Column(Integer, ForeignKey("instructors.id"), nullable=False)

    # Day of week
    day_of_week = Column(SQLEnum(DayOfWeek), nullable=False)

    # Time slots
    start_time = Column(Time, nullable=False)  # e.g., 08:00
    end_time = Column(Time, nullable=False)  # e.g., 17:00

    # Active status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    instructor = relationship("Instructor", back_populates="schedules")


class TimeOffException(Base):
    """Specific dates when instructor is unavailable (holidays, sick days, etc.)"""

    __tablename__ = "time_off_exceptions"

    id = Column(Integer, primary_key=True, index=True)
    instructor_id = Column(Integer, ForeignKey("instructors.id"), nullable=False)

    # Date range
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    # Optional time specification (for partial day off)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)

    # Reason
    reason = Column(String, nullable=True)  # "holiday", "sick", "personal", etc.
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    instructor = relationship("Instructor", back_populates="time_off_exceptions")


class CustomAvailability(Base):
    """Specific date/time when instructor is available (overrides regular schedule)"""

    __tablename__ = "custom_availability"

    id = Column(Integer, primary_key=True, index=True)
    instructor_id = Column(Integer, ForeignKey("instructors.id"), nullable=False)

    # Specific date
    date = Column(Date, nullable=False)

    # Time slots
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Active status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    instructor = relationship("Instructor", back_populates="custom_availability")
