"""
Admin dashboard schemas for request/response validation
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from ..models.booking import BookingStatus
from ..models.user import UserRole, UserStatus

# ==================== Admin Management Schemas ====================


class AdminCreateRequest(BaseModel):
    """Schema for creating a new admin user"""

    email: str
    phone: str
    password: str = Field(..., min_length=6)
    first_name: str
    last_name: str


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
    full_name: str
    role: UserRole
    status: UserStatus
    id_number: Optional[str] = None
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
