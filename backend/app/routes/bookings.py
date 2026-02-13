"""
Booking routes
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models.availability import (
    CustomAvailability,
    InstructorSchedule,
    TimeOffException,
)
from ..models.booking import Booking, BookingStatus, PaymentStatus
from ..models.user import Instructor, Student, User, UserRole
from ..routes.auth import get_current_user, get_active_role
from ..schemas.booking import (
    BookingCancel,
    BookingCreate,
    BookingReschedule,
    BookingResponse,
    BookingUpdate,
    InstructorRescheduleRequest,
    ReviewCreate,
    ReviewResponse,
)
from ..services.whatsapp_service import whatsapp_service

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def auto_update_past_bookings(db: Session):
    """
    Helper function to automatically mark past PENDING bookings as COMPLETED
    Called before returning booking lists to keep statuses current
    """
    now = datetime.now(timezone.utc)

    # Find all PENDING bookings where lesson has ended
    # lesson_date is stored in local time (SAST = UTC+2)
    past_pending = (
        db.query(Booking).filter(Booking.status == BookingStatus.PENDING).all()
    )

    updated_count = 0
    for booking in past_pending:
        # Convert lesson_date to UTC for comparison
        south_africa_offset = timedelta(hours=2)

        if booking.lesson_date.tzinfo is None:
            lesson_date_utc = (
                booking.lesson_date.replace(tzinfo=timezone.utc) - south_africa_offset
            )
        else:
            lesson_date_utc = booking.lesson_date

        # Add duration to get lesson end time
        lesson_end_utc = lesson_date_utc + timedelta(minutes=booking.duration_minutes)

        # If lesson has ended, mark as completed
        if lesson_end_utc < now:
            booking.status = BookingStatus.COMPLETED
            updated_count += 1

    if updated_count > 0:
        db.commit()

    return updated_count


@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Create a new booking (students only)
    """
    # Verify user is a student
    active_role = get_active_role(current_user)
    if active_role != UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can create bookings",
        )

    # Get student profile
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found"
        )

    # Verify instructor exists and is available
    instructor = (
        db.query(Instructor).filter(Instructor.id == booking_data.instructor_id).first()
    )
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found"
        )

    # Prevent self-booking (student cannot book themselves as instructor)
    if instructor.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot book a lesson with yourself. Please select a different instructor.",
        )

    if not instructor.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instructor is not available",
        )

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
            if not (
                lesson_time >= time_off_entry.end_time
                or lesson_end.time() <= time_off_entry.start_time
            ):
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
    day_of_week_map = {
        0: "monday",
        1: "tuesday",
        2: "wednesday",
        3: "thursday",
        4: "friday",
        5: "saturday",
        6: "sunday",
    }
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
        if (
            lesson_time >= schedule.start_time
            and lesson_end.time() <= schedule.end_time
        ):
            is_within_schedule = True
            break

    # Check custom availability
    for custom in custom_avail:
        if lesson_time >= custom.start_time and lesson_end.time() <= custom.end_time:
            is_within_schedule = True
            break

    if not is_within_schedule and len(schedules) + len(custom_avail) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected time is outside of the instructor's available hours",
        )

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
                    Booking.lesson_date + timedelta(minutes=Booking.duration_minutes)
                    > lesson_datetime,
                ),
                # New booking ends during existing booking
                and_(
                    Booking.lesson_date < lesson_end,
                    Booking.lesson_date + timedelta(minutes=Booking.duration_minutes)
                    >= lesson_end,
                ),
                # New booking completely overlaps existing booking
                and_(
                    Booking.lesson_date >= lesson_datetime,
                    Booking.lesson_date + timedelta(minutes=Booking.duration_minutes)
                    <= lesson_end,
                ),
            ),
        )
        .first()
    )

    if conflicting_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This time slot is already booked. Please select a different time.",
        )

    # Calculate amount (lesson fee only, booking fee stored separately)
    lesson_amount = instructor.hourly_rate * (booking_data.duration_minutes / 60)
    instructor_booking_fee = instructor.booking_fee or 20.0  # Default to R20 if not set

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
        amount=lesson_amount,  # Lesson price only (booking fee stored separately)
        booking_fee=instructor_booking_fee,
        student_notes=booking_data.student_notes,
        status=BookingStatus.PENDING,
        payment_status=PaymentStatus.PENDING,
    )

    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Send WhatsApp confirmation to student
    try:
        import logging

        logger = logging.getLogger(__name__)
        logger.info(
            f"Attempting to send WhatsApp confirmation for booking {booking.booking_reference}"
        )
        logger.info(
            f"Student: {current_user.first_name} {current_user.last_name}, Phone: {current_user.phone}"
        )
        logger.info(
            f"Instructor: {instructor.user.first_name} {instructor.user.last_name}"
        )

        # Send total amount (lesson + booking fee) for WhatsApp confirmation
        total_amount = booking.amount + booking.booking_fee
        result = whatsapp_service.send_booking_confirmation(
            student_name=f"{current_user.first_name} {current_user.last_name}",
            student_phone=current_user.phone,
            instructor_name=f"{instructor.user.first_name} {instructor.user.last_name}",
            lesson_date=booking.lesson_date,
            pickup_address=booking.pickup_address,
            amount=total_amount,
            booking_reference=booking.booking_reference,
            student_notes=booking.student_notes,
        )

        if result:
            logger.info(
                f"✅ WhatsApp confirmation sent successfully for {booking.booking_reference}"
            )
        else:
            logger.warning(
                f"⚠️ WhatsApp confirmation returned False for {booking.booking_reference}"
            )

        # Check if booking is for TODAY and send immediate notification to instructor
        now = datetime.now(timezone.utc)
        # Convert lesson_date to UTC for comparison
        lesson_date_utc = (
            booking.lesson_date.replace(tzinfo=timezone.utc)
            if booking.lesson_date.tzinfo is None
            else booking.lesson_date
        )

        # Check if lesson is today (same date in SAST timezone UTC+2)
        sast_now = now + timedelta(hours=2)  # Convert UTC to SAST
        lesson_date_sast = lesson_date_utc + timedelta(hours=2)  # Convert lesson time to SAST

        if sast_now.date() == lesson_date_sast.date():
            logger.info(
                f"📅 Same-day booking detected! Sending immediate notification to instructor."
            )
            instructor_result = whatsapp_service.send_same_day_booking_notification(
                instructor_name=f"{instructor.user.first_name} {instructor.user.last_name}",
                instructor_phone=instructor.user.phone,
                student_name=f"{current_user.first_name} {current_user.last_name}",
                student_phone=current_user.phone,
                lesson_date=booking.lesson_date,
                pickup_address=booking.pickup_address,
                booking_reference=booking.booking_reference,
                amount=total_amount,
                student_notes=booking.student_notes,
            )

            if instructor_result:
                logger.info(
                    f"✅ Same-day notification sent to instructor for {booking.booking_reference}"
                )
            else:
                logger.warning(
                    f"⚠️ Failed to send same-day notification to instructor for {booking.booking_reference}"
                )

    except Exception as e:
        # Log error but don't fail the booking
        import logging
        import traceback

        logger = logging.getLogger(__name__)
        logger.error(f"❌ Failed to send WhatsApp confirmation: {e}")
        logger.error(traceback.format_exc())
        print(f"Failed to send WhatsApp confirmation: {e}")
        print(traceback.format_exc())

    return BookingResponse.from_orm(booking)


