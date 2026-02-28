"""
Admin dashboard schemas for request/response validation
"""

from datetime import datetime
from typing import List, Optional
import re

from pydantic import BaseModel, EmailStr, Field, field_validator

from ..models.booking import BookingStatus
from ..models.user import UserRole, UserStatus


def validate_phone_number(phone: Optional[str]) -> Optional[str]:
    """Validate and format phone number to international format"""
    if phone is None or phone == "":
        return None
    
    # Remove spaces, dashes, parentheses
    cleaned = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    # Auto-format to international format
    if cleaned.startswith("0"):
        # Local South African format (0611154598 → +27611154598)
        cleaned = "+27" + cleaned[1:]
    elif cleaned.startswith("27") and not cleaned.startswith("+"):
        # International without + (27611154598 → +27611154598)
        cleaned = "+" + cleaned
    elif not cleaned.startswith("+"):
        # No country code, assume SA (+)
        cleaned = "+" + cleaned
    
    # Validate format after conversion
    if not re.match(r'^\+\d{10,15}$', cleaned):
        raise ValueError(
            f"Phone number must be in international format with country code "
            f"(e.g., +27123456789 or +14155238886). Must have 10-15 digits after the + sign. "
            f"Got: '{phone}' (cleaned to: '{cleaned}')"
        )
    
    return cleaned


# ==================== Admin Management Schemas ====================


class AdminCreateRequest(BaseModel):
    """Schema for creating a new admin user"""

    email: str
    phone: str
    password: str = Field(..., min_length=12)
    first_name: str
    last_name: str
    id_number: str = Field(..., min_length=13, max_length=13)
    address: Optional[str] = None
    address_latitude: Optional[float] = -33.9249  # Default: Cape Town
    address_longitude: Optional[float] = 18.4241
    smtp_email: Optional[str] = None  # Gmail address for sending verification emails

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        errors = []
        if len(v) < 12:
            errors.append("at least 12 characters")
        if not re.search(r"[A-Z]", v):
            errors.append("an uppercase letter")
        if not re.search(r"[a-z]", v):
            errors.append("a lowercase letter")
        if not re.search(r"\d", v):
            errors.append("a digit")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]", v):
            errors.append("a special character (!@#$%^&* …)")
        if errors:
            raise ValueError("Password must contain: " + ", ".join(errors) + ".")
        return v
    smtp_password: Optional[str] = None  # Gmail app password
    verification_link_validity_minutes: Optional[int] = 30  # Default 30 minutes
    twilio_sender_phone_number: Optional[str] = None  # Twilio sender number (FROM in messages) - e.g., +14155238886
    twilio_phone_number: Optional[str] = None  # Admin's phone number for receiving test messages (TO in test messages)
    twilio_account_sid: Optional[str] = None  # Twilio Account SID (written to .env)
    twilio_auth_token: Optional[str] = None   # Twilio Auth Token (written to .env)

    @field_validator('phone', 'twilio_sender_phone_number', 'twilio_phone_number')
    @classmethod
    def validate_phones(cls, v):
        return validate_phone_number(v)


class VerificationSentInfo(BaseModel):
    """Verification send status"""

    email_sent: bool
    whatsapp_sent: bool
    expires_in_minutes: int


class AdminCreateResponse(BaseModel):
    """Response for admin creation with verification info"""

    message: str
    user_id: int
    verification_sent: VerificationSentInfo
    note: str


class AdminSettingsUpdate(BaseModel):
    """Schema for updating admin settings"""

    smtp_email: Optional[EmailStr] = None
    smtp_password: Optional[str] = None
    verification_link_validity_minutes: Optional[int] = Field(
        default=30, ge=15, le=120
    )
    twilio_sender_phone_number: Optional[str] = None  # Twilio sender number (FROM in messages)
    twilio_phone_number: Optional[str] = None  # Admin's phone number for test messages (TO)
    twilio_account_sid: Optional[str] = None  # Twilio Account SID (will be encrypted in DB)
    twilio_auth_token: Optional[str] = None   # Twilio Auth Token (will be encrypted in DB)
    backup_interval_minutes: Optional[int] = Field(
        default=10, ge=5, le=60
    )
    retention_days: Optional[int] = Field(
        default=30, ge=7, le=365
    )
    auto_archive_after_days: Optional[int] = Field(
        default=14, ge=1, le=180
    )
    inactivity_timeout_minutes: Optional[int] = Field(
        default=15, ge=1, le=120
    )  # Auto-logout timeout (1-120 minutes)

    @field_validator('twilio_sender_phone_number', 'twilio_phone_number')
    @classmethod
    def validate_twilio_phones(cls, v):
        return validate_phone_number(v)


# ==================== Statistics Schemas ====================


class AdminStats(BaseModel):
    """Overall system statistics"""

    total_users: int
    active_users: int
    total_instructors: int
    total_students: int
    verified_instructors: int
    pending_verification: int
    total_bookings: int
    pending_bookings: int
    completed_bookings: int
    cancelled_bookings: int
    total_revenue: float
    avg_booking_value: float


# ==================== Instructor Verification Schemas ====================


class InstructorVerificationRequest(BaseModel):
    """Schema for verifying/rejecting an instructor"""

    is_verified: bool
    deactivate_account: bool = False  # If rejecting, optionally deactivate account


class InstructorVerificationResponse(BaseModel):
    """Schema for instructor verification response"""

    id: int
    user_id: int
    email: str
    phone: str
    full_name: str
    license_number: str
    license_types: str
    id_number: str
    vehicle_registration: str
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== User Management Schemas ====================


class UserManagementResponse(BaseModel):
    """Schema for user management list"""

    id: int
    email: str
    phone: str
    first_name: str
    last_name: str
    full_name: str
    role: UserRole
    status: UserStatus
    id_number: Optional[str] = None
    address: Optional[str] = None
    booking_fee: Optional[float] = None  # Only for instructors
    available_credit: Optional[float] = None  # Only for students
    pending_credit: Optional[float] = None  # Only for students
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== Booking Oversight Schemas ====================


class BookingOverview(BaseModel):
    """Schema for booking overview in admin dashboard"""

    id: int
    booking_reference: str
    student_id: int
    student_name: str
    student_id_number: str
    student_phone: Optional[str] = None
    instructor_id: int
    instructor_name: str
    instructor_id_number: str
    lesson_date: datetime
    duration_minutes: int
    lesson_type: str
    pickup_address: str
    dropoff_address: Optional[str] = None
    status: BookingStatus
    amount: float
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Revenue & Analytics Schemas ====================


class TopInstructor(BaseModel):
    """Schema for top earning instructor"""

    instructor_id: int
    name: str
    total_earnings: float
    booking_count: int


class RevenueStats(BaseModel):
    """Schema for revenue statistics"""

    total_revenue: float
    pending_revenue: float
    completed_bookings: int
    avg_booking_value: float
    top_instructors: List[dict]  # List of top earning instructors
