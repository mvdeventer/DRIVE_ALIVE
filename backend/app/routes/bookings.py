"""
Booking routes
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.availability import CustomAvailability, InstructorSchedule, TimeOffException
from ..models.booking import Booking, BookingStatus, PaymentStatus
from ..models.user import Instructor, Student, User, UserRole
from ..routes.auth import get_current_user
from ..schemas.booking import BookingCancel, BookingCreate, BookingReschedule, BookingResponse, BookingUpdate, ReviewCreate, ReviewResponse

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(booking_data: BookingCreate, current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)):
    """
    Create a new booking (students only)
    """
    # Verify user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can create bookings")

    # Get student profile
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    # Verify instructor exists and is available
    instructor = db.query(Instructor).filter(Instructor.id == booking_data.instructor_id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found")

    if not instructor.is_available:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Instructor is not available")

    # Validate booking time against instructor's schedule
    lesson_datetime = booking_data.lesson_date
    lesson_end = lesson_datetime + timedelta(minutes=booking_data.duration_minutes)
    lesson_date = lesson_datetime.date()
    lesson_time = lesson_datetime.time()

    # Check for time off
    time_off = (
        db.query(TimeOffException)
        .filter(
            TimeOffException.instructor_id == instructor.id,
            TimeOffException.start_date <= lesson_date,
            TimeOffException.end_date >= lesson_date,
        )
        .all()
    )

    for time_off_entry in time_off:
        if time_off_entry.start_time and time_off_entry.end_time:
            # Partial day off
            if not (lesson_time >= time_off_entry.end_time or lesson_end.time() <= time_off_entry.start_time):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Instructor is not available at this time. Reason: {time_off_entry.reason or 'Time off'}",
                )
        else:
            # Full day off
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Instructor is not available on this date. Reason: {time_off_entry.reason or 'Time off'}",
            )

    # Check if time is within instructor's schedule or custom availability
    day_of_week_map = {0: "monday", 1: "tuesday", 2: "wednesday", 3: "thursday", 4: "friday", 5: "saturday", 6: "sunday"}
    day_of_week = day_of_week_map[lesson_date.weekday()]

    # Check regular schedule
    schedules = (
        db.query(InstructorSchedule)
        .filter(
            InstructorSchedule.instructor_id == instructor.id,
            InstructorSchedule.day_of_week == day_of_week,
            InstructorSchedule.is_active == True,
        )
        .all()
    )

    # Check custom availability
    custom_avail = (
        db.query(CustomAvailability)
        .filter(
            CustomAvailability.instructor_id == instructor.id,
            CustomAvailability.date == lesson_date,
            CustomAvailability.is_active == True,
        )
        .all()
    )

    is_within_schedule = False

    # Check if lesson time is within any schedule
    for schedule in schedules:
        if lesson_time >= schedule.start_time and lesson_end.time() <= schedule.end_time:
            is_within_schedule = True
            break

    # Check custom availability
    for custom in custom_avail:
        if lesson_time >= custom.start_time and lesson_end.time() <= custom.end_time:
            is_within_schedule = True
            break

    if not is_within_schedule and len(schedules) + len(custom_avail) > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The selected time is outside of the instructor's available hours")

    # Check for conflicting bookings
    conflicting_booking = (
        db.query(Booking)
        .filter(
            Booking.instructor_id == instructor.id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
            or_(
                # New booking starts during existing booking
                and_(
                    Booking.lesson_date <= lesson_datetime,
                    Booking.lesson_date + timedelta(minutes=Booking.duration_minutes) > lesson_datetime,
                ),
                # New booking ends during existing booking
                and_(
                    Booking.lesson_date < lesson_end,
                    Booking.lesson_date + timedelta(minutes=Booking.duration_minutes) >= lesson_end,
                ),
                # New booking completely overlaps existing booking
                and_(
                    Booking.lesson_date >= lesson_datetime,
                    Booking.lesson_date + timedelta(minutes=Booking.duration_minutes) <= lesson_end,
                ),
            ),
        )
        .first()
    )

    if conflicting_booking:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This time slot is already booked. Please select a different time.")

    # Calculate amount
    amount = instructor.hourly_rate * (booking_data.duration_minutes / 60)

    # Create booking
    booking = Booking(
        booking_reference=f"BK{uuid.uuid4().hex[:8].upper()}",
        student_id=student.id,
        instructor_id=instructor.id,
        lesson_date=booking_data.lesson_date,
        duration_minutes=booking_data.duration_minutes,
        lesson_type=booking_data.lesson_type,
        pickup_latitude=booking_data.pickup_latitude,
        pickup_longitude=booking_data.pickup_longitude,
        pickup_address=booking_data.pickup_address,
        dropoff_latitude=booking_data.dropoff_latitude,
        dropoff_longitude=booking_data.dropoff_longitude,
        dropoff_address=booking_data.dropoff_address,
        amount=amount,
        student_notes=booking_data.student_notes,
        status=BookingStatus.PENDING,
        payment_status=PaymentStatus.PENDING,
    )

    db.add(booking)
    db.commit()
    db.refresh(booking)

    return BookingResponse.from_orm(booking)


@router.post("/bulk", response_model=List[BookingResponse], status_code=status.HTTP_201_CREATED)
async def create_bulk_bookings(
    bookings_data: List[BookingCreate], current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)
):
    """
    Create multiple bookings at once (students only)
    Validates all bookings first, then creates them atomically
    """
    # Verify user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can create bookings")

    # Get student profile
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    if not bookings_data or len(bookings_data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No bookings provided")

    # Get all unique instructor IDs
    instructor_ids = list(set(booking.instructor_id for booking in bookings_data))

    # Fetch all instructors at once
    instructors = db.query(Instructor).filter(Instructor.id.in_(instructor_ids)).all()
    instructor_map = {inst.id: inst for inst in instructors}

    # Validate all instructors exist and are available
    for booking_data in bookings_data:
        if booking_data.instructor_id not in instructor_map:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Instructor {booking_data.instructor_id} not found")
        if not instructor_map[booking_data.instructor_id].is_available:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Instructor {booking_data.instructor_id} is not available")

    # Collect all bookings to create
    new_bookings = []

    # Validate each booking and prepare for creation
    for booking_data in bookings_data:
        instructor = instructor_map[booking_data.instructor_id]
        lesson_datetime = booking_data.lesson_date
        lesson_end = lesson_datetime + timedelta(minutes=booking_data.duration_minutes)
        lesson_date = lesson_datetime.date()
        lesson_time = lesson_datetime.time()

        # Check for time off
        time_off = (
            db.query(TimeOffException)
            .filter(
                TimeOffException.instructor_id == instructor.id,
                TimeOffException.start_date <= lesson_date,
                TimeOffException.end_date >= lesson_date,
            )
            .all()
        )

        for time_off_entry in time_off:
            if time_off_entry.start_time and time_off_entry.end_time:
                if not (lesson_time >= time_off_entry.end_time or lesson_end.time() <= time_off_entry.start_time):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Instructor is not available at {lesson_datetime}. Reason: {time_off_entry.reason or 'Time off'}",
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Instructor is not available on {lesson_date}. Reason: {time_off_entry.reason or 'Time off'}",
                )

        # Check if time is within instructor's schedule
        day_of_week_map = {0: "monday", 1: "tuesday", 2: "wednesday", 3: "thursday", 4: "friday", 5: "saturday", 6: "sunday"}
        day_of_week = day_of_week_map[lesson_date.weekday()]

        schedules = (
            db.query(InstructorSchedule)
            .filter(
                InstructorSchedule.instructor_id == instructor.id,
                InstructorSchedule.day_of_week == day_of_week,
                InstructorSchedule.is_active == True,
            )
            .all()
        )

        custom_avail = (
            db.query(CustomAvailability)
            .filter(
                CustomAvailability.instructor_id == instructor.id,
                CustomAvailability.date == lesson_date,
                CustomAvailability.is_active == True,
            )
            .all()
        )

        is_within_schedule = False
        for schedule in schedules:
            if lesson_time >= schedule.start_time and lesson_end.time() <= schedule.end_time:
                is_within_schedule = True
                break

        for custom in custom_avail:
            if lesson_time >= custom.start_time and lesson_end.time() <= custom.end_time:
                is_within_schedule = True
                break

        if not is_within_schedule and len(schedules) + len(custom_avail) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=f"The selected time {lesson_datetime} is outside of the instructor's available hours"
            )

        # Check for existing conflicting bookings in database (same instructor)
        existing_bookings = (
            db.query(Booking)
            .filter(
                Booking.instructor_id == instructor.id,
                Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
            )
            .all()
        )

        for existing in existing_bookings:
            existing_end = existing.lesson_date + timedelta(minutes=existing.duration_minutes)
            # Check for overlap
            if not (existing_end <= lesson_datetime or existing.lesson_date >= lesson_end):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Time slot {lesson_datetime} conflicts with an existing booking")

        # Check for student's existing bookings with ANY instructor (prevent double-booking)
        student_existing_bookings = (
            db.query(Booking)
            .filter(
                Booking.student_id == student.id,
                Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
            )
            .all()
        )

        for existing in student_existing_bookings:
            existing_end = existing.lesson_date + timedelta(minutes=existing.duration_minutes)
            # Check for overlap
            if not (existing_end <= lesson_datetime or existing.lesson_date >= lesson_end):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"You already have a booking at {lesson_datetime}. You cannot book multiple lessons at the same time.",
                )

        # Check for conflicts with other bookings in this batch
        for other_booking in new_bookings:
            # Check same instructor conflicts
            if other_booking["instructor_id"] == instructor.id:
                other_end = other_booking["lesson_date"] + timedelta(minutes=other_booking["duration_minutes"])
                if not (other_end <= lesson_datetime or other_booking["lesson_date"] >= lesson_end):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Multiple bookings in your request conflict with each other at {lesson_datetime}",
                    )
            # Check student's overlapping bookings (different instructors)
            else:
                other_end = other_booking["lesson_date"] + timedelta(minutes=other_booking["duration_minutes"])
                if not (other_end <= lesson_datetime or other_booking["lesson_date"] >= lesson_end):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"You cannot book multiple lessons at the same time ({lesson_datetime}). Please choose different times.",
                    )

        # Calculate amount
        amount = instructor.hourly_rate * (booking_data.duration_minutes / 60)

        # Prepare booking data
        new_bookings.append(
            {
                "booking_reference": f"BK{uuid.uuid4().hex[:8].upper()}",
                "student_id": student.id,
                "instructor_id": instructor.id,
                "lesson_date": booking_data.lesson_date,
                "duration_minutes": booking_data.duration_minutes,
                "lesson_type": booking_data.lesson_type,
                "pickup_latitude": booking_data.pickup_latitude,
                "pickup_longitude": booking_data.pickup_longitude,
                "pickup_address": booking_data.pickup_address,
                "dropoff_latitude": booking_data.dropoff_latitude,
                "dropoff_longitude": booking_data.dropoff_longitude,
                "dropoff_address": booking_data.dropoff_address,
                "amount": amount,
                "student_notes": booking_data.student_notes,
                "status": BookingStatus.PENDING,
                "payment_status": PaymentStatus.PENDING,
            }
        )

    # All validations passed, create all bookings
    created_bookings = []
    try:
        for booking_dict in new_bookings:
            booking = Booking(**booking_dict)
            db.add(booking)
            created_bookings.append(booking)

        db.commit()

        # Refresh all bookings
        for booking in created_bookings:
            db.refresh(booking)

        return [BookingResponse.from_orm(booking) for booking in created_bookings]

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create bookings: {str(e)}")


@router.get("/", response_model=List[BookingResponse])
async def get_bookings(
    current_user: Annotated[User, Depends(get_current_user)], status: Optional[BookingStatus] = Query(None), db: Session = Depends(get_db)
):
    """
    Get bookings for current user
    """
    query = db.query(Booking)

    if current_user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            query = query.filter(Booking.student_id == student.id)
    elif current_user.role == UserRole.INSTRUCTOR:
        instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
        if instructor:
            query = query.filter(Booking.instructor_id == instructor.id)

    if status:
        query = query.filter(Booking.status == status)

    bookings = query.order_by(Booking.lesson_date.desc()).all()

    return [BookingResponse.from_orm(booking) for booking in bookings]


@router.get("/my-bookings")
async def get_my_bookings(current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)):
    """
    Get all bookings for current user (student or instructor)
    Returns bookings with additional details like instructor/student names
    """
    bookings_list = []

    if current_user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            return []

        bookings = db.query(Booking).filter(Booking.student_id == student.id).order_by(Booking.lesson_date.desc()).all()

        for booking in bookings:
            instructor = db.query(Instructor).filter(Instructor.id == booking.instructor_id).first()
            instructor_user = db.query(User).filter(User.id == instructor.user_id).first() if instructor else None

            # Check if student has reviewed this booking
            from ..models.booking import Review

            review = db.query(Review).filter(Review.booking_id == booking.id).first()

            booking_dict = {
                "id": booking.id,
                "instructor_id": booking.instructor_id,
                "instructor_name": f"{instructor_user.first_name} {instructor_user.last_name}" if instructor_user else "Unknown",
                "instructor_phone": instructor_user.phone if instructor_user else None,
                "vehicle_make": instructor.vehicle_make if instructor else None,
                "vehicle_model": instructor.vehicle_model if instructor else None,
                "vehicle_registration": instructor.vehicle_registration if instructor else None,
                "instructor_city": instructor.city if instructor else None,
                "instructor_suburb": instructor.suburb if instructor else None,
                "scheduled_time": booking.lesson_date.isoformat(),
                "duration_minutes": booking.duration_minutes,
                "status": booking.status.value,
                "payment_status": booking.payment_status.value,
                "total_price": float(booking.amount),
                "pickup_location": booking.pickup_address,
                "review_rating": review.rating if review else None,
            }
            bookings_list.append(booking_dict)

    elif current_user.role == UserRole.INSTRUCTOR:
        instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
        if not instructor:
            return []

        bookings = db.query(Booking).filter(Booking.instructor_id == instructor.id).order_by(Booking.lesson_date.desc()).all()

        for booking in bookings:
            student = db.query(Student).filter(Student.id == booking.student_id).first()
            student_user = db.query(User).filter(User.id == student.user_id).first() if student else None

            # DEBUG: Log student information
            print(f"🔍 DEBUG - Booking ID: {booking.id}")
            print(f"🔍 DEBUG - Student: {student}")
            print(f"🔍 DEBUG - Student ID Number: {student.id_number if student else 'NO STUDENT'}")
            print(f"🔍 DEBUG - Student User: {student_user}")

            booking_dict = {
                "id": booking.id,
                "student_id": student.id if student else None,
                "student_id_number": student.id_number if student else None,
                "student_name": f"{student_user.first_name} {student_user.last_name}" if student_user else "Unknown",
                "student_phone": student_user.phone if student_user else None,
                "student_email": student_user.email if student_user else None,
                "student_city": student.city if student else None,
                "student_suburb": student.suburb if student else None,
                "scheduled_time": booking.lesson_date.isoformat(),
                "duration_minutes": booking.duration_minutes,
                "status": booking.status.value,
                "payment_status": booking.payment_status.value,
                "total_price": float(booking.amount),
                "pickup_location": booking.pickup_address,
                "student_notes": booking.student_notes,
            }
            print(f"🔍 DEBUG - booking_dict keys: {booking_dict.keys()}")
            print(f"🔍 DEBUG - student_id_number value: {booking_dict.get('student_id_number')}")
            bookings_list.append(booking_dict)

    return bookings_list


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: int, current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)):
    """
    Get booking by ID
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    # Verify user has access to this booking
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()

    if student and booking.student_id == student.id:
        return BookingResponse.from_orm(booking)
    elif instructor and booking.instructor_id == instructor.id:
        return BookingResponse.from_orm(booking)
    elif current_user.role == UserRole.ADMIN:
        return BookingResponse.from_orm(booking)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this booking")


