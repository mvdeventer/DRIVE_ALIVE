"""
Instructor routes
"""

from datetime import datetime, timezone
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geopy.distance import geodesic
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.booking import Booking, BookingStatus
from ..models.user import Instructor as InstructorModel
from ..models.user import User, UserRole
from ..routes.auth import get_current_user, get_active_role
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
    try:
        query = db.query(InstructorModel).filter(InstructorModel.is_verified == True)

        if available_only:
            query = query.filter(InstructorModel.is_available == True)

        if min_rating:
            query = query.filter(InstructorModel.rating >= min_rating)

        instructors = query.all()

        # Filter by distance if location provided
        if (
            latitude is not None
            and longitude is not None
            and max_distance_km is not None
        ):
            student_location = (latitude, longitude)
            filtered_instructors = []

            for instructor in instructors:
                if instructor.current_latitude and instructor.current_longitude:
                    instructor_location = (
                        instructor.current_latitude,
                        instructor.current_longitude,
                    )
                    distance = geodesic(
                        student_location, instructor_location
                    ).kilometers

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
                    id_number=instructor.id_number,
                    license_number=instructor.license_number,
                    license_types=instructor.license_types,
                    vehicle_registration=instructor.vehicle_registration,
                    vehicle_make=instructor.vehicle_make,
                    vehicle_model=instructor.vehicle_model,
                    vehicle_year=instructor.vehicle_year,
                    province=instructor.province,
                    city=instructor.city,
                    suburb=instructor.suburb,
                    is_available=instructor.is_available,
                    hourly_rate=instructor.hourly_rate,
                    booking_fee=instructor.booking_fee
                    or 20.0,  # Include per-instructor booking fee (default R20)
                    service_radius_km=instructor.service_radius_km,
                    max_travel_distance_km=instructor.max_travel_distance_km,
                    rate_per_km_beyond_radius=instructor.rate_per_km_beyond_radius,
                    bio=instructor.bio,
                    rating=instructor.rating,
                    total_reviews=instructor.total_reviews,
                    is_verified=instructor.is_verified,
                    current_latitude=instructor.current_latitude,
                    current_longitude=instructor.current_longitude,
                )
                responses.append(response)

        return responses
    except Exception as e:
        import traceback

        print(f"ERROR in get_instructors: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me", response_model=InstructorResponse)
