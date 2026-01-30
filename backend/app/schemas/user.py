"""
Pydantic schemas for request/response validation
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from ..models.user import UserRole, UserStatus

# ==================== Auth Schemas ====================


class Token(BaseModel):
    """Token response schema"""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token data schema"""

    user_id: Optional[int] = None
    email: Optional[str] = None


# ==================== User Schemas ====================


class UserBase(BaseModel):
    """Base user schema"""

    email: str  # Changed from EmailStr to allow .test TLD for testing
    phone: str
    first_name: str
    last_name: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Validate phone number is in South African format (+27 followed by 9 digits)"""
        # Remove any whitespace
        v = v.strip()

        # Check if it starts with +27
        if not v.startswith("+27"):
            raise ValueError(
                "Phone number must start with +27 (South African country code)"
            )

        # Check total length (should be +27 + 9 digits = 12 characters)
        if len(v) != 12:
            if len(v) < 12:
                raise ValueError(
                    f"Phone number is too short (must be +27 followed by 9 digits, got {len(v)} characters)"
                )
            else:
                raise ValueError(
                    f"Phone number is too long (must be +27 followed by 9 digits, got {len(v)} characters)"
                )

        # Check if the part after +27 is all digits
        phone_digits = v[3:]  # Skip '+27'
        if not phone_digits.isdigit():
            raise ValueError("Phone number must contain only digits after +27")

        return v


class UserCreate(UserBase):
    """User creation schema"""

    password: str
    role: UserRole


class UserLogin(BaseModel):
    """User login schema"""

    email: str
    password: str


class UserUpdate(BaseModel):
    """User profile update schema"""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    id_number: Optional[str] = None
    address: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Validate phone number is in South African format (+27 followed by 9 digits)"""
        if v is None:
            return v

        # Remove any whitespace
        v = v.strip()

        # Check if it starts with +27
        if not v.startswith("+27"):
            raise ValueError(
                "Phone number must start with +27 (South African country code)"
            )

        # Check total length (should be +27 + 9 digits = 12 characters)
        if len(v) != 12:
            if len(v) < 12:
                raise ValueError(
                    f"Phone number is too short (must be +27 followed by 9 digits, got {len(v)} characters)"
                )
            else:
                raise ValueError(
                    f"Phone number is too long (must be +27 followed by 9 digits, got {len(v)} characters)"
                )

        # Check if the part after +27 is all digits
        phone_digits = v[3:]  # Skip '+27'
        if not phone_digits.isdigit():
            raise ValueError("Phone number must contain only digits after +27")

        return v


class ChangePasswordRequest(BaseModel):
    """Password change request schema"""

    current_password: str
    new_password: str = Field(..., min_length=6)


class ForgotPasswordRequest(BaseModel):
    """Forgot password request schema"""

    email: str


class ResetPasswordRequest(BaseModel):
    """Reset password request schema"""

    token: str
    new_password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    """User response schema - no validation on output"""

    id: int
    email: str
    phone: str
    first_name: str
    last_name: str
    role: UserRole
    status: UserStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Instructor Schemas ====================


class InstructorBase(BaseModel):
    """Base instructor schema"""

    license_number: str
    license_types: str  # Comma-separated license codes (e.g., "CODE8,CODE10")
    id_number: str
    vehicle_registration: str
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    province: Optional[str] = None
    city: str  # Operating city
    suburb: Optional[str] = None
    hourly_rate: float
    service_radius_km: float = 20.0
    max_travel_distance_km: float = 50.0
    rate_per_km_beyond_radius: float = 5.0
    bio: Optional[str] = None

    @field_validator("id_number")
    @classmethod
    def validate_id_number(cls, v: str) -> str:
        """Validate ID number is exactly 13 digits"""
        # Remove any whitespace
        v = v.strip()

        # Check if it's all digits
        if not v.isdigit():
            raise ValueError("ID number must contain only numbers")

        # Check length
        if len(v) < 13:
            raise ValueError(
                f"ID number is too short (must be 13 digits, got {len(v)})"
            )
        elif len(v) > 13:
            raise ValueError(f"ID number is too long (must be 13 digits, got {len(v)})")

        return v


