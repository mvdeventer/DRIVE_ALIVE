"""
Booking routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from datetime import datetime
import uuid

from ..database import get_db
from ..routes.auth import get_current_user
from ..models.user import User, UserRole
from ..models.booking import Booking, BookingStatus, PaymentStatus
from ..models.user import Instructor, Student
from ..schemas.booking import (
    BookingCreate, BookingResponse, BookingUpdate, 
    BookingCancel, ReviewCreate, ReviewResponse
)

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Create a new booking (students only)
    """
    # Verify user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can create bookings"
        )
    
    # Get student profile
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found"
        )
    
    # Verify instructor exists and is available
    instructor = db.query(Instructor).filter(Instructor.id == booking_data.instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    if not instructor.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instructor is not available"
        )
    
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
        payment_status=PaymentStatus.PENDING
    )
    
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    return BookingResponse.from_orm(booking)


@router.get("/", response_model=List[BookingResponse])
async def get_bookings(
    current_user: Annotated[User, Depends(get_current_user)],
    status: Optional[BookingStatus] = Query(None),
    db: Session = Depends(get_db)
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


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Get booking by ID
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this booking"
        )


@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    booking_data: BookingUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Update a booking (students only, before confirmation)
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Verify user is the student who created the booking
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student or booking.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this booking"
        )
    
    # Can only update pending bookings
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update pending bookings"
        )
    
    # Update fields
    for field, value in booking_data.dict(exclude_unset=True).items():
        setattr(booking, field, value)
    
    db.commit()
    db.refresh(booking)
    
    return BookingResponse.from_orm(booking)


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: int,
    cancel_data: BookingCancel,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Cancel a booking
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this booking"
        )
    
    # Can only cancel confirmed or pending bookings
    if booking.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel pending or confirmed bookings"
        )
    
    # Update booking
    booking.status = BookingStatus.CANCELLED
    booking.cancelled_at = datetime.utcnow()
    booking.cancelled_by = cancelled_by
    booking.cancellation_reason = cancel_data.cancellation_reason
    
    # Calculate refund based on cancellation policy (simplified)
    hours_until_lesson = (booking.lesson_date - datetime.utcnow()).total_seconds() / 3600
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
async def confirm_booking(
    booking_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Confirm a booking (instructors only)
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Verify user is the instructor
    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if not instructor or booking.instructor_id != instructor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned instructor can confirm this booking"
        )
    
    # Can only confirm pending bookings with successful payment
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is not pending"
        )
    
    if booking.payment_status != PaymentStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment must be completed before confirmation"
        )
    
    booking.status = BookingStatus.CONFIRMED
    db.commit()
    db.refresh(booking)
    
    return BookingResponse.from_orm(booking)
