"""
Instructor routes
"""

from datetime import datetime, timezone

from pydantic import BaseModel
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geopy.distance import geodesic
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..middleware.admin import require_admin
from ..middleware.admin import require_admin
from ..models.booking import Booking, BookingStatus
from ..models.user import Instructor as InstructorModel
from ..models.user import User, UserRole
from ..routes.auth import get_current_user, get_active_role
from ..models.company import Company
from ..models.company_invite import (
    CompanyInstructorInvite,
    InviteDirection,
    InviteStatus,
)
from ..services.company_service import resolve_managed_company_id
from ..services.recruitment_service import (
    accept_invite,
    assert_instructor_can_join,
    assert_invite_open,
    find_invite_by_token,
    leave_company,
)
from ..services.fees import get_platform_commission_percent, resolve_student_price
from ..schemas.user import InstructorLocation, InstructorResponse, InstructorUpdate

router = APIRouter(prefix="/instructors", tags=["Instructors"])


#: Fields nobody outside the instructor and the administrators may receive.
#:
#: Two separate reasons, both load-bearing:
#:
#: *Margin.* ``hourly_rate`` is the instructor's base. Publishing it beside
#: ``display_hourly_rate`` would let anyone subtract one from the other and
#: read the school's markup, which the whole pricing design exists to keep
#: private. The platform's cut is withheld for the same reason.
#:
#: *Identity.* An ID number, a driving licence number and a vehicle
#: registration identify a real person. These endpoints are reachable
#: without signing in (see middleware/public_routes.py), so anything left in
#: the response is published to the internet — a South African ID number
#: encodes date of birth and is used as an identity credential, which makes
#: this a POPIA matter rather than a preference. The student interface
#: renders none of them; the make and model of the car stay, because
#: learners search on those and a car model identifies nobody.
#:
#: Pydantic serialises unset fields with their defaults, so these must be
#: excluded rather than merely left unset.
PUBLIC_HIDDEN_INSTRUCTOR_FIELDS = {
    # Margin
    "hourly_rate",
    "platform_commission_percent",
    # Identity
    "id_number",
    "license_number",
    "vehicle_registration",
}


@router.get(
    "/",
    response_model=List[InstructorResponse],
    response_model_exclude={"__all__": PUBLIC_HIDDEN_INSTRUCTOR_FIELDS},
)
async def get_instructors(
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    max_distance_km: Optional[float] = Query(None, ge=0),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    available_only: bool = Query(True),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Get list of instructors with optional filters.

    Performance: eager-loads the related ``User`` row via ``joinedload`` to avoid
    an N+1 query (previously issued one ``SELECT user`` per instructor).
    Supports ``limit``/``offset`` pagination (default 100, max 500).
    """
    try:
        query = (
            db.query(InstructorModel)
            .options(joinedload(InstructorModel.user))
            .filter(InstructorModel.is_verified == True)
        )

        if available_only:
            query = query.filter(InstructorModel.is_available == True)

        if min_rating:
            query = query.filter(InstructorModel.rating >= min_rating)

        # When no geo filter we can paginate at the DB level
        geo_filter_active = (
            latitude is not None
            and longitude is not None
            and max_distance_km is not None
        )
        if not geo_filter_active:
            query = query.offset(offset).limit(limit)

        instructors = query.all()

        # Filter by distance if location provided
        if geo_filter_active:
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

            instructors = filtered_instructors[offset : offset + limit]

        # Build responses (user is already loaded via joinedload — no extra queries)
        responses = []
        for instructor in instructors:
            user = instructor.user
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
                    # One number, already inclusive of the school's markup.
                    # platform_commission_percent is withheld:
                    # this endpoint is public and students must not be able to
                    # reconstruct the split.
                    display_hourly_rate=resolve_student_price(instructor, 60)[2],
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
        platform_commission_percent=get_platform_commission_percent(db),
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

    # Bulk-load students and their users to avoid N+1 queries
    _student_ids = [b.student_id for b in recent_completed if b.student_id]
    _students_by_id = (
        {s.id: s for s in db.query(Student).filter(Student.id.in_(_student_ids)).all()}
        if _student_ids else {}
    )
    _student_user_ids = [s.user_id for s in _students_by_id.values()]
    _student_users_by_id = (
        {u.id: u for u in db.query(User).filter(User.id.in_(_student_user_ids)).all()}
        if _student_user_ids else {}
    )

    recent_earnings = []
    for booking in recent_completed:
        student = _students_by_id.get(booking.student_id)
        student_user = _student_users_by_id.get(student.user_id) if student else None

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

    return response_data


@router.get(
    "/{instructor_id}",
    response_model=InstructorResponse,
    response_model_exclude=PUBLIC_HIDDEN_INSTRUCTOR_FIELDS,
)
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
        display_hourly_rate=resolve_student_price(instructor, 60)[2],
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
async def get_instructor_by_user_id(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get instructor by user_id (for admin looking up instructors by user record)

    Unlike the public detail route this returns the instructor's own rate and
    identity documents, so it is limited to the instructor themselves and to
    administrators.
    """
    if user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only view your own instructor profile.",
        )

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
    current_admin: Annotated[User, Depends(require_admin)],
    current_user: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Verify an instructor (Admin only)
    """

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
    current_admin: Annotated[User, Depends(require_admin)],
    current_user: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Unverify an instructor (Admin only)
    """

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
    current_admin: Annotated[User, Depends(require_admin)],
    current_user: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Get list of unverified instructors (Admin only)
    """

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


# ==================== Instructor Company Management ====================


def _require_company_authority(db: Session, user: User) -> int:
    """Return the company the caller may manage, or raise 403.

    The company id comes from the caller's own profile — never from a request
    parameter — so one school cannot act on another's records.
    """
    company_id = resolve_managed_company_id(db, user)
    if company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "COMPANY_AUTHORITY_REQUIRED",
                "message": "You do not manage a driving school.",
            },
        )
    return company_id


@router.get("/company/my-instructors")
async def get_my_company_instructors(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    List the instructors belonging to the caller's school.

    Open to a company administrator or, for schools created before that role
    existed, the instructor who owns the company.
    """
    company_id = _require_company_authority(db, current_user)

    # A company administrator has no instructor profile to exclude; an
    # instructor-owner should not see themselves in their own roster.
    self_instructor = (
        db.query(InstructorModel)
        .filter(InstructorModel.user_id == current_user.id)
        .first()
    )

    query = db.query(InstructorModel).filter(InstructorModel.company_id == company_id)
    if self_instructor is not None:
        query = query.filter(InstructorModel.id != self_instructor.id)
    members = query.all()

    result = []
    for member in members:
        member_user = db.query(User).filter(User.id == member.user_id).first()
        if member_user:
            result.append(
                {
                    "id": member.id,
                    "user_id": member_user.id,
                    "full_name": member_user.full_name,
                    "email": member_user.email,
                    "phone": member_user.phone,
                    "license_number": member.license_number,
                    "license_types": member.license_types,
                    "verification_status": getattr(member, "verification_status", None),
                    "is_verified": member.is_verified,
                    "created_at": member_user.created_at.isoformat() if member_user.created_at else None,
                }
            )
    return result


