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
    phone = Column(String, index=True, nullable=False)  # Not unique - allows multi-role users
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    id_number = Column(String, nullable=True)  # South African ID number (nullable for legacy users)
    role = Column(SQLEnum(UserRole), nullable=False)
    status = Column(SQLEnum(UserStatus), default=UserStatus.ACTIVE)
    firebase_uid = Column(String, unique=True, nullable=True, index=True)

    # Address fields (optional for all users)
    address = Column(String, nullable=True)
    address_latitude = Column(Float, nullable=True)
    address_longitude = Column(Float, nullable=True)

    # Email configuration (for admin only - used to send verification emails)
    smtp_email = Column(String, nullable=True)  # Gmail address
    smtp_password = Column(String, nullable=True)  # Gmail app password
    verification_link_validity_minutes = Column(Integer, default=30)  # Default 30 minutes

    # Backup configuration (for admin only)
    backup_interval_minutes = Column(Integer, default=10)  # Backup every 10 minutes

    # Session configuration (for admin only - global setting)
    inactivity_timeout_minutes = Column(Integer, default=15)  # Auto-logout after 15 minutes idle
    retention_days = Column(Integer, default=30)  # Keep uncompressed backups for 30 days
    auto_archive_after_days = Column(Integer, default=14)  # Archive to ZIP after 14 days

    # Twilio WhatsApp configuration (for admin only)
    twilio_account_sid = Column(String, nullable=True)   # Encrypted Twilio Account SID
    twilio_auth_token = Column(String, nullable=True)    # Encrypted Twilio Auth Token
    twilio_sender_phone_number = Column(String, nullable=True)  # Twilio sender number (e.g., +14155238886) - used as FROM in all messages
    twilio_phone_number = Column(String, nullable=True)  # Admin's Twilio phone number for receiving test messages

    # Single-session enforcement: stores the active JWT session token ID (jti)
    # If set, only the JWT with this jti is valid. Cleared on logout.
    active_session_token = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    instructor_profile = relationship(
        "Instructor", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    password_reset_tokens = relationship(
        "PasswordResetToken", back_populates="user", cascade="all, delete-orphan"
    )
    verification_tokens = relationship(
        "VerificationToken", back_populates="user", cascade="all, delete-orphan"
    )

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
    license_types = Column(
        String, nullable=False
    )  # Comma-separated license codes (e.g., "CODE8,CODE10")
    id_number = Column(String, nullable=False)  # South African ID - not unique to allow multi-role
    vehicle_registration = Column(String, nullable=False)
    vehicle_make = Column(String, nullable=False)
    vehicle_model = Column(String, nullable=False)
    vehicle_year = Column(Integer, nullable=False)

    # Location
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    province = Column(String, nullable=True)  # Operating province
    city = Column(String, nullable=True)  # Operating city (GPS-captured)
    suburb = Column(String, nullable=True)  # Operating suburb
    service_radius_km = Column(Float, default=20.0)
    max_travel_distance_km = Column(
        Float, default=50.0
    )  # Maximum distance willing to travel
    rate_per_km_beyond_radius = Column(
        Float, default=5.0
    )  # Extra charge per km outside service radius

    # Availability
    is_available = Column(Boolean, default=True)
    hourly_rate = Column(Float, nullable=False)  # In ZAR
    booking_fee = Column(
        Float, default=20.0
    )  # Per-instructor booking fee in ZAR (admin configurable)

    # Rating
    rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)

    # Bio
    bio = Column(Text, nullable=True)

    # Verification
    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Initial setup token (one-time UUID issued at registration for pre-auth schedule setup)
    setup_token = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="instructor_profile")
    bookings = relationship("Booking", back_populates="instructor")
    schedules = relationship(
        "InstructorSchedule", back_populates="instructor", cascade="all, delete-orphan"
    )
    time_off_exceptions = relationship(
        "TimeOffException", back_populates="instructor", cascade="all, delete-orphan"
    )
    custom_availability = relationship(
        "CustomAvailability", back_populates="instructor", cascade="all, delete-orphan"
    )
    verification_tokens = relationship(
        "InstructorVerificationToken", back_populates="instructor", cascade="all, delete-orphan"
    )


class Student(Base):
    """Student profile model"""

    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Student details
    id_number = Column(String, nullable=False)  # South African ID - not unique to allow multi-role
    learners_permit_number = Column(String, nullable=True)

    # Emergency contact
    emergency_contact_name = Column(String, nullable=False)
    emergency_contact_phone = Column(String, nullable=False)

    # Address
    address_line1 = Column(String, nullable=False)
    address_line2 = Column(String, nullable=True)
    province = Column(String, nullable=True)  # GPS-captured
    city = Column(String, nullable=True)  # GPS-captured
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