@router.post(
    "/bulk", response_model=List[BookingResponse], status_code=status.HTTP_201_CREATED
)
async def create_bulk_bookings(
    bookings_data: List[BookingCreate],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Create multiple bookings at once (students only)
    Validates all bookings first, then creates them atomically
    """
    # Verify user is a student
    active_role = get_active_role(current_user)
    if active_role != UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can create bookings",
        )

    # Get student profile
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found"
        )

    if not bookings_data or len(bookings_data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No bookings provided"
        )

    # Get all unique instructor IDs
    instructor_ids = list(set(booking.instructor_id for booking in bookings_data))

    # Fetch all instructors at once
    instructors = db.query(Instructor).filter(Instructor.id.in_(instructor_ids)).all()
    instructor_map = {inst.id: inst for inst in instructors}

    # Validate all instructors exist and are available
    for booking_data in bookings_data:
        if booking_data.instructor_id not in instructor_map:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Instructor {booking_data.instructor_id} not found",
            )
        if not instructor_map[booking_data.instructor_id].is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Instructor {booking_data.instructor_id} is not available",
            )

    # Collect all bookings to create
    new_bookings = []

    # Validate each booking and prepare for creation
    for booking_data in bookings_data:
        instructor = instructor_map[booking_data.instructor_id]
        lesson_datetime = booking_data.lesson_date

        # Ensure datetime is timezone-aware (assume UTC if naive)
        if lesson_datetime.tzinfo is None:
            lesson_datetime = lesson_datetime.replace(tzinfo=timezone.utc)

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
                if not (
                    lesson_time >= time_off_entry.end_time
                    or lesson_end.time() <= time_off_entry.start_time
                ):
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
        day_of_week_map = {
            0: "monday",
            1: "tuesday",
            2: "wednesday",
            3: "thursday",
            4: "friday",
            5: "saturday",
            6: "sunday",
        }
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
            if (
                lesson_time >= schedule.start_time
                and lesson_end.time() <= schedule.end_time
            ):
                is_within_schedule = True
                break

        for custom in custom_avail:
            if (
                lesson_time >= custom.start_time
                and lesson_end.time() <= custom.end_time
            ):
                is_within_schedule = True
                break

        if not is_within_schedule and len(schedules) + len(custom_avail) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The selected time {lesson_datetime} is outside of the instructor's available hours",
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
            # Make existing booking datetime timezone-aware if needed
            existing_lesson_date = existing.lesson_date
            if existing_lesson_date.tzinfo is None:
                existing_lesson_date = existing_lesson_date.replace(tzinfo=timezone.utc)
            existing_end = existing_lesson_date + timedelta(
                minutes=existing.duration_minutes
            )
            # Check for overlap
            if not (
                existing_end <= lesson_datetime or existing_lesson_date >= lesson_end
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Time slot {lesson_datetime} conflicts with an existing booking",
                )

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
            # Make existing booking datetime timezone-aware if needed
            existing_lesson_date = existing.lesson_date
            if existing_lesson_date.tzinfo is None:
                existing_lesson_date = existing_lesson_date.replace(tzinfo=timezone.utc)
            existing_end = existing_lesson_date + timedelta(
                minutes=existing.duration_minutes
            )
            # Check for overlap
            if not (
                existing_end <= lesson_datetime or existing_lesson_date >= lesson_end
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"You already have a booking at {lesson_datetime}. You cannot book multiple lessons at the same time.",
                )

        # Check for conflicts with other bookings in this batch
        for other_booking in new_bookings:
            # Ensure other booking datetime is timezone-aware
            other_lesson_date = other_booking["lesson_date"]
            if other_lesson_date.tzinfo is None:
                other_lesson_date = other_lesson_date.replace(tzinfo=timezone.utc)

            # Check same instructor conflicts
            if other_booking["instructor_id"] == instructor.id:
                other_end = other_lesson_date + timedelta(
                    minutes=other_booking["duration_minutes"]
                )
                if not (
                    other_end <= lesson_datetime or other_lesson_date >= lesson_end
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Multiple bookings in your request conflict with each other at {lesson_datetime}",
                    )
            # Check student's overlapping bookings (different instructors)
            else:
                other_end = other_lesson_date + timedelta(
                    minutes=other_booking["duration_minutes"]
                )
                if not (
                    other_end <= lesson_datetime or other_lesson_date >= lesson_end
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"You cannot book multiple lessons at the same time ({lesson_datetime}). Please choose different times.",
                    )

        # Calculate amount (lesson fee only, booking fee stored separately)
        lesson_amount = instructor.hourly_rate * (booking_data.duration_minutes / 60)
        instructor_booking_fee = (
            instructor.booking_fee or 10.0
        )  # Default to R10 if not set

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
                "amount": lesson_amount,  # Lesson price only
                "booking_fee": instructor_booking_fee,  # Booking fee stored separately
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

        # Send WhatsApp confirmation for each booking
        import logging

        logger = logging.getLogger(__name__)

        for booking in created_bookings:
            try:
                # Get instructor with user relationship
                instructor = (
                    db.query(Instructor)
                    .filter(Instructor.id == booking.instructor_id)
                    .first()
                )
                if instructor and instructor.user:
                    logger.info(
                        f"[BULK] Attempting to send WhatsApp confirmation for booking {booking.booking_reference}"
                    )
                    logger.info(
                        f"[BULK] Student: {current_user.first_name} {current_user.last_name}, Phone: {current_user.phone}"
                    )
                    logger.info(
                        f"[BULK] Instructor: {instructor.user.first_name} {instructor.user.last_name}"
                    )

                    # Send total amount (lesson + booking fee) for WhatsApp confirmation
                    total_amount = booking.amount + booking.booking_fee
                    result = whatsapp_service.send_booking_confirmation(
                        student_name=f"{current_user.first_name} {current_user.last_name}",
                        student_phone=current_user.phone,
                        instructor_name=f"{instructor.user.first_name} {instructor.user.last_name}",
                        lesson_date=booking.lesson_date,
                        pickup_address=booking.pickup_address or "To be confirmed",
                        amount=total_amount,
                        booking_reference=booking.booking_reference,
                    )
                    if result:
                        logger.info(
                            f"[BULK] ✅ WhatsApp confirmation sent successfully for {booking.booking_reference}"
                        )
                    else:
                        logger.error(
                            f"[BULK] ❌ WhatsApp confirmation failed for {booking.booking_reference}"
                        )
                else:
                    logger.error(
                        f"[BULK] ❌ Could not load instructor or user relationship for booking {booking.booking_reference}"
                    )
            except Exception as whatsapp_error:
                logger.error(
                    f"[BULK] ❌ WhatsApp error for booking {booking.booking_reference}: {whatsapp_error}"
                )
                import traceback

                logger.error(traceback.format_exc())

        return [BookingResponse.from_orm(booking) for booking in created_bookings]

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create bookings: {str(e)}",
        )


@router.get("/", response_model=List[BookingResponse])
async def get_bookings(
    current_user: Annotated[User, Depends(get_current_user)],
    status: Optional[BookingStatus] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get bookings for current user
    """
    # Auto-update past pending bookings to completed
    auto_update_past_bookings(db)

    query = db.query(Booking)

    active_role = get_active_role(current_user)
    if active_role == UserRole.STUDENT.value:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            query = query.filter(Booking.student_id == student.id)
    elif active_role == UserRole.INSTRUCTOR.value:
        instructor = (
            db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
        )
        if instructor:
            query = query.filter(Booking.instructor_id == instructor.id)

    if status:
        query = query.filter(Booking.status == status)

    bookings = query.order_by(Booking.lesson_date.desc()).all()

    return [BookingResponse.from_orm(booking) for booking in bookings]


@router.get("/my-bookings")
async def get_my_bookings(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get all bookings for current user (student or instructor)
    Returns bookings with additional details like instructor/student names
    """
    # Auto-update past pending bookings to completed
    auto_update_past_bookings(db)

    bookings_list = []

    active_role = get_active_role(current_user)
    if active_role == UserRole.STUDENT.value:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            return []

        bookings = (
            db.query(Booking)
            .filter(Booking.student_id == student.id)
            .order_by(Booking.lesson_date.desc())
            .all()
        )

        for booking in bookings:
            instructor = (
                db.query(Instructor)
                .filter(Instructor.id == booking.instructor_id)
                .first()
            )
            instructor_user = (
                db.query(User).filter(User.id == instructor.user_id).first()
                if instructor
                else None
            )

            # Check if student has reviewed this booking
            from ..models.booking import Review

            review = db.query(Review).filter(Review.booking_id == booking.id).first()

            booking_dict = {
                "id": booking.id,
                "booking_reference": booking.booking_reference,
                "instructor_id": booking.instructor_id,
                "instructor_name": (
                    f"{instructor_user.first_name} {instructor_user.last_name}"
                    if instructor_user
                    else "Unknown"
                ),
                "instructor_phone": instructor_user.phone if instructor_user else None,
                "vehicle_make": instructor.vehicle_make if instructor else None,
                "vehicle_model": instructor.vehicle_model if instructor else None,
                "vehicle_registration": (
                    instructor.vehicle_registration if instructor else None
                ),
                "instructor_city": instructor.city if instructor else None,
                "instructor_suburb": instructor.suburb if instructor else None,
                "scheduled_time": booking.lesson_date.isoformat(),
                "duration_minutes": booking.duration_minutes,
                "status": booking.status.value,
                "payment_status": booking.payment_status.value,
                "total_price": float(
                    booking.amount + (booking.booking_fee or 0.0)
                ),  # Total price = lesson price + booking fee
                "pickup_location": booking.pickup_address,
                "review_rating": review.rating if review else None,
            }
            bookings_list.append(booking_dict)

    elif active_role == UserRole.INSTRUCTOR.value:
        instructor = (
            db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
        )
        if not instructor:
            return []

        bookings = (
            db.query(Booking)
            .filter(Booking.instructor_id == instructor.id)
            .order_by(Booking.lesson_date.desc())
            .all()
        )

        for booking in bookings:
            student = db.query(Student).filter(Student.id == booking.student_id).first()
            student_user = (
                db.query(User).filter(User.id == student.user_id).first()
                if student
                else None
            )

            # DEBUG: Log student information
            print(f"🔍 DEBUG - Booking ID: {booking.id}")
            print(f"🔍 DEBUG - Student: {student}")
            print(
                f"🔍 DEBUG - Student ID Number: {student.id_number if student else 'NO STUDENT'}"
            )
            print(f"🔍 DEBUG - Student User: {student_user}")

            booking_dict = {
                "id": booking.id,
                "booking_reference": booking.booking_reference,
                "student_id": student.id if student else None,
                "student_id_number": student.id_number if student else None,
                "student_name": (
                    f"{student_user.first_name} {student_user.last_name}"
                    if student_user
                    else "Unknown"
                ),
                "student_phone": student_user.phone if student_user else None,
                "student_email": student_user.email if student_user else None,
                "student_city": student.city if student else None,
                "student_suburb": student.suburb if student else None,
                "scheduled_time": booking.lesson_date.isoformat(),
                "duration_minutes": booking.duration_minutes,
                "status": booking.status.value,
                "payment_status": booking.payment_status.value,
                "total_price": float(booking.amount) + float(booking.booking_fee or 0.0),
                "pickup_location": booking.pickup_address,
                "student_notes": booking.student_notes,
            }
            print(f"🔍 DEBUG - booking_dict keys: {booking_dict.keys()}")
            print(
                f"🔍 DEBUG - student_id_number value: {booking_dict.get('student_id_number')}"
            )
            bookings_list.append(booking_dict)

    return bookings_list


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get booking by ID
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        )

    # Verify user has access to this booking
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    instructor = (
        db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    )

    if student and booking.student_id == student.id:
        return BookingResponse.from_orm(booking)
    elif instructor and booking.instructor_id == instructor.id:
        return BookingResponse.from_orm(booking)
    elif active_role == UserRole.ADMIN.value:
        return BookingResponse.from_orm(booking)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this booking",
        )


@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    booking_data: BookingUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Update a booking (students only, before confirmation)
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        )

    # Verify user is the student who created the booking
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student or booking.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this booking",
        )

    # Can only update pending bookings
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update pending bookings",
        )

    # Update fields
    for field, value in booking_data.dict(exclude_unset=True).items():
        setattr(booking, field, value)

    db.commit()
    db.refresh(booking)

    return BookingResponse.from_orm(booking)


@router.post("/{booking_id}/instructor-reschedule")
async def instructor_reschedule_booking(
    booking_id: int,
    reschedule_data: InstructorRescheduleRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Instructor-initiated reschedule: cancels old booking with 24h policy,
    creates a new booking for the same student at the new time,
    and applies the credit from the old booking automatically.

    The student does not need to pay again — the credit covers the new booking.
    """
    from ..models.booking_credit import BookingCredit, CreditStatus
    from ..routes.availability import is_time_slot_available
    import pytz

    # Verify current user is an instructor
    active_role = get_active_role(current_user)
    instructor = (
        db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    )
    if not instructor and active_role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors or admins can use this endpoint",
        )

    # Get the old booking
    old_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not old_booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        )

    # Verify instructor owns this booking
    if instructor and old_booking.instructor_id != instructor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reschedule this booking",
        )

    # Can only reschedule pending or confirmed bookings
    if old_booking.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only reschedule pending or confirmed bookings",
        )

    # Parse new lesson date
    try:
        new_lesson_date = datetime.fromisoformat(reschedule_data.new_lesson_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use ISO format: YYYY-MM-DDTHH:MM:SS",
        )

    # Validate new slot is available
    sast_tz = pytz.timezone("Africa/Johannesburg")
    slot_start = new_lesson_date
    if slot_start.tzinfo is None:
        slot_start = sast_tz.localize(slot_start)
    slot_end = slot_start + timedelta(minutes=reschedule_data.duration_minutes)

    if not is_time_slot_available(
        old_booking.instructor_id, slot_start, slot_end, db
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected time slot is not available",
        )

    # Calculate 24h policy
    south_africa_offset = timedelta(hours=2)
    if old_booking.lesson_date.tzinfo is None:
        lesson_date_utc = (
            old_booking.lesson_date.replace(tzinfo=timezone.utc)
            - south_africa_offset
        )
    else:
        lesson_date_utc = old_booking.lesson_date

    hours_until_lesson = (
        lesson_date_utc - datetime.now(timezone.utc)
    ).total_seconds() / 3600

    # Mark old booking as RESCHEDULED
    old_booking.status = BookingStatus.RESCHEDULED
    if old_booking.rebooking_count == 0:
        old_booking.original_lesson_date = old_booking.lesson_date
    old_booking.rebooking_count += 1

    # Calculate credit — instructor reschedule = 100% credit, no penalty
    credit_amount = 0.0
    total_paid = old_booking.amount + (old_booking.booking_fee or 0.0)

    if old_booking.payment_status == PaymentStatus.PAID:
        credit_percentage = 1.0
        credit_label = "100%"
        old_booking.cancellation_fee = 0.0

        credit_amount = total_paid * credit_percentage

        # Create credit record
        credit = BookingCredit(
            student_id=old_booking.student_id,
            original_booking_id=old_booking.id,
            credit_amount=credit_amount,
            original_amount=total_paid,
            status=CreditStatus.APPLIED,
            reason="reschedule",
            notes=(
                f"{credit_label} credit (R{credit_amount:.2f}) from instructor-rescheduled "
                f"booking {old_booking.booking_reference}. "
                f"No penalty — instructor initiated. Auto-applied to new booking."
            ),
        )
        db.add(credit)

    # Create the new booking for the same student
    new_booking = Booking(
        booking_reference=f"BK{uuid.uuid4().hex[:8].upper()}",
        student_id=old_booking.student_id,
        instructor_id=old_booking.instructor_id,
        lesson_date=new_lesson_date,
        duration_minutes=reschedule_data.duration_minutes,
        lesson_type="standard",
        pickup_address=reschedule_data.pickup_address,
        pickup_latitude=reschedule_data.pickup_latitude,
        pickup_longitude=reschedule_data.pickup_longitude,
        amount=old_booking.amount,
        booking_fee=old_booking.booking_fee,
        status=BookingStatus.PENDING,
        payment_status=PaymentStatus.PAID,
        payment_method=old_booking.payment_method or "credit",
        payment_id=old_booking.payment_id,
        credit_applied_amount=credit_amount,
    )
    db.add(new_booking)
    db.flush()  # Get the new booking ID

    # Link old booking to new booking
    old_booking.rescheduled_to_booking_id = new_booking.id

    # Mark the credit as applied to this booking
    if credit_amount > 0:
        credit.applied_booking_id = new_booking.id
        credit.applied_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(new_booking)

    # Send notifications to both student and instructor
    try:
        student = db.query(Student).filter(
            Student.id == old_booking.student_id
        ).first()
        student_user = db.query(User).filter(
            User.id == student.user_id
        ).first() if student else None
        instructor_user = db.query(User).filter(
            User.id == current_user.id
        ).first()
        credit_info = (
            f"R{credit_amount:.2f} (100%)" if credit_amount > 0 else "N/A"
        )
        old_date_str = old_booking.lesson_date.strftime("%a %d %b at %H:%M")
        new_date_str = new_lesson_date.strftime("%a %d %b at %H:%M")

        # WhatsApp to student
        if student_user and student_user.phone:
            whatsapp_service.send_message(
                phone=student_user.phone,
                message=(
                    f"📅 *Lesson Rescheduled by Instructor*\n\n"
                    f"Your instructor {instructor_user.first_name} has rescheduled "
                    f"your lesson.\n\n"
                    f"*Old:* {old_date_str}\n"
                    f"*New:* {new_date_str}\n\n"
                    f"Pickup: {reschedule_data.pickup_address}\n\n"
                    f"💰 No penalty applied — full credit ({credit_info}) "
                    f"has been transferred to your new booking. "
                    f"No additional payment is required.\n\n"
                    f"Ref: {new_booking.booking_reference}"
                ),
            )

        # WhatsApp to instructor (confirmation)
        if instructor_user and instructor_user.phone:
            whatsapp_service.send_message(
                phone=instructor_user.phone,
                message=(
                    f"✅ *Lesson Rescheduled*\n\n"
                    f"You have rescheduled the lesson with "
                    f"{student_user.first_name if student_user else 'student'}.\n\n"
                    f"*Old:* {old_date_str}\n"
                    f"*New:* {new_date_str}\n\n"
                    f"The student has been notified. Full credit applied — "
                    f"no additional payment required from the student.\n\n"
                    f"Ref: {new_booking.booking_reference}"
                ),
            )

        # Email to student
        if student_user and student_user.email:
            from ..services.email_service import email_service
            email_service.send_booking_notification_email(
                to_email=student_user.email,
                user_name=student_user.first_name,
                subject="Lesson Rescheduled by Instructor",
                action_type="rescheduled",
                lesson_date=old_date_str,
                instructor_name=instructor_user.first_name if instructor_user else "Instructor",
                student_name=student_user.first_name,
                credit_info=credit_info,
                booking_reference=new_booking.booking_reference,
                is_instructor_initiated=True,
                new_lesson_date=new_date_str,
                pickup_address=reschedule_data.pickup_address,
            )

        # Email to instructor
        if instructor_user and instructor_user.email:
            from ..services.email_service import email_service
            email_service.send_booking_notification_email(
                to_email=instructor_user.email,
                user_name=instructor_user.first_name,
                subject="Lesson Reschedule Confirmation",
                action_type="rescheduled",
                lesson_date=old_date_str,
                instructor_name=instructor_user.first_name,
                student_name=student_user.first_name if student_user else "Student",
                credit_info=credit_info,
                booking_reference=new_booking.booking_reference,
                is_instructor_initiated=True,
                is_recipient_instructor=True,
                new_lesson_date=new_date_str,
                pickup_address=reschedule_data.pickup_address,
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(
            f"Failed to send reschedule notification: {e}"
        )

    return {
        "message": "Booking rescheduled successfully",
        "old_booking_id": old_booking.id,
        "old_booking_reference": old_booking.booking_reference,
        "new_booking": BookingResponse.from_orm(new_booking),
        "credit_applied": credit_amount,
        "penalty_applied": 0.0,
        "hours_until_lesson": round(hours_until_lesson, 1),
    }


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: int,
    cancel_data: BookingCancel,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Cancel a booking.

    Cancellation Policy:
    - Students and instructors can cancel directly. If cancelled within 24 hours
      of the lesson, a 50% cancellation fee applies and the student receives a
      50% credit toward their next booking.
    - If cancelled 24+ hours before the lesson, the student receives a 90% credit.
    - Admins can cancel without restrictions — student receives 100% credit.
    - Credits are automatically applied to the next booking payment.
    - Credits are tracked in the booking_credits table.
    - An optional replacement_booking_id can link the cancellation to a new booking.
    """
    from ..models.booking_credit import BookingCredit, CreditStatus

    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        )

    # Verify user has permission to cancel
    active_role = get_active_role(current_user)
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    instructor = (
        db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    )

    cancelled_by = None
    if student and booking.student_id == student.id:
        cancelled_by = "student"
    elif instructor and booking.instructor_id == instructor.id:
        cancelled_by = "instructor"
    elif active_role == UserRole.ADMIN.value:
        cancelled_by = "admin"
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this booking",
        )

    # Can only cancel confirmed or pending bookings
    if booking.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel pending or confirmed bookings",
        )

    # If a replacement booking is provided, validate it
    if cancel_data.replacement_booking_id:
        replacement = (
            db.query(Booking)
            .filter(Booking.id == cancel_data.replacement_booking_id)
            .first()
        )

        if not replacement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Replacement booking not found",
            )

        if replacement.student_id != booking.student_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Replacement booking must belong to the same student",
            )

        if replacement.status in [BookingStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Replacement booking cannot be a cancelled booking",
            )

        if replacement.id == booking.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Replacement booking cannot be the same as the cancelled booking",
            )

        booking.replacement_booking_id = replacement.id

    # Update booking status
    booking.status = BookingStatus.CANCELLED
    booking.cancelled_at = datetime.now(timezone.utc)
    booking.cancelled_by = cancelled_by
    booking.cancellation_reason = cancel_data.cancellation_reason

    # Calculate credit based on cancellation timing
    south_africa_offset = timedelta(hours=2)

    if booking.lesson_date.tzinfo is None:
        lesson_date_utc = (
            booking.lesson_date.replace(tzinfo=timezone.utc) - south_africa_offset
        )
    else:
        lesson_date_utc = booking.lesson_date

    hours_until_lesson = (
        lesson_date_utc - datetime.now(timezone.utc)
    ).total_seconds() / 3600

    # Credit policy:
    # Admin or instructor cancels = 100% credit (no penalty)
    # Student cancels 24+ hours before lesson = 90% credit
    # Student cancels <24 hours before lesson = 50% credit
    credit_amount = 0.0
    if booking.payment_status == PaymentStatus.PAID:
        # Total paid = lesson fee + booking/admin fee
        total_paid = booking.amount + (booking.booking_fee or 0.0)

        if cancelled_by in ("admin", "instructor"):
            credit_percentage = 1.0
            credit_label = "100%"
            booking.cancellation_fee = 0.0
        elif hours_until_lesson >= 24:
            credit_percentage = 0.9
            credit_label = "90%"
        else:
            credit_percentage = 0.5
            credit_label = "50%"

        credit_amount = total_paid * credit_percentage
        booking.refund_amount = 0  # No cash refund — credit only

        # Create credit record as PENDING — credit only activates when
        # the student makes and pays for a new booking
        credit = BookingCredit(
            student_id=booking.student_id,
            original_booking_id=booking.id,
            credit_amount=credit_amount,
            original_amount=total_paid,
            status=CreditStatus.PENDING,
            reason="cancellation",
            notes=(
                f"{credit_label} credit (R{credit_amount:.2f}) from cancelled booking "
                f"{booking.booking_reference}. "
                f"Cancelled by {cancelled_by}, {hours_until_lesson:.0f} hours before lesson. "
                f"Credit pending until next booking payment."
            ),
        )
        db.add(credit)

    # Send notifications for instructor-initiated cancellations
    if cancelled_by == "instructor":
        try:
            student = db.query(Student).filter(
                Student.id == booking.student_id
            ).first()
            student_user = (
                db.query(User).filter(User.id == student.user_id).first()
                if student else None
            )
            instructor_obj = db.query(Instructor).filter(
                Instructor.id == booking.instructor_id
            ).first()
            instructor_user = (
                db.query(User).filter(User.id == instructor_obj.user_id).first()
                if instructor_obj else None
            )
            lesson_date_str = booking.lesson_date.strftime("%a %d %b at %H:%M")
            credit_info = (
                f"R{credit_amount:.2f} (100%)" if credit_amount > 0 else "N/A"
            )

            # WhatsApp to student
            if student_user and student_user.phone:
                whatsapp_service.send_message(
                    phone=student_user.phone,
                    message=(
                        f"❌ *Lesson Cancelled by Instructor*\n\n"
                        f"Your instructor {current_user.first_name} has cancelled "
                        f"your lesson on {lesson_date_str}.\n\n"
                        f"💰 Full credit of {credit_info} has been issued to your "
                        f"account. This credit will be applied when you book and "
                        f"pay for your next lesson.\n\n"
                        f"Ref: {booking.booking_reference}"
                    ),
                )

            # WhatsApp to instructor (confirmation)
            if instructor_user and instructor_user.phone:
                whatsapp_service.send_message(
                    phone=instructor_user.phone,
                    message=(
                        f"✅ *Lesson Cancelled*\n\n"
                        f"You have cancelled the lesson with "
                        f"{student_user.first_name if student_user else 'student'} "
                        f"on {lesson_date_str}.\n\n"
                        f"The student has been notified and received full credit "
                        f"({credit_info}) for a future booking.\n\n"
                        f"Ref: {booking.booking_reference}"
                    ),
                )

            # Email to student
            if student_user and student_user.email:
                from ..services.email_service import email_service
                email_service.send_booking_notification_email(
                    to_email=student_user.email,
                    user_name=student_user.first_name,
                    subject="Lesson Cancelled by Instructor",
                    action_type="cancelled",
                    lesson_date=lesson_date_str,
                    instructor_name=current_user.first_name,
                    student_name=student_user.first_name,
                    credit_info=credit_info,
                    booking_reference=booking.booking_reference,
                    is_instructor_initiated=True,
                )

            # Email to instructor
            if instructor_user and instructor_user.email:
                from ..services.email_service import email_service
                email_service.send_booking_notification_email(
                    to_email=instructor_user.email,
                    user_name=instructor_user.first_name,
                    subject="Lesson Cancellation Confirmation",
                    action_type="cancelled",
                    lesson_date=lesson_date_str,
                    instructor_name=instructor_user.first_name,
                    student_name=student_user.first_name if student_user else "Student",
                    credit_info=credit_info,
                    booking_reference=booking.booking_reference,
                    is_instructor_initiated=True,
                    is_recipient_instructor=True,
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"Failed to send cancel notifications: {e}"
            )

    db.commit()
    db.refresh(booking)

    return BookingResponse.from_orm(booking)


@router.post("/{booking_id}/confirm", response_model=BookingResponse)
async def confirm_booking(
    booking_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Confirm a booking (instructors only)
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        )

    # Verify user is the instructor
    instructor = (
        db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    )
    if not instructor or booking.instructor_id != instructor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned instructor can confirm this booking",
        )

    # Can only confirm pending bookings with successful payment
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is not pending"
        )

    if booking.payment_status != PaymentStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment must be completed before confirmation",
        )

    booking.status = BookingStatus.CONFIRMED
    db.commit()
    db.refresh(booking)

    return BookingResponse.from_orm(booking)


@router.post("/reviews", response_model=ReviewResponse)
async def create_review(
    review_data: ReviewCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Create a review for a completed booking (students only)
    """
    from ..models.booking import Review

    # Verify user is a student
    active_role = get_active_role(current_user)
    if active_role != UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can create reviews",
        )

    # Get student profile
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found"
        )

    # Get booking
    booking = db.query(Booking).filter(Booking.id == review_data.booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        )

    # Verify student owns this booking
    if booking.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only review your own bookings",
        )

    # Check if booking is completed or in the past
    # Allow reviews if status is COMPLETED or if lesson time has passed
    # Note: lesson_date is stored as naive datetime in local time (SAST = UTC+2)
    # Convert to UTC+2 for proper comparison
    south_africa_offset = timedelta(hours=2)  # SAST is UTC+2

    if booking.lesson_date.tzinfo is None:
        # Naive datetime - treat as SAST (UTC+2)
        lesson_date_utc = (
            booking.lesson_date.replace(tzinfo=timezone.utc) - south_africa_offset
        )
    else:
        lesson_date_utc = booking.lesson_date

    now_utc = datetime.now(timezone.utc)

    if booking.status != BookingStatus.COMPLETED and lesson_date_utc > now_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot review a future lesson",
        )

    # Validate rating
    if review_data.rating < 1 or review_data.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5",
        )

    # Check if review already exists - if so, update it instead of creating new
    existing_review = (
        db.query(Review).filter(Review.booking_id == review_data.booking_id).first()
    )

    if existing_review:
        # Update existing review
        existing_review.rating = review_data.rating
        if review_data.comment:
            existing_review.comment = review_data.comment
        review = existing_review
    else:
        # Create new review
        review = Review(
            booking_id=review_data.booking_id,
            rating=review_data.rating,
            comment=review_data.comment,
        )
        db.add(review)

    # Update instructor's rating
    instructor = (
        db.query(Instructor).filter(Instructor.id == booking.instructor_id).first()
    )
    if instructor:
        # Recalculate average rating from all reviews
        all_reviews = (
            db.query(Review)
            .join(Booking, Review.booking_id == Booking.id)
            .filter(Booking.instructor_id == instructor.id)
            .all()
        )

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
    Reschedule a booking to a new date/time.

    Students and instructors can reschedule their own bookings.
    Admins can reschedule any booking.

    Penalty policy (same as cancellation):
    - 24+ hours before lesson = no penalty
    - <24 hours before lesson = 50% penalty fee
    """
    # Verify user role and find the booking
    active_role = get_active_role(current_user)

    instructor = (
        db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    )
    student = (
        db.query(Student).filter(Student.user_id == current_user.id).first()
    )

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        )

    # Determine who is rescheduling and verify permission
    rescheduled_by = None
    if instructor and booking.instructor_id == instructor.id:
        rescheduled_by = "instructor"
    elif student and booking.student_id == student.id:
        rescheduled_by = "student"
    elif active_role == UserRole.ADMIN.value:
        rescheduled_by = "admin"
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reschedule this booking",
        )

    # Verify booking status allows rescheduling
    if booking.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reschedule a {booking.status} booking",
        )

    # Parse new datetime
    try:
        new_lesson_datetime = datetime.fromisoformat(
            reschedule_data.new_datetime.replace("Z", "+00:00")
        )
        # Make timezone-aware if naive (treat as local SAST time = UTC+2)
        if new_lesson_datetime.tzinfo is None:
            new_lesson_datetime = new_lesson_datetime.replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:MM:SS)",
        )

    # Validate new time is in the future
    if new_lesson_datetime <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New lesson time must be in the future",
        )

    lesson_end = new_lesson_datetime + timedelta(minutes=booking.duration_minutes)
    lesson_date = new_lesson_datetime.date()
    lesson_time = new_lesson_datetime.time()

    # Check for instructor time off
    time_off = (
        db.query(TimeOffException)
        .filter(
            TimeOffException.instructor_id == booking.instructor_id,
            TimeOffException.start_date <= lesson_date,
            TimeOffException.end_date >= lesson_date,
        )
        .all()
    )

    for time_off_entry in time_off:
        if time_off_entry.start_time and time_off_entry.end_time:
            if not (
                lesson_time >= time_off_entry.end_time
                or lesson_end.time() <= time_off_entry.start_time
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Instructor has time off at this time. Reason: {time_off_entry.reason or 'Time off'}",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Instructor has time off on {lesson_date}. Reason: {time_off_entry.reason or 'Time off'}",
            )

    # Check for conflicts with existing bookings (exclude current booking)
    existing_bookings = (
        db.query(Booking)
        .filter(
            Booking.instructor_id == booking.instructor_id,
            Booking.id != booking_id,  # Exclude current booking
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
        .all()
    )

    for existing in existing_bookings:
        # Make existing booking datetime timezone-aware if needed
        existing_lesson_date = existing.lesson_date
        if existing_lesson_date.tzinfo is None:
            existing_lesson_date = existing_lesson_date.replace(tzinfo=timezone.utc)
        existing_end = existing_lesson_date + timedelta(
            minutes=existing.duration_minutes
        )
        # Check for overlap
        if not (
            existing_end <= new_lesson_datetime or existing_lesson_date >= lesson_end
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Time slot conflicts with an existing booking at {existing.lesson_date}",
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
        # Make existing booking datetime timezone-aware if needed
        existing_lesson_date = existing.lesson_date
        if existing_lesson_date.tzinfo is None:
            existing_lesson_date = existing_lesson_date.replace(tzinfo=timezone.utc)
        existing_end = existing_lesson_date + timedelta(
            minutes=existing.duration_minutes
        )
        # Check for overlap
        if not (
            existing_end <= new_lesson_datetime or existing_lesson_date >= lesson_end
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student has another booking at this time",
            )

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
            InstructorSchedule.instructor_id == booking.instructor_id,
            InstructorSchedule.day_of_week == day_name,
            InstructorSchedule.is_active == True,
        )
        .first()
    )

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Instructor is not available on {day_name.lower()}s",
        )

    # Validate time is within schedule
    if lesson_time < schedule.start_time or lesson_end.time() > schedule.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Time {lesson_time} is outside instructor's working hours ({schedule.start_time} - {schedule.end_time})",
        )

    # Store original lesson date if this is the first reschedule
    if booking.rebooking_count == 0:
        booking.original_lesson_date = booking.lesson_date

    # Check if rescheduling within 24 hours of lesson time
    # Note: lesson_date is stored as naive datetime in local time (SAST = UTC+2)
    south_africa_offset = timedelta(hours=2)

    if booking.lesson_date.tzinfo is None:
        lesson_date_utc = (
            booking.lesson_date.replace(tzinfo=timezone.utc) - south_africa_offset
        )
    else:
        lesson_date_utc = booking.lesson_date

    hours_until_lesson = (
        lesson_date_utc - datetime.now(timezone.utc)
    ).total_seconds() / 3600

    # Reschedule penalty policy (same 24h rules as cancellation):
    # 24+ hours before lesson = no penalty
    # <24 hours before lesson = 50% penalty fee applied (on total paid incl. booking fee)
    cancellation_fee = 0.0
    if booking.payment_status == PaymentStatus.PAID and hours_until_lesson < 24:
        total_paid = booking.amount + (booking.booking_fee or 0.0)
        cancellation_fee = total_paid * 0.5
        booking.cancellation_fee = cancellation_fee

    # Increment rebooking count
    booking.rebooking_count += 1

    # Update the booking
    booking.lesson_date = new_lesson_datetime
    db.commit()
    db.refresh(booking)

    return {
        "message": (
            f"Booking rescheduled successfully"
            + (f". A 50% penalty fee of R{cancellation_fee:.2f} was applied for rescheduling within 24 hours."
               if cancellation_fee > 0 else "")
        ),
        "booking_id": booking.id,
        "booking_reference": booking.booking_reference,
        "rescheduled_by": rescheduled_by,
        "rebooking_count": booking.rebooking_count,
        "cancellation_fee": cancellation_fee,
        "new_datetime": new_lesson_datetime.isoformat(),
    }


@router.get("/credits/available")
async def get_available_credits(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get available credits for the current student.
    Credits are earned when cancelling or rescheduling 24+ hours before a lesson.
    """
    from ..models.booking_credit import BookingCredit, CreditStatus

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found"
        )

    credit_records = (
        db.query(BookingCredit)
        .filter(
            BookingCredit.student_id == student.id,
            BookingCredit.status.in_([CreditStatus.AVAILABLE, CreditStatus.PENDING]),
        )
        .all()
    )

    total_available = sum(
        c.credit_amount for c in credit_records if c.status == CreditStatus.AVAILABLE
    )
    total_pending = sum(
        c.credit_amount for c in credit_records if c.status == CreditStatus.PENDING
    )

    return {
        "total_available_credit": total_available,
        "total_pending_credit": total_pending,
        "credits": [
            {
                "id": c.id,
                "credit_amount": c.credit_amount,
                "original_amount": c.original_amount,
                "reason": c.reason,
                "status": c.status.value if c.status else None,
                "notes": c.notes,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "original_booking_id": c.original_booking_id,
            }
            for c in credit_records
        ],
    }