@router.post("/company/instructors/{instructor_id}/verify")
async def company_verify_instructor(
    instructor_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Approve a pending instructor who applied to the caller's school.

    Changes status from 'pending_company' → 'verified'.
    """
    from ..models.user import InstructorVerificationStatus as IVS

    company_id = _require_company_authority(db, current_user)

    member = db.query(InstructorModel).filter(InstructorModel.id == instructor_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found")
    if member.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Instructor is not part of your company",
        )

    member_user = db.query(User).filter(User.id == member.user_id).first()

    member.verification_status = IVS.VERIFIED.value
    member.is_verified = True
    if member_user:
        from ..models.user import UserStatus as US
        member_user.status = US.ACTIVE
    db.commit()

    return {
        "status": "verified",
        "instructor_id": instructor_id,
    }


@router.post("/company/instructors/{instructor_id}/reject")
async def company_reject_instructor(
    instructor_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Reject a pending instructor who applied to the caller's school.

    Changes status to 'rejected'.
    """
    from ..models.user import InstructorVerificationStatus as IVS

    company_id = _require_company_authority(db, current_user)

    member = db.query(InstructorModel).filter(InstructorModel.id == instructor_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found")
    if member.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Instructor is not part of your company",
        )

    member.verification_status = IVS.REJECTED.value
    member.is_verified = False
    db.commit()

    return {
        "status": "rejected",
        "instructor_id": instructor_id,
    }


# ==================== Joining and leaving a school ====================


class JoinRequest(BaseModel):
    """Ask a driving school to take you on."""

    company_id: int


def _my_instructor(db: Session, user: User) -> InstructorModel:
    instructor = (
        db.query(InstructorModel).filter(InstructorModel.user_id == user.id).first()
    )
    if instructor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "INSTRUCTOR_PROFILE_REQUIRED",
                "message": "You need an instructor profile to do that.",
            },
        )
    return instructor


def _offer_view(db: Session, invite: CompanyInstructorInvite) -> dict:
    company = db.query(Company).filter(Company.id == invite.company_id).first()
    return {
        "id": invite.id,
        "company_id": invite.company_id,
        "company_name": company.name if company else None,
        "direction": invite.direction,
        "status": invite.status,
        "markup_type": invite.proposed_markup_type,
        "markup_value": invite.proposed_markup_value,
        "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
        "is_open": invite.is_valid(),
    }


