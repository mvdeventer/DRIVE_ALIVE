"""
Instructor Initial Setup Routes
Unauthenticated endpoints that accept a one-time setup_token issued at registration.
Allows newly registered (unverified) instructors to set their schedule and time off
before their account is verified.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.availability import InstructorSchedule, TimeOffException
from ..models.user import Instructor
from ..schemas.availability import (
    InstructorScheduleCreate,
    InstructorScheduleUpdate,
    TimeOffExceptionCreate,
)

router = APIRouter(prefix="/instructors/setup", tags=["Instructor Initial Setup"])


def _get_instructor_by_setup_token(
    instructor_id: int,
    setup_token: str,
    db: Session,
) -> Instructor:
    """
    Validate the setup_token and return the matching Instructor.
    Raises HTTP 401 if token is missing/invalid, 404 if instructor not found.
    """
    if not setup_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="setup_token is required",
        )

    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found",
        )

    if instructor.setup_token != setup_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired setup token",
        )

    return instructor


# ═══════════════════════════════════════════════════════
# Schedule CRUD
# ═══════════════════════════════════════════════════════


@router.get("/{instructor_id}/schedule")
async def setup_get_schedule(
    instructor_id: int,
    setup_token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Get the weekly schedule for an instructor (setup token required)"""
    _get_instructor_by_setup_token(instructor_id, setup_token, db)

    schedules = (
        db.query(InstructorSchedule)
        .filter(InstructorSchedule.instructor_id == instructor_id)
        .all()
    )

    return [
        {
            "id": sched.id,
            "day_of_week": sched.day_of_week.value,
            "start_time": sched.start_time.strftime("%H:%M"),
            "end_time": sched.end_time.strftime("%H:%M"),
            "is_active": sched.is_active,
        }
        for sched in schedules
    ]


@router.post("/{instructor_id}/schedule", status_code=status.HTTP_201_CREATED)
async def setup_create_schedule(
    instructor_id: int,
    schedule_data: InstructorScheduleCreate,
    setup_token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Create a schedule entry for an instructor (setup token required)"""
    _get_instructor_by_setup_token(instructor_id, setup_token, db)

    # Prevent duplicate day
    existing = (
        db.query(InstructorSchedule)
        .filter(
            InstructorSchedule.instructor_id == instructor_id,
            InstructorSchedule.day_of_week == schedule_data.day_of_week,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Schedule already exists for {schedule_data.day_of_week.value}",
        )

    new_schedule = InstructorSchedule(
        instructor_id=instructor_id,
        day_of_week=schedule_data.day_of_week,
        start_time=schedule_data.start_time,
        end_time=schedule_data.end_time,
        is_active=schedule_data.is_active,
    )

    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)

    return {
        "id": new_schedule.id,
        "instructor_id": new_schedule.instructor_id,
        "day_of_week": new_schedule.day_of_week.value,
        "start_time": new_schedule.start_time.strftime("%H:%M"),
        "end_time": new_schedule.end_time.strftime("%H:%M"),
        "is_active": new_schedule.is_active,
    }


@router.put("/{instructor_id}/schedule/{schedule_id}")
async def setup_update_schedule(
    instructor_id: int,
    schedule_id: int,
    schedule_data: InstructorScheduleUpdate,
    setup_token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Update a schedule entry for an instructor (setup token required)"""
    _get_instructor_by_setup_token(instructor_id, setup_token, db)

    schedule = (
        db.query(InstructorSchedule)
        .filter(
            InstructorSchedule.id == schedule_id,
            InstructorSchedule.instructor_id == instructor_id,
        )
        .first()
    )
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule entry not found",
        )

    if schedule_data.start_time is not None:
        schedule.start_time = schedule_data.start_time
    if schedule_data.end_time is not None:
        schedule.end_time = schedule_data.end_time
    if schedule_data.is_active is not None:
        schedule.is_active = schedule_data.is_active

    db.commit()
    db.refresh(schedule)

    return {
        "id": schedule.id,
        "instructor_id": schedule.instructor_id,
        "day_of_week": schedule.day_of_week.value,
        "start_time": schedule.start_time.strftime("%H:%M"),
        "end_time": schedule.end_time.strftime("%H:%M"),
        "is_active": schedule.is_active,
    }


