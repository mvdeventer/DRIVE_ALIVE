"""
Instructor routes
"""

from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geopy.distance import geodesic
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.booking import Booking
from ..models.user import Instructor as InstructorModel
from ..models.user import User, UserRole
from ..routes.auth import get_current_user
from ..schemas.booking import BookingResponse
from ..schemas.user import InstructorLocation, InstructorResponse, InstructorUpdate

router = APIRouter(prefix="/instructors", tags=["Instructors"])


@router.get("/", response_model=List[InstructorResponse])
async def get_instructors(
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    max_distance_km: Optional[float] = Query(None, ge=0),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    available_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    """
    Get list of instructors with optional filters
    """
    query = db.query(InstructorModel).filter(InstructorModel.is_verified == True)

    if available_only:
        query = query.filter(InstructorModel.is_available == True)

    if min_rating:
        query = query.filter(InstructorModel.rating >= min_rating)

    instructors = query.all()

    # Filter by distance if location provided
    if latitude is not None and longitude is not None and max_distance_km is not None:
        student_location = (latitude, longitude)
        filtered_instructors = []

        for instructor in instructors:
            if instructor.current_latitude and instructor.current_longitude:
                instructor_location = (instructor.current_latitude, instructor.current_longitude)
                distance = geodesic(student_location, instructor_location).kilometers

                if distance <= max_distance_km:
                    filtered_instructors.append(instructor)

        instructors = filtered_instructors

    # Build responses
    responses = []
    for instructor in instructors:
        user = db.query(User).filter(User.id == instructor.user_id).first()
        if user:
            response = InstructorResponse(
                id=user.id,
                email=user.email,
                phone=user.phone,
                first_name=user.first_name,
                last_name=user.last_name,
                role=user.role,
                status=user.status,
                created_at=user.created_at,
                instructor_id=instructor.id,
                license_number=instructor.license_number,
                vehicle_registration=instructor.vehicle_registration,
                vehicle_make=instructor.vehicle_make,
                vehicle_model=instructor.vehicle_model,
                vehicle_year=instructor.vehicle_year,
                is_available=instructor.is_available,
                hourly_rate=instructor.hourly_rate,
                rating=instructor.rating,
                total_reviews=instructor.total_reviews,
                is_verified=instructor.is_verified,
                current_latitude=instructor.current_latitude,
                current_longitude=instructor.current_longitude,
            )
            responses.append(response)

    return responses


@router.get("/{instructor_id}", response_model=InstructorResponse)
async def get_instructor(instructor_id: int, db: Session = Depends(get_db)):
    """
    Get instructor by ID
    """
    instructor = db.query(InstructorModel).filter(InstructorModel.id == instructor_id).first()

    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found")

    user = db.query(User).filter(User.id == instructor.user_id).first()

    return InstructorResponse(
        id=user.id,
        email=user.email,
        phone=user.phone,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        status=user.status,
        created_at=user.created_at,
        instructor_id=instructor.id,
        license_number=instructor.license_number,
        vehicle_registration=instructor.vehicle_registration,
        vehicle_make=instructor.vehicle_make,
        vehicle_model=instructor.vehicle_model,
        vehicle_year=instructor.vehicle_year,
        is_available=instructor.is_available,
        hourly_rate=instructor.hourly_rate,
        rating=instructor.rating,
        total_reviews=instructor.total_reviews,
        is_verified=instructor.is_verified,
        current_latitude=instructor.current_latitude,
        current_longitude=instructor.current_longitude,
    )


@router.put("/me", response_model=InstructorResponse)
async def update_instructor_profile(
    instructor_data: InstructorUpdate, current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)
):
    """
    Update instructor profile (instructors only)
    """
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can update instructor profile")

    instructor = db.query(InstructorModel).filter(InstructorModel.user_id == current_user.id).first()

    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    # Update fields
    for field, value in instructor_data.dict(exclude_unset=True).items():
        setattr(instructor, field, value)

    db.commit()
    db.refresh(instructor)

    return InstructorResponse(
        id=current_user.id,
        email=current_user.email,
        phone=current_user.phone,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role,
        status=current_user.status,
        created_at=current_user.created_at,
        instructor_id=instructor.id,
        license_number=instructor.license_number,
        vehicle_registration=instructor.vehicle_registration,
        vehicle_make=instructor.vehicle_make,
        vehicle_model=instructor.vehicle_model,
        vehicle_year=instructor.vehicle_year,
        is_available=instructor.is_available,
        hourly_rate=instructor.hourly_rate,
        rating=instructor.rating,
        total_reviews=instructor.total_reviews,
        is_verified=instructor.is_verified,
        current_latitude=instructor.current_latitude,
        current_longitude=instructor.current_longitude,
    )


@router.put("/me/location", response_model=dict)
async def update_instructor_location(
    location: InstructorLocation, current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)
):
    """
    Update instructor GPS location (instructors only)
    """
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can update location")

    instructor = db.query(InstructorModel).filter(InstructorModel.user_id == current_user.id).first()

    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    instructor.current_latitude = location.latitude
    instructor.current_longitude = location.longitude

    db.commit()

    return {"message": "Location updated successfully", "latitude": location.latitude, "longitude": location.longitude}


@router.get("/my-bookings")
async def get_my_bookings(current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)):
    """
    Get all bookings for the current instructor
    """
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can access this endpoint")

    instructor = db.query(InstructorModel).filter(InstructorModel.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    bookings = db.query(Booking).filter(Booking.instructor_id == instructor.id).order_by(Booking.lesson_date.desc()).all()

    bookings_list = []
    for booking in bookings:
        from ..models.user import Student

        student = db.query(Student).filter(Student.id == booking.student_id).first()
        student_user = db.query(User).filter(User.id == student.user_id).first() if student else None

        booking_dict = {
            "id": booking.id,
            "student_name": f"{student_user.first_name} {student_user.last_name}" if student_user else "Unknown",
            "scheduled_time": booking.lesson_date.isoformat(),
            "duration_minutes": booking.duration_minutes,
            "status": booking.status.value,
            "payment_status": booking.payment_status.value,
            "total_price": float(booking.amount),
            "pickup_location": booking.pickup_address,
        }
        bookings_list.append(booking_dict)

    return bookings_list


@router.put("/availability")
async def update_availability(availability_data: dict, current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)):
    """
    Update instructor availability status
    """
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can update availability")

    instructor = db.query(InstructorModel).filter(InstructorModel.user_id == current_user.id).first()
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    instructor.is_available = availability_data.get("is_available", instructor.is_available)
    db.commit()

    return {"message": "Availability updated successfully", "is_available": instructor.is_available}