@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int, booking_data: BookingUpdate, current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)
):
    """
    Update a booking (students only, before confirmation)
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    # Verify user is the student who created the booking
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student or booking.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this booking")

    # Can only update pending bookings
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only update pending bookings")

    # Update fields
    for field, value in booking_data.dict(exclude_unset=True).items():
        setattr(booking, field, value)

    db.commit()
    db.refresh(booking)

    return BookingResponse.from_orm(booking)


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: int, cancel_data: BookingCancel, current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)
):
    """
    Cancel a booking
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    # Verify user has permission to cancel
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()

    cancelled_by = None
    if student and booking.student_id == student.id:
        cancelled_by = "student"
    elif instructor and booking.instructor_id == instructor.id:
        cancelled_by = "instructor"
    elif current_user.role == UserRole.ADMIN:
        cancelled_by = "admin"
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to cancel this booking")

    # Can only cancel confirmed or pending bookings
    if booking.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only cancel pending or confirmed bookings")

    # Update booking
    booking.status = BookingStatus.CANCELLED
    booking.cancelled_at = datetime.now(timezone.utc)
    booking.cancelled_by = cancelled_by
    booking.cancellation_reason = cancel_data.cancellation_reason

    # Calculate refund based on cancellation policy (simplified)
    # Note: lesson_date is stored as naive datetime in local time (SAST = UTC+2)
    from datetime import timedelta as td

    south_africa_offset = td(hours=2)

    if booking.lesson_date.tzinfo is None:
        lesson_date_utc = booking.lesson_date.replace(tzinfo=timezone.utc) - south_africa_offset
    else:
        lesson_date_utc = booking.lesson_date

    hours_until_lesson = (lesson_date_utc - datetime.now(timezone.utc)).total_seconds() / 3600
    if hours_until_lesson >= 24:
        booking.refund_amount = booking.amount  # Full refund
    elif hours_until_lesson >= 12:
        booking.refund_amount = booking.amount * 0.5  # 50% refund
    else:
        booking.refund_amount = 0  # No refund

    db.commit()
    db.refresh(booking)

    return BookingResponse.from_orm(booking)