async def get_instructor_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get current instructor's profile
    """
    
    active_role = get_active_role(current_user)
    if active_role != UserRole.INSTRUCTOR.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can access instructor profile",
        )

    instructor = (
        db.query(InstructorModel)
        .filter(InstructorModel.user_id == current_user.id)
        .first()
    )

    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found"
        )

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
        id_number=instructor.id_number,
        license_number=instructor.license_number,
        license_types=instructor.license_types,
        vehicle_registration=instructor.vehicle_registration,
        vehicle_make=instructor.vehicle_make,
        vehicle_model=instructor.vehicle_model,
        vehicle_year=instructor.vehicle_year,
        province=instructor.province,
        city=instructor.city,
        suburb=instructor.suburb,
        is_available=instructor.is_available,
        hourly_rate=instructor.hourly_rate,
        booking_fee=instructor.booking_fee
        or 20.0,  # Include booking fee for instructor dashboard
        service_radius_km=instructor.service_radius_km,
        max_travel_distance_km=instructor.max_travel_distance_km,
        rate_per_km_beyond_radius=instructor.rate_per_km_beyond_radius,
        bio=instructor.bio,
        rating=instructor.rating,
        total_reviews=instructor.total_reviews,
        is_verified=instructor.is_verified,
        current_latitude=instructor.current_latitude,
        current_longitude=instructor.current_longitude,
    )


@router.get("/earnings-report", response_model=None)
async def get_earnings_report(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get comprehensive earnings report for the current instructor
    """
    
    active_role = get_active_role(current_user)
    print(
        f"🔍 EARNINGS ENDPOINT CALLED for user: {current_user.email}, active_role: {active_role}"
    )

    if active_role != UserRole.INSTRUCTOR.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can access this endpoint",
        )

    instructor = (
        db.query(InstructorModel)
        .filter(InstructorModel.user_id == current_user.id)
        .first()
    )
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found"
        )

    # Get all bookings for this instructor
    from ..models.user import Student

    bookings = db.query(Booking).filter(Booking.instructor_id == instructor.id).all()

    # Calculate statistics
    completed_bookings = [b for b in bookings if b.status == BookingStatus.COMPLETED]
    pending_bookings = [b for b in bookings if b.status == BookingStatus.PENDING]
    cancelled_bookings = [b for b in bookings if b.status == BookingStatus.CANCELLED]

    total_earnings = sum(float(b.amount) for b in completed_bookings)
    completed_lessons = len(completed_bookings)

    # Calculate earnings by month
    from collections import defaultdict

    earnings_by_month = defaultdict(lambda: {"earnings": 0.0, "lessons": 0})
    for booking in completed_bookings:
        month_key = booking.lesson_date.strftime("%Y-%m")  # Format: "2024-12"
        earnings_by_month[month_key]["earnings"] += float(booking.amount)
        earnings_by_month[month_key]["lessons"] += 1

    # Convert to sorted list (most recent first)
    monthly_breakdown = []
    for month, data in sorted(earnings_by_month.items(), reverse=True):
        # Convert "2024-12" to "December 2024"
        from datetime import datetime

        month_obj = datetime.strptime(month, "%Y-%m")
        month_name = month_obj.strftime("%B %Y")

        monthly_breakdown.append(
            {
                "month": month_name,
                "earnings": data["earnings"],
                "lessons": data["lessons"],
            }
        )

    # Get recent earnings (last 20 completed bookings)
    recent_completed = sorted(
        [b for b in completed_bookings], key=lambda x: x.lesson_date, reverse=True
    )[:20]

    recent_earnings = []
    for booking in recent_completed:
        student = db.query(Student).filter(Student.id == booking.student_id).first()
        student_user = (
            db.query(User).filter(User.id == student.user_id).first()
            if student
            else None
        )

        recent_earnings.append(
            {
                "id": booking.id,
                "student_name": (
                    f"{student_user.first_name} {student_user.last_name}"
                    if student_user
                    else "Unknown"
                ),
                "student_email": student_user.email if student_user else None,
                "student_phone": student_user.phone if student_user else None,
                "student_city": student.city if student else None,
                "student_suburb": student.suburb if student else None,
                "student_id_number": student.id_number if student else None,
                "lesson_date": booking.lesson_date.isoformat(),
                "scheduled_time": booking.lesson_date.isoformat(),
                "duration_minutes": booking.duration_minutes,
                "amount": float(booking.amount),
                "status": booking.status.value,
                "payment_status": (
                    booking.payment_status.value
                    if hasattr(booking, "payment_status")
                    else None
                ),
                "pickup_location": (
                    booking.pickup_address
                    if hasattr(booking, "pickup_address")
                    else None
                ),
            }
        )

    response_data = {
        "total_earnings": total_earnings,
        "hourly_rate": float(instructor.hourly_rate) if instructor.hourly_rate else 0.0,
        "completed_lessons": completed_lessons,
        "pending_lessons": len(pending_bookings),
        "cancelled_lessons": len(cancelled_bookings),
        "total_lessons": len(bookings),
        "earnings_by_month": monthly_breakdown,
        "recent_earnings": recent_earnings,
    }

    print(f"✅ RETURNING EARNINGS DATA: {response_data}")
    return response_data


@router.get("/{instructor_id}", response_model=InstructorResponse)
async def get_instructor(instructor_id: int, db: Session = Depends(get_db)):
    """
    Get instructor by instructor_id (NOT user_id!)
    """
    instructor = (
        db.query(InstructorModel).filter(InstructorModel.id == instructor_id).first()
    )

    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found"
        )

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
        id_number=instructor.id_number,
        license_number=instructor.license_number,
        license_types=instructor.license_types,
        vehicle_registration=instructor.vehicle_registration,
        vehicle_make=instructor.vehicle_make,
        vehicle_model=instructor.vehicle_model,
        vehicle_year=instructor.vehicle_year,
        province=instructor.province,
        city=instructor.city,
        suburb=instructor.suburb,
        is_available=instructor.is_available,
        hourly_rate=instructor.hourly_rate,
        service_radius_km=instructor.service_radius_km,
        max_travel_distance_km=instructor.max_travel_distance_km,
        rate_per_km_beyond_radius=instructor.rate_per_km_beyond_radius,
        bio=instructor.bio,
        rating=instructor.rating,
        total_reviews=instructor.total_reviews,
        is_verified=instructor.is_verified,
        current_latitude=instructor.current_latitude,
        current_longitude=instructor.current_longitude,
    )