class InstructorCreate(UserCreate, InstructorBase):
    """Instructor creation schema"""

    role: UserRole = UserRole.INSTRUCTOR


class InstructorUpdate(BaseModel):
    """Instructor update schema"""

    license_number: Optional[str] = None
    license_types: Optional[str] = None
    id_number: Optional[str] = None
    vehicle_registration: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    province: Optional[str] = None
    city: Optional[str] = None
    suburb: Optional[str] = None
    hourly_rate: Optional[float] = None
    booking_fee: Optional[float] = (
        None  # Allow updating booking fee (admin-only in practice)
    )
    service_radius_km: Optional[float] = None
    max_travel_distance_km: Optional[float] = None
    rate_per_km_beyond_radius: Optional[float] = None
    bio: Optional[str] = None
    is_available: Optional[bool] = None


class InstructorLocation(BaseModel):
    """Instructor location update schema"""

    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class InstructorResponse(UserResponse):
    """Instructor response schema"""

    instructor_id: int
    id_number: str
    license_number: str
    license_types: str
    vehicle_registration: str
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    province: Optional[str] = None
    city: str
    suburb: Optional[str] = None
    is_available: bool
    hourly_rate: float
    booking_fee: Optional[float] = 20.0  # Per-instructor booking fee in ZAR
    service_radius_km: Optional[float] = 20.0
    max_travel_distance_km: Optional[float] = 50.0
    rate_per_km_beyond_radius: Optional[float] = 5.0
    bio: Optional[str] = None
    rating: float
    total_reviews: int
    is_verified: bool
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None

    class Config:
        from_attributes = True


# ==================== Student Schemas ====================


class StudentBase(BaseModel):
    """Base student schema"""

    id_number: str
    learners_permit_number: Optional[str] = None
    emergency_contact_name: str
    emergency_contact_phone: str
    address_line1: str
    address_line2: Optional[str] = None
    province: str
    city: str
    suburb: Optional[str] = None
    postal_code: str

    @field_validator("id_number")
    @classmethod
    def validate_id_number(cls, v: str) -> str:
        """Validate ID number is exactly 13 digits"""
        # Remove any whitespace
        v = v.strip()

        # Check if it's all digits
        if not v.isdigit():
            raise ValueError("ID number must contain only numbers")

        # Check length
        if len(v) < 13:
            raise ValueError(
                f"ID number is too short (must be 13 digits, got {len(v)})"
            )
        elif len(v) > 13:
            raise ValueError(f"ID number is too long (must be 13 digits, got {len(v)})")

        return v

    @field_validator("emergency_contact_phone")
    @classmethod
    def validate_emergency_phone(cls, v: str) -> str:
        """Validate emergency contact phone number is in South African format (+27 followed by 9 digits)"""
        # Remove any whitespace
        v = v.strip()

        # Check if it starts with +27
        if not v.startswith("+27"):
            raise ValueError(
                "Emergency contact phone must start with +27 (South African country code)"
            )

        # Check total length (should be +27 + 9 digits = 12 characters)
        if len(v) != 12:
            if len(v) < 12:
                raise ValueError(
                    f"Emergency contact phone is too short (must be +27 followed by 9 digits, got {len(v)} characters)"
                )
            else:
                raise ValueError(
                    f"Emergency contact phone is too long (must be +27 followed by 9 digits, got {len(v)} characters)"
                )

        # Check if the part after +27 is all digits
        phone_digits = v[3:]  # Skip '+27'
        if not phone_digits.isdigit():
            raise ValueError(
                "Emergency contact phone must contain only digits after +27"
            )

        return v


class StudentCreate(UserCreate, StudentBase):
    """Student creation schema"""

    role: UserRole = UserRole.STUDENT


class StudentUpdate(BaseModel):
    """Student update schema"""

    id_number: Optional[str] = None
    learners_permit_number: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    suburb: Optional[str] = None
    postal_code: Optional[str] = None


class StudentResponse(UserResponse):
    """Student response schema"""

    student_id: int
    id_number: str
    learners_permit_number: Optional[str] = None
    emergency_contact_name: str
    emergency_contact_phone: str
    address_line1: str
    address_line2: Optional[str] = None
    province: str
    city: str
    suburb: Optional[str] = None
    postal_code: str

    class Config:
        from_attributes = True
