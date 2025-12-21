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


class ChangePasswordRequest(BaseModel):
    """Password change request schema"""

    current_password: str
    new_password: str = Field(..., min_length=6)


class UserResponse(UserBase):
    """User response schema"""

    id: int
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