@router.get("/by-user/{user_id}", response_model=InstructorResponse)
async def get_instructor_by_user_id(user_id: int, db: Session = Depends(get_db)):
    """
    Get instructor by user_id (for admin looking up instructors by user record)
    """
    # First verify the user exists and is an instructor
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if user.role != UserRole.INSTRUCTOR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User is not an instructor"
        )

    # Now get the instructor record
    instructor = (
        db.query(InstructorModel).filter(InstructorModel.user_id == user_id).first()
    )

    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found"
        )

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
        id_number=instructor.id_number,
        license_number=instructor.license_number,
        license_types=instructor.license_types,
        vehicle_registration=instructor.vehicle_registration,
        vehicle_make=instructor.vehicle_make,
        vehicle_model=instructor.vehicle_model,
        vehicle_year=instructor.vehicle_year,
        province=instructor.province,
        city=instructor.city,
        suburb=instructor.suburb,
        is_available=instructor.is_available,
        hourly_rate=instructor.hourly_rate,
        service_radius_km=instructor.service_radius_km,
        max_travel_distance_km=instructor.max_travel_distance_km,
        rate_per_km_beyond_radius=instructor.rate_per_km_beyond_radius,
        bio=instructor.bio,
        rating=instructor.rating,
        total_reviews=instructor.total_reviews,
        is_verified=instructor.is_verified,
        current_latitude=instructor.current_latitude,
        current_longitude=instructor.current_longitude,
    )


@router.put("/me", response_model=InstructorResponse)
async def update_instructor_profile(
    instructor_data: InstructorUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Update instructor profile (instructors only)
    """
    
    active_role = get_active_role(current_user)
    if active_role != UserRole.INSTRUCTOR.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can update instructor profile",
        )

    instructor = (
        db.query(InstructorModel)
        .filter(InstructorModel.user_id == current_user.id)
        .first()
    )

    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found"
        )

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
        id_number=instructor.id_number,
        license_number=instructor.license_number,
        license_types=instructor.license_types,
        vehicle_registration=instructor.vehicle_registration,
        vehicle_make=instructor.vehicle_make,
        vehicle_model=instructor.vehicle_model,
        vehicle_year=instructor.vehicle_year,
        province=instructor.province,
        city=instructor.city,
        suburb=instructor.suburb,
        is_available=instructor.is_available,
        hourly_rate=instructor.hourly_rate,
        service_radius_km=instructor.service_radius_km,
        max_travel_distance_km=instructor.max_travel_distance_km,
        rate_per_km_beyond_radius=instructor.rate_per_km_beyond_radius,
        bio=instructor.bio,
        rating=instructor.rating,
        total_reviews=instructor.total_reviews,
        is_verified=instructor.is_verified,
        current_latitude=instructor.current_latitude,
        current_longitude=instructor.current_longitude,
    )


@router.put("/me/location", response_model=dict)
async def update_instructor_location(
    location: InstructorLocation,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Update instructor GPS location (instructors only)
    """
    active_role = get_active_role(current_user)
    if active_role != UserRole.INSTRUCTOR.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can update location",
        )

    instructor = (
        db.query(InstructorModel)
        .filter(InstructorModel.user_id == current_user.id)
        .first()
    )

    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found"
        )

    instructor.current_latitude = location.latitude
    instructor.current_longitude = location.longitude

    db.commit()

    return {
        "message": "Location updated successfully",
        "latitude": location.latitude,
        "longitude": location.longitude,
    }