@router.get("/invites/token/{token}")
async def preview_invite(token: str, db: Session = Depends(get_db)):
    """Show the terms behind an invitation link.

    Unauthenticated on purpose: the recipient may not have an account yet and
    needs to see who is inviting them before deciding to register. The token
    is unguessable and this returns no personal data beyond the school's name.
    """
    invite = find_invite_by_token(db, token)
    return _offer_view(db, invite)


@router.get("/invites")
async def list_my_invites(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Invitations addressed to me, newest first."""
    instructor = (
        db.query(InstructorModel)
        .filter(InstructorModel.user_id == current_user.id)
        .first()
    )
    query = db.query(CompanyInstructorInvite).filter(
        CompanyInstructorInvite.email == current_user.email
    )
    if instructor is not None:
        query = db.query(CompanyInstructorInvite).filter(
            (CompanyInstructorInvite.email == current_user.email)
            | (CompanyInstructorInvite.instructor_id == instructor.id)
        )

    invites = query.order_by(CompanyInstructorInvite.id.desc()).all()
    return {"invites": [_offer_view(db, invite) for invite in invites]}


@router.post("/invites/token/{token}/accept")
async def accept_school_invite(
    token: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Join the school that invited me."""
    invite = find_invite_by_token(db, token)
    assert_invite_open(invite)

    if invite.direction != InviteDirection.INVITE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVITE_NOT_FOR_YOU",
                "message": "That request is awaiting the school, not you.",
            },
        )

    # The invitation is addressed to an email; only that person may take it up.
    if invite.email.lower() != (current_user.email or "").lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "INVITE_NOT_FOR_YOU",
                "message": "That invitation was sent to a different email address.",
            },
        )

    instructor = _my_instructor(db, current_user)
    assert_instructor_can_join(instructor)
    accept_invite(db, invite, instructor)
    db.commit()
    db.refresh(instructor)

    company = db.query(Company).filter(Company.id == instructor.company_id).first()
    return {
        "joined": True,
        "company_id": instructor.company_id,
        "company_name": company.name if company else None,
        "verification_status": instructor.verification_status,
    }


@router.post("/invites/token/{token}/decline")
async def decline_school_invite(
    token: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Turn down an invitation."""
    invite = find_invite_by_token(db, token)
    assert_invite_open(invite)

    if invite.email.lower() != (current_user.email or "").lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "INVITE_NOT_FOR_YOU",
                "message": "That invitation was sent to a different email address.",
            },
        )

    invite.status = InviteStatus.DECLINED.value
    invite.responded_at = datetime.now(timezone.utc)
    db.commit()
    return _offer_view(db, invite)


@router.post("/me/company-requests", status_code=status.HTTP_201_CREATED)
async def request_to_join_company(
    payload: JoinRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Ask a school to take me on.

    The mirror image of an invitation: the school answers it through
    ``POST /company/invites/{id}/approve``.
    """
    instructor = _my_instructor(db, current_user)
    assert_instructor_can_join(instructor)

    company = (
        db.query(Company)
        .filter(Company.id == payload.company_id, Company.is_active.is_(True))
        .first()
    )
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "COMPANY_NOT_FOUND",
                "message": "That driving school is not available.",
            },
        )

    existing = (
        db.query(CompanyInstructorInvite)
        .filter(
            CompanyInstructorInvite.company_id == company.id,
            CompanyInstructorInvite.instructor_id == instructor.id,
            CompanyInstructorInvite.status == InviteStatus.PENDING.value,
        )
        .first()
    )
    if existing is not None and existing.is_valid():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "INVITE_ALREADY_PENDING",
                "message": "You have already asked to join this school.",
            },
        )

    invite = CompanyInstructorInvite(
        company_id=company.id,
        invited_by_user_id=current_user.id,
        direction=InviteDirection.REQUEST.value,
        email=current_user.email,
        instructor_id=instructor.id,
        token=CompanyInstructorInvite.generate_token(),
        status=InviteStatus.PENDING.value,
        # The school sets the terms when it approves.
        proposed_markup_type=None,
        proposed_markup_value=0.0,
        expires_at=CompanyInstructorInvite.get_expiration_time(),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return _offer_view(db, invite)


@router.post("/me/leave-company")
async def leave_my_company(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Leave my school.

    Existing bookings keep the price they were made at — they carry their own
    snapshot — so leaving cannot rewrite anybody's history.
    """
    instructor = _my_instructor(db, current_user)
    leave_company(db, instructor)
    db.commit()
    return {"left": True, "instructor_id": instructor.id}
