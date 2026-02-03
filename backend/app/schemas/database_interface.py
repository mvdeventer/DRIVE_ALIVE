"""
Database Interface Schemas - Pydantic models for API validation
Standards: OpenAPI 3.0, JSON:API response structure, RFC 7807 error format
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============================================================================
# RFC 7807 PROBLEM DETAILS
# ============================================================================

class ProblemDetails(BaseModel):
    """RFC 7807 Problem Details for HTTP APIs"""
    type: str = Field(..., description="URI reference identifying the problem type")
    title: str = Field(..., description="Short, human-readable summary")
    status: int = Field(..., description="HTTP status code")
    detail: str = Field(..., description="Human-readable explanation")
    instance: str = Field(..., description="URI reference identifying specific occurrence")


# ============================================================================
# PAGINATION & METADATA
# ============================================================================

class PaginationMeta(BaseModel):
    """Pagination metadata following JSON:API spec"""
    total: int = Field(..., description="Total number of records")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Records per page")
    total_pages: int = Field(..., description="Total number of pages")


class PaginationLinks(BaseModel):
    """RFC 5988 Link header structure"""
    self: str
    first: str
    last: str
    prev: Optional[str] = None
    next: Optional[str] = None


class TableListResponse(BaseModel):
    """Generic table list response (JSON:API format)"""
    data: List[Dict[str, Any]]
    meta: PaginationMeta
    links: PaginationLinks


class BulkUpdateRequest(BaseModel):
    """Bulk update request schema"""
    table: str = Field(..., description="Table name (users, instructors, students, bookings)")
    ids: List[int] = Field(..., description="List of record IDs to update")
    field: str = Field(..., description="Field name to update (e.g., status, is_verified)")
    value: Any = Field(..., description="New value for the field")

    @validator('table')
    def validate_table(cls, v):
        allowed = ['users', 'instructors', 'students', 'bookings']
        if v not in allowed:
            raise ValueError(f"Table must be one of: {', '.join(allowed)}")
        return v


class BulkUpdateResponse(BaseModel):
    """Bulk update response schema"""
    updated_count: int = Field(..., description="Number of records updated")
    failed_ids: List[int] = Field(default_factory=list, description="IDs that failed to update")
    message: str = Field(..., description="Success message")


# ============================================================================
# USER SCHEMAS
# ============================================================================

class UserTableResponse(BaseModel):
    """User table row (excludes password fields)"""
    id: int
    email: str
    phone: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    id_number: Optional[str]
    role: Optional[str]
    status: Optional[str]
    address: Optional[str]
    city: Optional[str]
    suburb: Optional[str]
    province: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]


class UserDetailResponse(BaseModel):
    """Single user detail with ETag"""
    data: Dict[str, Any]
    meta: Dict[str, str]  # Contains etag, last_modified


class UserUpdateRequest(BaseModel):
    """Update user request (excludes password_hash, smtp_password)"""
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r'^\+?[0-9]{10,15}$')
    first_name: Optional[str] = Field(None, min_length=2, max_length=100)
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)
    id_number: Optional[str] = Field(None, pattern=r'^[0-9]{13}$')
    role: Optional[str] = Field(None, pattern=r'^(STUDENT|INSTRUCTOR|ADMIN)$')
    status: Optional[str] = Field(None, pattern=r'^(ACTIVE|INACTIVE|SUSPENDED)$')
    address: Optional[str] = None
    city: Optional[str] = None
    suburb: Optional[str] = None
    province: Optional[str] = None
    pickup_latitude: Optional[float] = Field(None, ge=-90, le=90)
    pickup_longitude: Optional[float] = Field(None, ge=-180, le=180)
    smtp_email: Optional[EmailStr] = None
    verification_link_validity_minutes: Optional[int] = Field(None, ge=15, le=120)
    twilio_sender_phone_number: Optional[str] = None


# ============================================================================
# INSTRUCTOR SCHEMAS
# ============================================================================

class InstructorTableResponse(BaseModel):
    """Instructor table row"""
    id: int
    user_id: int
    instructor_name: str
    license_number: Optional[str]
    vehicle_make: Optional[str]
    vehicle_model: Optional[str]
    vehicle_year: Optional[int]
    is_verified: bool
    hourly_rate: Optional[float]
    average_rating: Optional[float]
    created_at: Optional[str]


class InstructorDetailResponse(BaseModel):
    """Single instructor detail with ETag"""
    data: Dict[str, Any]
    meta: Dict[str, str]


class InstructorUpdateRequest(BaseModel):
    """Update instructor request"""
    license_number: Optional[str] = Field(None, min_length=5, max_length=50)
    vehicle_make: Optional[str] = Field(None, max_length=50)
    vehicle_model: Optional[str] = Field(None, max_length=50)
    vehicle_year: Optional[int] = Field(None, ge=1900, le=2100)
    vehicle_registration: Optional[str] = None
    is_verified: Optional[bool] = None
    hourly_rate: Optional[float] = Field(None, ge=0)
    bio: Optional[str] = None
    service_radius_km: Optional[int] = Field(None, ge=0, le=500)


# ============================================================================
# STUDENT SCHEMAS
# ============================================================================

class StudentTableResponse(BaseModel):
    """Student table row"""
    id: int
    user_id: int
    student_name: str
    email: str
    phone: Optional[str]
    city: Optional[str]
    suburb: Optional[str]
    created_at: Optional[str]


class StudentDetailResponse(BaseModel):
    """Single student detail with ETag"""
    data: Dict[str, Any]
    meta: Dict[str, str]


class StudentUpdateRequest(BaseModel):
    """Update student request"""
    # Most student fields come from User table
    # This is a placeholder for student-specific fields
    pass


# ============================================================================
# BOOKING SCHEMAS
# ============================================================================

class BookingTableResponse(BaseModel):
    """Booking table row"""
    id: int
    booking_reference: str
    student_id: int
    instructor_id: int
    lesson_date: Optional[str]
    duration_minutes: Optional[int]
    status: Optional[str]
    payment_status: Optional[str]
    amount: Optional[float]
    pickup_address: Optional[str]
    created_at: Optional[str]


class BookingDetailResponse(BaseModel):
    """Single booking detail with ETag"""
    data: Dict[str, Any]
    meta: Dict[str, str]


class BookingUpdateRequest(BaseModel):
    """Update booking request"""
    status: Optional[str] = Field(None, pattern=r'^(PENDING|CONFIRMED|IN_PROGRESS|COMPLETED|CANCELLED|NO_SHOW)$')
    payment_status: Optional[str] = Field(None, pattern=r'^(PENDING|PAID|REFUNDED|FAILED)$')
    instructor_notes: Optional[str] = None
    student_notes: Optional[str] = None
    cancellation_reason: Optional[str] = None


# ============================================================================
# REVIEW SCHEMAS
# ============================================================================

class ReviewTableResponse(BaseModel):
    """Review table row"""
    id: int
    booking_id: int
    rating: int
    comment: Optional[str]
    created_at: Optional[str]


# ============================================================================
# SCHEDULE SCHEMAS
# ============================================================================

class ScheduleTableResponse(BaseModel):
    """Instructor schedule table row"""
    id: int
    instructor_id: int
    day_of_week: str
    start_time: str
    end_time: str
    is_available: bool
