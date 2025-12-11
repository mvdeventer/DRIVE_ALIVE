"""
Pydantic schemas for booking requests and responses
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from ..models.booking import BookingStatus, PaymentStatus


class BookingBase(BaseModel):
    """Base booking schema"""
    lesson_date: datetime
    duration_minutes: int = Field(60, ge=30, le=180)
    lesson_type: str
    pickup_latitude: float = Field(..., ge=-90, le=90)
    pickup_longitude: float = Field(..., ge=-180, le=180)
    pickup_address: str
    dropoff_latitude: Optional[float] = Field(None, ge=-90, le=90)
    dropoff_longitude: Optional[float] = Field(None, ge=-180, le=180)
    dropoff_address: Optional[str] = None
    student_notes: Optional[str] = None


class BookingCreate(BookingBase):
    """Booking creation schema"""
    instructor_id: int


class BookingUpdate(BaseModel):
    """Booking update schema"""
    lesson_date: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=30, le=180)
    pickup_latitude: Optional[float] = Field(None, ge=-90, le=90)
    pickup_longitude: Optional[float] = Field(None, ge=-180, le=180)
    pickup_address: Optional[str] = None
    student_notes: Optional[str] = None


class BookingCancel(BaseModel):
    """Booking cancellation schema"""
    cancellation_reason: str


class BookingResponse(BookingBase):
    """Booking response schema"""
    id: int
    booking_reference: str
    student_id: int
    instructor_id: int
    status: BookingStatus
    amount: float
    payment_status: PaymentStatus
    created_at: datetime
    
    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    """Review creation schema"""
    booking_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    """Review response schema"""
    id: int
    booking_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
