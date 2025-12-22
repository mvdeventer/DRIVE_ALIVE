"""
Pydantic schemas for availability management
"""

from datetime import date, time
from typing import List, Optional

from pydantic import BaseModel, field_validator

from ..models.availability import DayOfWeek

# ==================== Schedule Schemas ====================


class InstructorScheduleBase(BaseModel):
    """Base schedule schema"""

    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    is_active: bool = True

    @field_validator("end_time")
    @classmethod
    def validate_end_time(cls, v, info):
        if "start_time" in info.data and v <= info.data["start_time"]:
            raise ValueError("end_time must be after start_time")
        return v


class InstructorScheduleCreate(InstructorScheduleBase):
    """Schedule creation schema"""

    pass


class InstructorScheduleUpdate(BaseModel):
    """Schedule update schema"""

    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_active: Optional[bool] = None


class InstructorScheduleResponse(InstructorScheduleBase):
    """Schedule response schema"""

    id: int
    instructor_id: int

    class Config:
        from_attributes = True


# ==================== Time Off Schemas ====================


class TimeOffExceptionBase(BaseModel):
    """Base time off schema"""

    start_date: date
    end_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    reason: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v, info):
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("end_date must be on or after start_date")
        return v


class TimeOffExceptionCreate(TimeOffExceptionBase):
    """Time off creation schema"""

    pass


class TimeOffExceptionResponse(TimeOffExceptionBase):
    """Time off response schema"""

    id: int
    instructor_id: int

    class Config:
        from_attributes = True


# ==================== Custom Availability Schemas ====================


class CustomAvailabilityBase(BaseModel):
    """Base custom availability schema"""

    date: date
    start_time: time
    end_time: time
    is_active: bool = True

    @field_validator("end_time")
    @classmethod
    def validate_end_time(cls, v, info):
        if "start_time" in info.data and v <= info.data["start_time"]:
            raise ValueError("end_time must be after start_time")
        return v


class CustomAvailabilityCreate(CustomAvailabilityBase):
    """Custom availability creation schema"""

    pass


class CustomAvailabilityResponse(CustomAvailabilityBase):
    """Custom availability response schema"""

    id: int
    instructor_id: int

    class Config:
        from_attributes = True


# ==================== Bulk Schedule Schemas ====================


class BulkScheduleCreate(BaseModel):
    """Bulk schedule creation schema - for setting up entire week"""

    schedules: List[InstructorScheduleCreate]


class AvailabilityOverview(BaseModel):
    """Complete availability overview for an instructor"""

    schedules: List[InstructorScheduleResponse]
    time_off: List[TimeOffExceptionResponse]
    custom_availability: List[CustomAvailabilityResponse]


# ==================== Available Time Slot Schemas ====================


class TimeSlot(BaseModel):
    """Available time slot schema"""

    start_time: str  # ISO format datetime string
    end_time: str  # ISO format datetime string
    duration_minutes: int
    is_booked: bool = False  # Whether this slot is already booked by another student


class AvailableSlotsRequest(BaseModel):
    """Request schema for getting available slots"""

    instructor_id: int
    start_date: date
    end_date: date
    duration_minutes: int = 60  # Default lesson duration


class AvailableSlotsResponse(BaseModel):
    """Response schema for available slots"""

    instructor_id: int
    date: date
    slots: List[TimeSlot]


class AvailableSlotsByDateResponse(BaseModel):
    """Response schema for available slots grouped by date"""

    instructor_id: int
    availability: List[AvailableSlotsResponse]
