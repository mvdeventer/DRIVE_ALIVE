"""
User models for authentication and profiles
"""

import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class UserRole(str, enum.Enum):
    """User role enumeration"""

    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"


class UserStatus(str, enum.Enum):
    """User status enumeration"""

    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class User(Base):
    """Base user model"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    status = Column(SQLEnum(UserStatus), default=UserStatus.ACTIVE)
    firebase_uid = Column(String, unique=True, nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    instructor_profile = relationship("Instructor", back_populates="user", uselist=False)
    student_profile = relationship("Student", back_populates="user", uselist=False)

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class Instructor(Base):
    """Instructor profile model"""

    __tablename__ = "instructors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Instructor details
    license_number = Column(String, unique=True, nullable=False)
    license_types = Column(String, nullable=False)  # Comma-separated license codes (e.g., "CODE8,CODE10")
    id_number = Column(String, unique=True, nullable=False)  # South African ID
    vehicle_registration = Column(String, nullable=False)
    vehicle_make = Column(String, nullable=False)
    vehicle_model = Column(String, nullable=False)
    vehicle_year = Column(Integer, nullable=False)

    # Location
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    province = Column(String, nullable=True)  # Operating province
    city = Column(String, nullable=False)  # Operating city
    suburb = Column(String, nullable=True)  # Operating suburb
    service_radius_km = Column(Float, default=20.0)
    max_travel_distance_km = Column(Float, default=50.0)  # Maximum distance willing to travel
    rate_per_km_beyond_radius = Column(Float, default=5.0)  # Extra charge per km outside service radius

    # Availability
    is_available = Column(Boolean, default=True)
    hourly_rate = Column(Float, nullable=False)  # In ZAR

    # Rating
    rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)

    # Bio
    bio = Column(Text, nullable=True)

    # Verification
    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="instructor_profile")
    bookings = relationship("Booking", back_populates="instructor")


class Student(Base):
    """Student profile model"""

    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Student details
    id_number = Column(String, unique=True, nullable=False)  # South African ID
    learners_permit_number = Column(String, nullable=True)

    # Emergency contact
    emergency_contact_name = Column(String, nullable=False)
    emergency_contact_phone = Column(String, nullable=False)

    # Address
    address_line1 = Column(String, nullable=False)
    address_line2 = Column(String, nullable=True)
    province = Column(String, nullable=False)
    city = Column(String, nullable=False)
    suburb = Column(String, nullable=True)
    postal_code = Column(String, nullable=False)

    # Default pickup location
    default_pickup_latitude = Column(Float, nullable=True)
    default_pickup_longitude = Column(Float, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="student_profile")
    bookings = relationship("Booking", back_populates="student")
