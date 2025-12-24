"""
Availability routes for instructor scheduling
"""

from datetime import date, datetime, time, timedelta
from typing import Annotated, List

import pytz
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.availability import CustomAvailability, DayOfWeek, InstructorSchedule, TimeOffException
from ..models.booking import Booking, BookingStatus
from ..models.user import Instructor, User, UserRole
from ..routes.auth import get_current_user
from ..schemas.availability import (
    AvailabilityOverview,
    AvailableSlotsByDateResponse,
    AvailableSlotsRequest,
    AvailableSlotsResponse,
    BulkScheduleCreate,
    CustomAvailabilityCreate,
    CustomAvailabilityResponse,
    InstructorScheduleCreate,
    InstructorScheduleResponse,
    InstructorScheduleUpdate,
    TimeOffExceptionCreate,
    TimeOffExceptionResponse,
    TimeSlot,
)

router = APIRouter(prefix="/availability", tags=["Availability"])


# ==================== Helper Functions ====================


def get_day_of_week_enum(date_obj: date) -> DayOfWeek:
    """Convert Python date to DayOfWeek enum"""
    days = [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
        DayOfWeek.SUNDAY,
    ]
    return days[date_obj.weekday()]


def is_time_slot_available(
    instructor_id: int,
    slot_start: datetime,
    slot_end: datetime,
    db: Session,
) -> bool:
    """Check if a specific time slot is available (not booked)"""
    # Get all active bookings for this instructor
    bookings = (
        db.query(Booking)
        .filter(
            Booking.instructor_id == instructor_id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
        .all()
    )

    print(f"DEBUG: Checking slot {slot_start} - {slot_end} for instructor {instructor_id}")
    print(f"DEBUG: Found {len(bookings)} active bookings")

    # SAST timezone for comparison
    sast_tz = pytz.timezone("Africa/Johannesburg")

    # Check each booking for conflicts
    for booking in bookings:
        booking_start = booking.lesson_date
        # Make booking datetime timezone-aware if it's naive
        if booking_start.tzinfo is None:
            booking_start = sast_tz.localize(booking_start)
        booking_end = booking_start + timedelta(minutes=booking.duration_minutes)

        print(f"DEBUG: Checking against booking {booking.id}: {booking_start} - {booking_end}")

        # Check if there's any overlap
        if not (booking_end <= slot_start or booking_start >= slot_end):
            print(f"DEBUG: CONFLICT FOUND! Slot overlaps with booking {booking.id}")
            return False  # Conflict found

    print(f"DEBUG: Slot is AVAILABLE")
    return True  # No conflicts


def get_available_slots_for_date(
    instructor_id: int,
    target_date: date,
    duration_minutes: int,
    db: Session,
) -> List[TimeSlot]:
    """Get available time slots for a specific date"""
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        return []

    slots = []
    day_of_week = get_day_of_week_enum(target_date)
    print(f"DEBUG: target_date={target_date}, weekday={target_date.weekday()}, day_of_week={day_of_week}")

    # Check if there's time off on this date
    time_off = (
        db.query(TimeOffException)
        .filter(
            TimeOffException.instructor_id == instructor_id,
            TimeOffException.start_date <= target_date,
            TimeOffException.end_date >= target_date,
        )
        .all()
    )

    # Get regular schedule for this day
    schedules = (
        db.query(InstructorSchedule)
        .filter(
            InstructorSchedule.instructor_id == instructor_id,
            InstructorSchedule.day_of_week == day_of_week,
            InstructorSchedule.is_active == True,
        )
        .all()
    )

    # Get custom availability for this specific date
    custom_avail = (
        db.query(CustomAvailability)
        .filter(
            CustomAvailability.instructor_id == instructor_id,
            CustomAvailability.date == target_date,
            CustomAvailability.is_active == True,
        )
        .all()
    )

    # Combine regular schedules and custom availability
    all_availability = []

    # Add regular schedules (if not on time off)
    for schedule in schedules:
        all_availability.append((schedule.start_time, schedule.end_time))

    # Add custom availability
    for custom in custom_avail:
        all_availability.append((custom.start_time, custom.end_time))

    # Generate slots with South Africa timezone
    sast_tz = pytz.timezone("Africa/Johannesburg")  # South Africa Standard Time (UTC+2)

    for start_time, end_time in all_availability:
        # Create naive datetime first, then localize to SAST
        current_time = sast_tz.localize(datetime.combine(target_date, start_time))
        end_datetime = sast_tz.localize(datetime.combine(target_date, end_time))

        while current_time + timedelta(minutes=duration_minutes) <= end_datetime:
            slot_end = current_time + timedelta(minutes=duration_minutes)

            # Check if this slot conflicts with time off
            is_blocked = False
            for time_off_entry in time_off:
                # If time off has specific times, check them
                if time_off_entry.start_time and time_off_entry.end_time:
                    time_off_start = sast_tz.localize(datetime.combine(target_date, time_off_entry.start_time))
                    time_off_end = sast_tz.localize(datetime.combine(target_date, time_off_entry.end_time))

                    if not (slot_end <= time_off_start or current_time >= time_off_end):
                        is_blocked = True
                        break
                else:
                    # Entire day is blocked
                    is_blocked = True
                    break

            # Check if slot is available (not booked)
            if not is_blocked and is_time_slot_available(instructor_id, current_time, slot_end, db):
                slots.append(
                    TimeSlot(
                        start_time=current_time.isoformat(),
                        end_time=slot_end.isoformat(),
                        duration_minutes=duration_minutes,
                    )
                )

            # Move to next slot with 15min buffer (60min lesson + 15min spacing)
            current_time += timedelta(minutes=duration_minutes + 15)

    return slots


def get_all_slots_with_booking_status(
    instructor_id: int,
    target_date: date,
    duration_minutes: int,
    db: Session,
) -> List[TimeSlot]:
    """Get ALL time slots for a specific date, including both available and booked slots"""
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        return []

    slots = []
    day_of_week = get_day_of_week_enum(target_date)

    # Check if there's time off on this date
    time_off = (
        db.query(TimeOffException)
        .filter(
            TimeOffException.instructor_id == instructor_id,
            TimeOffException.start_date <= target_date,
            TimeOffException.end_date >= target_date,
        )
        .all()
    )

    # Get regular schedule for this day
    schedules = (
        db.query(InstructorSchedule)
        .filter(
            InstructorSchedule.instructor_id == instructor_id,
            InstructorSchedule.day_of_week == day_of_week,
            InstructorSchedule.is_active == True,
        )
        .all()
    )

    # Get custom availability for this specific date
    custom_avail = (
        db.query(CustomAvailability)
        .filter(
            CustomAvailability.instructor_id == instructor_id,
            CustomAvailability.date == target_date,
            CustomAvailability.is_active == True,
        )
        .all()
    )

    # Combine regular schedules and custom availability
    all_availability = []

    # Add regular schedules
    for schedule in schedules:
        all_availability.append((schedule.start_time, schedule.end_time))

    # Add custom availability
    for custom in custom_avail:
        all_availability.append((custom.start_time, custom.end_time))

    # Generate slots with South Africa timezone
    sast_tz = pytz.timezone("Africa/Johannesburg")

    for start_time, end_time in all_availability:
        # Create naive datetime first, then localize to SAST
        current_time = sast_tz.localize(datetime.combine(target_date, start_time))
        end_datetime = sast_tz.localize(datetime.combine(target_date, end_time))

        while current_time + timedelta(minutes=duration_minutes) <= end_datetime:
            slot_end = current_time + timedelta(minutes=duration_minutes)

            # Check if this slot conflicts with time off
            is_blocked = False
            for time_off_entry in time_off:
                # If time off has specific times, check them
                if time_off_entry.start_time and time_off_entry.end_time:
                    time_off_start = sast_tz.localize(datetime.combine(target_date, time_off_entry.start_time))
                    time_off_end = sast_tz.localize(datetime.combine(target_date, time_off_entry.end_time))

                    if not (slot_end <= time_off_start or current_time >= time_off_end):
                        is_blocked = True
                        break
                else:
                    # Entire day is blocked
                    is_blocked = True
                    break

            # Only include slots that are not blocked by time off
            if not is_blocked:
                # Check if slot is booked
                is_booked = not is_time_slot_available(instructor_id, current_time, slot_end, db)

                # Debug logging
                if is_booked:
                    print(f"DEBUG: Slot {current_time.isoformat()} is BOOKED")

                slots.append(
                    TimeSlot(
                        start_time=current_time.isoformat(),
                        end_time=slot_end.isoformat(),
                        duration_minutes=duration_minutes,
                        is_booked=is_booked,
                    )
                )

            # Move to next slot with 15min buffer (60min lesson + 15min spacing)
            current_time += timedelta(minutes=duration_minutes + 15)

    return slots


# ==================== Schedule Routes ====================


@router.post("/schedule", response_model=InstructorScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    schedule_data: InstructorScheduleCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Create a new weekly schedule entry (instructors only)"""
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can create schedules")

    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    schedule = InstructorSchedule(instructor_id=instructor.id, **schedule_data.model_dump())

    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    return schedule


@router.post("/schedule/bulk", response_model=List[InstructorScheduleResponse])
async def create_bulk_schedule(
    bulk_data: BulkScheduleCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Create multiple schedule entries at once (instructors only)"""
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can create schedules")

    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    schedules = []
    for schedule_data in bulk_data.schedules:
        schedule = InstructorSchedule(instructor_id=instructor.id, **schedule_data.model_dump())
        db.add(schedule)
        schedules.append(schedule)

    db.commit()

    for schedule in schedules:
        db.refresh(schedule)

    return schedules


@router.get("/schedule", response_model=List[InstructorScheduleResponse])
async def get_my_schedule(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Get current user's weekly schedule (instructors only)"""
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can access schedules")

    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    schedules = db.query(InstructorSchedule).filter(InstructorSchedule.instructor_id == instructor.id).all()

    return schedules


@router.put("/schedule/{schedule_id}", response_model=InstructorScheduleResponse)
async def update_schedule(
    schedule_id: int,
    schedule_data: InstructorScheduleUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Update a schedule entry (instructors only)"""
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can update schedules")

    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    schedule = db.query(InstructorSchedule).filter(InstructorSchedule.id == schedule_id, InstructorSchedule.instructor_id == instructor.id).first()

    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    for field, value in schedule_data.model_dump(exclude_unset=True).items():
        setattr(schedule, field, value)

    db.commit()
    db.refresh(schedule)

    return schedule


@router.delete("/schedule/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Delete a schedule entry (instructors only)"""
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can delete schedules")

    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    schedule = db.query(InstructorSchedule).filter(InstructorSchedule.id == schedule_id, InstructorSchedule.instructor_id == instructor.id).first()

    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    db.delete(schedule)
    db.commit()

    return {"message": "Schedule deleted successfully"}


# ==================== Time Off Routes ====================


@router.post("/time-off", response_model=TimeOffExceptionResponse, status_code=status.HTTP_201_CREATED)
async def create_time_off(
    time_off_data: TimeOffExceptionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Create a time off entry (instructors only)"""
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can create time off")

    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    time_off = TimeOffException(instructor_id=instructor.id, **time_off_data.model_dump())

    db.add(time_off)
    db.commit()
    db.refresh(time_off)

    return time_off


@router.get("/time-off", response_model=List[TimeOffExceptionResponse])
async def get_my_time_off(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Get current user's time off entries (instructors only)"""
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can access time off")

    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    time_off = db.query(TimeOffException).filter(TimeOffException.instructor_id == instructor.id).all()

    return time_off


@router.delete("/time-off/{time_off_id}")
async def delete_time_off(
    time_off_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Delete a time off entry (instructors only)"""
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can delete time off")

    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    time_off = db.query(TimeOffException).filter(TimeOffException.id == time_off_id, TimeOffException.instructor_id == instructor.id).first()

    if not time_off:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time off entry not found")

    db.delete(time_off)
    db.commit()

    return {"message": "Time off deleted successfully"}


# ==================== Custom Availability Routes ====================


@router.post("/custom", response_model=CustomAvailabilityResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_availability(
    custom_data: CustomAvailabilityCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Create a custom availability entry (instructors only)"""
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can create custom availability")

    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    custom_avail = CustomAvailability(instructor_id=instructor.id, **custom_data.model_dump())

    db.add(custom_avail)
    db.commit()
    db.refresh(custom_avail)

    return custom_avail


@router.get("/custom", response_model=List[CustomAvailabilityResponse])
async def get_my_custom_availability(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Get current user's custom availability entries (instructors only)"""
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can access custom availability")

    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    custom_avail = db.query(CustomAvailability).filter(CustomAvailability.instructor_id == instructor.id).all()

    return custom_avail


@router.delete("/custom/{custom_id}")
async def delete_custom_availability(
    custom_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Delete a custom availability entry (instructors only)"""
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can delete custom availability")

    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    custom_avail = db.query(CustomAvailability).filter(CustomAvailability.id == custom_id, CustomAvailability.instructor_id == instructor.id).first()

    if not custom_avail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom availability not found")

    db.delete(custom_avail)
    db.commit()

    return {"message": "Custom availability deleted successfully"}


# ==================== Overview Routes ====================


@router.get("/overview", response_model=AvailabilityOverview)
async def get_availability_overview(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Get complete availability overview (instructors only)"""
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can access availability overview")

    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    schedules = db.query(InstructorSchedule).filter(InstructorSchedule.instructor_id == instructor.id).all()
    time_off = db.query(TimeOffException).filter(TimeOffException.instructor_id == instructor.id).all()
    custom_avail = db.query(CustomAvailability).filter(CustomAvailability.instructor_id == instructor.id).all()

    return AvailabilityOverview(schedules=schedules, time_off=time_off, custom_availability=custom_avail)


# ==================== Available Slots Routes (for students) ====================


@router.get("/instructor/{instructor_id}/slots", response_model=AvailableSlotsByDateResponse)
async def get_instructor_available_slots(
    instructor_id: int,
    start_date: date = Query(..., description="Start date for availability search"),
    end_date: date = Query(..., description="End date for availability search"),
    duration_minutes: int = Query(60, description="Lesson duration in minutes", ge=30, le=180),
    show_booked: bool = Query(False, description="Include booked slots in response (marked with is_booked=True)"),
    db: Session = Depends(get_db),
):
    """Get available time slots for a specific instructor (public - for students to book)"""
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found")

    if not instructor.is_available:
        return AvailableSlotsByDateResponse(instructor_id=instructor_id, availability=[])

    # Limit date range to 60 days
    if (end_date - start_date).days > 60:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Date range cannot exceed 60 days")

    availability_by_date = []
    current_date = start_date

    while current_date <= end_date:
        # Use different function based on whether we want to show booked slots
        if show_booked:
            slots = get_all_slots_with_booking_status(instructor_id, current_date, duration_minutes, db)
        else:
            slots = get_available_slots_for_date(instructor_id, current_date, duration_minutes, db)

        if slots:  # Only include dates with slots
            availability_by_date.append(AvailableSlotsResponse(instructor_id=instructor_id, date=current_date, slots=slots))

        current_date += timedelta(days=1)

    return AvailableSlotsByDateResponse(instructor_id=instructor_id, availability=availability_by_date)


@router.get("/instructor/{instructor_id}/time-off")
async def get_instructor_time_off_public(
    instructor_id: int,
    db: Session = Depends(get_db),
):
    """
    Get instructor's future time-off dates (public endpoint for students)
    Returns only future time-off periods for calendar display
    """
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found",
        )

    # Get only FUTURE time off dates (today and beyond)
    today = date.today()
    time_offs = (
        db.query(TimeOffException)
        .filter(
            TimeOffException.instructor_id == instructor_id,
            TimeOffException.end_date >= today,  # Only future/current time-off
        )
        .all()
    )

    return [
        {
            "id": time_off.id,
            "start_date": time_off.start_date.strftime("%Y-%m-%d"),
            "end_date": time_off.end_date.strftime("%Y-%m-%d"),
            "reason": time_off.reason if time_off.reason != "Time Off" else "Unavailable",  # Generic message
        }
        for time_off in time_offs
    ]


@router.get("/instructor/{instructor_id}/schedule")
async def get_instructor_schedule_public(
    instructor_id: int,
    db: Session = Depends(get_db),
):
    """
    Get instructor's weekly schedule (public endpoint for students)
    Returns active days of the week with working hours
    """
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found",
        )

    schedules = (
        db.query(InstructorSchedule)
        .filter(
            InstructorSchedule.instructor_id == instructor_id,
            InstructorSchedule.is_active == True,
        )
        .all()
    )

    return [
        {
            "day_of_week": schedule.day_of_week.value,
            "start_time": schedule.start_time.strftime("%H:%M"),
            "end_time": schedule.end_time.strftime("%H:%M"),
        }
        for schedule in schedules
    ]