@router.get("/my-bookings")
async def get_my_bookings(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get all bookings for the current instructor
    """
    active_role = get_active_role(current_user)
    if active_role != UserRole.INSTRUCTOR.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can access this endpoint",
        )

    instructor = (
        db.query(InstructorModel)
        .filter(InstructorModel.user_id == current_user.id)
        .first()
    )
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found"
        )

    bookings = (
        db.query(Booking)
        .filter(Booking.instructor_id == instructor.id)
        .order_by(Booking.lesson_date.desc())
        .all()
    )

    bookings_list = []
    for booking in bookings:
        from ..models.user import Student

        student = db.query(Student).filter(Student.id == booking.student_id).first()
        student_user = (
            db.query(User).filter(User.id == student.user_id).first()
            if student
            else None
        )

        booking_dict = {
            "id": booking.id,
            "booking_reference": booking.booking_reference,
            "student_name": (
                f"{student_user.first_name} {student_user.last_name}"
                if student_user
                else "Unknown"
            ),
            "scheduled_time": booking.lesson_date.isoformat(),
            "duration_minutes": booking.duration_minutes,
            "status": booking.status.value,
            "payment_status": booking.payment_status.value,
            "total_price": float(booking.amount),
            "pickup_location": booking.pickup_address,
            "rebooking_count": (
                booking.rebooking_count if booking.rebooking_count else 0
            ),
            "cancellation_fee": (
                float(booking.cancellation_fee) if booking.cancellation_fee else 0.0
            ),
            "original_lesson_date": (
                booking.original_lesson_date.isoformat()
                if booking.original_lesson_date
                else None
            ),
        }
        bookings_list.append(booking_dict)

    return bookings_list


@router.put("/availability")
async def update_availability(
    availability_data: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Update instructor availability status
    """
    active_role = get_active_role(current_user)
    if active_role != UserRole.INSTRUCTOR.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can update availability",
        )

    instructor = (
        db.query(InstructorModel)
        .filter(InstructorModel.user_id == current_user.id)
        .first()
    )
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found"
        )

    instructor.is_available = availability_data.get(
        "is_available", instructor.is_available
    )
    db.commit()

    return {
        "message": "Availability updated successfully",
        "is_available": instructor.is_available,
    }


# ==================== Admin Routes ====================


@router.post("/{instructor_id}/verify", response_model=dict)
async def verify_instructor(
    instructor_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Verify an instructor (Admin only)
    TODO: Implement proper admin role checking
    """
    # TODO: Add admin role check when admin functionality is implemented
    # For now, only allow instructors to verify themselves (temporary for development)

    instructor = (
        db.query(InstructorModel).filter(InstructorModel.id == instructor_id).first()
    )
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found"
        )

    # Update verification status
    instructor.is_verified = True
    instructor.verified_at = datetime.now(timezone.utc)
    db.commit()

    user = db.query(User).filter(User.id == instructor.user_id).first()

    return {
        "message": "Instructor verified successfully",
        "instructor_id": instructor.id,
        "instructor_name": f"{user.first_name} {user.last_name}",
        "verified_at": instructor.verified_at.isoformat(),
    }


@router.post("/{instructor_id}/unverify", response_model=dict)
async def unverify_instructor(
    instructor_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Unverify an instructor (Admin only)
    TODO: Implement proper admin role checking
    """
    # TODO: Add admin role check when admin functionality is implemented

    instructor = (
        db.query(InstructorModel).filter(InstructorModel.id == instructor_id).first()
    )
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found"
        )

    # Update verification status
    instructor.is_verified = False
    instructor.verified_at = None
    db.commit()

    user = db.query(User).filter(User.id == instructor.user_id).first()

    return {
        "message": "Instructor unverified successfully",
        "instructor_id": instructor.id,
        "instructor_name": f"{user.first_name} {user.last_name}",
    }


@router.get("/unverified/list", response_model=List[InstructorResponse])
async def get_unverified_instructors(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get list of unverified instructors (Admin only)
    TODO: Implement proper admin role checking
    """
    # TODO: Add admin role check when admin functionality is implemented

    # Query unverified instructors
    instructors = (
        db.query(InstructorModel).filter(InstructorModel.is_verified == False).all()
    )

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
                id_number=instructor.id_number,
                license_number=instructor.license_number,
                license_types=instructor.license_types,
                vehicle_registration=instructor.vehicle_registration,
                vehicle_make=instructor.vehicle_make,
                vehicle_model=instructor.vehicle_model,
                vehicle_year=instructor.vehicle_year,
                province=instructor.province,
                city=instructor.city,
                suburb=instructor.suburb,
                is_available=instructor.is_available,
                hourly_rate=instructor.hourly_rate,
                service_radius_km=instructor.service_radius_km,
                max_travel_distance_km=instructor.max_travel_distance_km,
                rate_per_km_beyond_radius=instructor.rate_per_km_beyond_radius,
                bio=instructor.bio,
                rating=instructor.rating,
                total_reviews=instructor.total_reviews,
                is_verified=instructor.is_verified,
                current_latitude=instructor.current_latitude,
                current_longitude=instructor.current_longitude,
            )
            responses.append(response)

    return responses
    return responses
    return responses