@router.delete("/{instructor_id}/schedule/{schedule_id}")
async def setup_delete_schedule(
    instructor_id: int,
    schedule_id: int,
    setup_token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Delete a schedule entry for an instructor (setup token required)"""
    _get_instructor_by_setup_token(instructor_id, setup_token, db)

    schedule = (
        db.query(InstructorSchedule)
        .filter(
            InstructorSchedule.id == schedule_id,
            InstructorSchedule.instructor_id == instructor_id,
        )
        .first()
    )
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule entry not found",
        )

    db.delete(schedule)
    db.commit()

    return {"message": "Schedule entry deleted successfully"}


# ═══════════════════════════════════════════════════════
# Time-Off CRUD
# ═══════════════════════════════════════════════════════


@router.get("/{instructor_id}/time-off")
async def setup_get_time_off(
    instructor_id: int,
    setup_token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Get all time-off entries for an instructor (setup token required)"""
    _get_instructor_by_setup_token(instructor_id, setup_token, db)

    time_offs = (
        db.query(TimeOffException)
        .filter(TimeOffException.instructor_id == instructor_id)
        .all()
    )

    return [
        {
            "id": t.id,
            "start_date": t.start_date.strftime("%Y-%m-%d"),
            "end_date": t.end_date.strftime("%Y-%m-%d"),
            "start_time": t.start_time.strftime("%H:%M") if t.start_time else None,
            "end_time": t.end_time.strftime("%H:%M") if t.end_time else None,
            "reason": t.reason,
            "notes": t.notes,
        }
        for t in time_offs
    ]


@router.post("/{instructor_id}/time-off", status_code=status.HTTP_201_CREATED)
async def setup_create_time_off(
    instructor_id: int,
    time_off_data: TimeOffExceptionCreate,
    setup_token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Create a time-off entry for an instructor (setup token required)"""
    _get_instructor_by_setup_token(instructor_id, setup_token, db)

    new_time_off = TimeOffException(
        instructor_id=instructor_id,
        start_date=time_off_data.start_date,
        end_date=time_off_data.end_date,
        start_time=time_off_data.start_time,
        end_time=time_off_data.end_time,
        reason=time_off_data.reason,
        notes=time_off_data.notes,
    )

    db.add(new_time_off)
    db.commit()
    db.refresh(new_time_off)

    return {
        "id": new_time_off.id,
        "instructor_id": new_time_off.instructor_id,
        "start_date": new_time_off.start_date.strftime("%Y-%m-%d"),
        "end_date": new_time_off.end_date.strftime("%Y-%m-%d"),
        "start_time": (
            new_time_off.start_time.strftime("%H:%M") if new_time_off.start_time else None
        ),
        "end_time": (
            new_time_off.end_time.strftime("%H:%M") if new_time_off.end_time else None
        ),
        "reason": new_time_off.reason,
        "notes": new_time_off.notes,
    }


@router.delete("/{instructor_id}/time-off/{time_off_id}")
async def setup_delete_time_off(
    instructor_id: int,
    time_off_id: int,
    setup_token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Delete a time-off entry for an instructor (setup token required)"""
    _get_instructor_by_setup_token(instructor_id, setup_token, db)

    time_off = (
        db.query(TimeOffException)
        .filter(
            TimeOffException.id == time_off_id,
            TimeOffException.instructor_id == instructor_id,
        )
        .first()
    )
    if not time_off:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time-off entry not found",
        )

    db.delete(time_off)
    db.commit()

    return {"message": "Time-off entry deleted successfully"}