@router.get("/credits/history")
async def get_credit_history(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get full credit history for the current student (available + applied + expired).
    """
    from ..models.booking_credit import BookingCredit

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found"
        )

    credit_records = (
        db.query(BookingCredit)
        .filter(BookingCredit.student_id == student.id)
        .order_by(BookingCredit.created_at.desc())
        .all()
    )

    return {
        "credits": [
            {
                "id": c.id,
                "credit_amount": c.credit_amount,
                "original_amount": c.original_amount,
                "status": c.status.value if c.status else None,
                "reason": c.reason,
                "notes": c.notes,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "applied_at": c.applied_at.isoformat() if c.applied_at else None,
                "original_booking_id": c.original_booking_id,
                "applied_booking_id": c.applied_booking_id,
            }
            for c in credit_records
        ],
    }


@router.post("/credits/reset/{user_id}")
async def reset_student_credits(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Admin-only: Reset (expire) all pending and available credits for a student.
    """
    from ..models.booking_credit import BookingCredit, CreditStatus

    active_role = get_active_role(current_user)
    if active_role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can reset credits",
        )

    # Find the student by user_id
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    student = db.query(Student).filter(Student.user_id == user_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have a student profile",
        )

    # Find all pending/available credits
    credits_to_reset = (
        db.query(BookingCredit)
        .filter(
            BookingCredit.student_id == student.id,
            BookingCredit.status.in_([
                CreditStatus.PENDING, CreditStatus.AVAILABLE
            ]),
        )
        .all()
    )

    if not credits_to_reset:
        return {
            "message": "No active credits found for this student",
            "credits_reset": 0,
            "total_amount_reset": 0.0,
        }

    total_reset = 0.0
    for credit in credits_to_reset:
        total_reset += credit.credit_amount
        credit.status = CreditStatus.EXPIRED
        credit.notes = (
            (credit.notes or "")
            + f" | Reset by admin {current_user.first_name} on "
            + datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        )

    db.commit()

    return {
        "message": (
            f"Reset {len(credits_to_reset)} credit(s) totalling "
            f"R{total_reset:.2f} for {target_user.first_name} "
            f"{target_user.last_name}"
        ),
        "credits_reset": len(credits_to_reset),
        "total_amount_reset": total_reset,
    }