@router.post("/{booking_id}/confirm", response_model=BookingResponse)
async def confirm_booking(booking_id: int, current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)):
    """
    Confirm a booking (instructors only)
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    # Verify user is the instructor
    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor or booking.instructor_id != instructor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the assigned instructor can confirm this booking")

    # Can only confirm pending bookings with successful payment
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is not pending")

    if booking.payment_status != PaymentStatus.PAID:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment must be completed before confirmation")

    booking.status = BookingStatus.CONFIRMED
    db.commit()
    db.refresh(booking)

    return BookingResponse.from_orm(booking)


@router.post("/reviews", response_model=ReviewResponse)
async def create_review(review_data: ReviewCreate, current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)):
    """
    Create a review for a completed booking (students only)
    """
    from ..models.booking import Review

    # Verify user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can create reviews")

    # Get student profile
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    # Get booking
    booking = db.query(Booking).filter(Booking.id == review_data.booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    # Verify student owns this booking
    if booking.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only review your own bookings")

    # Check if booking is completed or in the past
    # Allow reviews if status is COMPLETED or if lesson time has passed
    # Note: lesson_date is stored as naive datetime in local time (SAST = UTC+2)
    # Convert to UTC+2 for proper comparison
    from datetime import timedelta as td

    south_africa_offset = td(hours=2)  # SAST is UTC+2

    if booking.lesson_date.tzinfo is None:
        # Naive datetime - treat as SAST (UTC+2)
        lesson_date_utc = booking.lesson_date.replace(tzinfo=timezone.utc) - south_africa_offset
    else:
        lesson_date_utc = booking.lesson_date

    now_utc = datetime.now(timezone.utc)

    if booking.status != BookingStatus.COMPLETED and lesson_date_utc > now_utc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot review a future lesson")

    # Validate rating
    if review_data.rating < 1 or review_data.rating > 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rating must be between 1 and 5")

    # Check if review already exists - if so, update it instead of creating new
    existing_review = db.query(Review).filter(Review.booking_id == review_data.booking_id).first()

    if existing_review:
        # Update existing review
        existing_review.rating = review_data.rating
        if review_data.comment:
            existing_review.comment = review_data.comment
        review = existing_review
    else:
        # Create new review
        review = Review(booking_id=review_data.booking_id, rating=review_data.rating, comment=review_data.comment)
        db.add(review)

    # Update instructor's rating
    instructor = db.query(Instructor).filter(Instructor.id == booking.instructor_id).first()
    if instructor:
        # Recalculate average rating from all reviews
        all_reviews = db.query(Review).join(Booking, Review.booking_id == Booking.id).filter(Booking.instructor_id == instructor.id).all()

        # Include the current review if it's new (not in all_reviews yet)
        if not existing_review:
            total_ratings = sum(r.rating for r in all_reviews) + review_data.rating
            total_reviews = len(all_reviews) + 1
        else:
            total_ratings = sum(r.rating for r in all_reviews)
            total_reviews = len(all_reviews)

        instructor.rating = total_ratings / total_reviews if total_reviews > 0 else 0
        instructor.total_reviews = total_reviews

    db.commit()
    db.refresh(review)

    return ReviewResponse.from_orm(review)


@router.patch("/{booking_id}/reschedule")
async def reschedule_booking(
    booking_id: int,
    reschedule_data: BookingReschedule,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Reschedule a booking to a new date/time (instructor only)
    """
    # Verify user is an instructor
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can reschedule bookings")

    # Get instructor profile
    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    # Get the booking
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    # Verify the booking belongs to this instructor
    if booking.instructor_id != instructor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only reschedule your own bookings")

    # Verify booking status allows rescheduling
    if booking.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot reschedule a {booking.status} booking")

    # Parse new datetime
    try:
        new_lesson_datetime = datetime.fromisoformat(reschedule_data.new_datetime.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:MM:SS)")

    # Validate new time is in the future
    if new_lesson_datetime <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New lesson time must be in the future")

    lesson_end = new_lesson_datetime + timedelta(minutes=booking.duration_minutes)
    lesson_date = new_lesson_datetime.date()
    lesson_time = new_lesson_datetime.time()

    # Check for time off
    time_off = (
        db.query(TimeOffException)
        .filter(
            TimeOffException.instructor_id == instructor.id,
            TimeOffException.start_date <= lesson_date,
            TimeOffException.end_date >= lesson_date,
        )
        .all()
    )

    for time_off_entry in time_off:
        if time_off_entry.start_time and time_off_entry.end_time:
            if not (lesson_time >= time_off_entry.end_time or lesson_end.time() <= time_off_entry.start_time):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"You have time off at this time. Reason: {time_off_entry.reason or 'Time off'}",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You have time off on {lesson_date}. Reason: {time_off_entry.reason or 'Time off'}",
            )

    # Check for conflicts with existing bookings (exclude current booking)
    existing_bookings = (
        db.query(Booking)
        .filter(
            Booking.instructor_id == instructor.id,
            Booking.id != booking_id,  # Exclude current booking
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
        .all()
    )

    for existing in existing_bookings:
        existing_end = existing.lesson_date + timedelta(minutes=existing.duration_minutes)
        # Check for overlap
        if not (existing_end <= new_lesson_datetime or existing.lesson_date >= lesson_end):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=f"Time slot conflicts with an existing booking at {existing.lesson_date}"
            )

    # Check if student is available
    student_bookings = (
        db.query(Booking)
        .filter(
            Booking.student_id == booking.student_id,
            Booking.id != booking_id,  # Exclude current booking
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
        .all()
    )

    for existing in student_bookings:
        existing_end = existing.lesson_date + timedelta(minutes=existing.duration_minutes)
        # Check for overlap
        if not (existing_end <= new_lesson_datetime or existing.lesson_date >= lesson_end):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student has another booking at this time")

    # Check instructor's schedule
    day_of_week_map = {
        0: "monday",
        1: "tuesday",
        2: "wednesday",
        3: "thursday",
        4: "friday",
        5: "saturday",
        6: "sunday",
    }
    day_name = day_of_week_map[new_lesson_datetime.weekday()].upper()

    schedule = (
        db.query(InstructorSchedule)
        .filter(
            InstructorSchedule.instructor_id == instructor.id,
            InstructorSchedule.day_of_week == day_name,
            InstructorSchedule.is_active == True,
        )
        .first()
    )

    if not schedule:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"You are not available on {day_name.lower()}s")

    # Validate time is within schedule
    if lesson_time < schedule.start_time or lesson_end.time() > schedule.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Time {lesson_time} is outside your working hours ({schedule.start_time} - {schedule.end_time})",
        )

    # Store original lesson date if this is the first reschedule
    if booking.rebooking_count == 0:
        booking.original_lesson_date = booking.lesson_date

    # Check if rescheduling within 6 hours of lesson time
    # Note: lesson_date is stored as naive datetime in local time (SAST = UTC+2)
    from datetime import timedelta as td

    south_africa_offset = td(hours=2)

    if booking.lesson_date.tzinfo is None:
        lesson_date_utc = booking.lesson_date.replace(tzinfo=timezone.utc) - south_africa_offset
    else:
        lesson_date_utc = booking.lesson_date

    hours_until_lesson = (lesson_date_utc - datetime.now(timezone.utc)).total_seconds() / 3600
    if hours_until_lesson < 6:
        # Apply 50% cancellation fee
        booking.cancellation_fee = booking.amount * 0.5

    # Increment rebooking count
    booking.rebooking_count += 1

    # Update the booking
    booking.lesson_date = new_lesson_datetime
    db.commit()
    db.refresh(booking)

    return {
        "message": "Booking rescheduled successfully",
        "booking_id": booking.id,
        "booking_reference": booking.booking_reference,
        "rebooking_count": booking.rebooking_count,
        "cancellation_fee": booking.cancellation_fee,
        "new_datetime": new_lesson_datetime.isoformat(),
    }
