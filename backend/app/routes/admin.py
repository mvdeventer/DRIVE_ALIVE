"""
Admin dashboard routes for system management
"""

from datetime import datetime, timezone
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.admin import require_admin
from ..models.booking import Booking, BookingStatus
from ..models.user import Instructor, Student, User, UserRole, UserStatus
from ..schemas.admin import (
    AdminCreateRequest,
    AdminStats,
    BookingOverview,
    InstructorVerificationRequest,
    InstructorVerificationResponse,
    RevenueStats,
    UserManagementResponse,
)
from ..schemas.user import UserResponse
from ..utils.auth import get_password_hash

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


# ==================== Admin Management ====================


@router.post("/create", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_admin(
    admin_data: AdminCreateRequest,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Create a new admin user (requires existing admin privileges)
    """
    # Check if email or phone already exists
    existing_user = db.query(User).filter((User.email == admin_data.email) | (User.phone == admin_data.phone)).first()

    if existing_user:
        if existing_user.email == admin_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email already registered: {admin_data.email}",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Phone number already registered: {admin_data.phone}",
            )

    # Create admin user
    new_admin = User(
        email=admin_data.email,
        phone=admin_data.phone,
        password_hash=get_password_hash(admin_data.password),
        first_name=admin_data.first_name,
        last_name=admin_data.last_name,
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    return new_admin


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Get overall system statistics
    """
    # User counts
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.status == UserStatus.ACTIVE).count()
    total_instructors = db.query(User).filter(User.role == UserRole.INSTRUCTOR).count()
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()

    # Instructor verification stats
    verified_instructors = db.query(Instructor).filter(Instructor.is_verified == True).count()
    pending_verification = db.query(Instructor).filter(Instructor.is_verified == False).count()

    # Booking stats
    total_bookings = db.query(Booking).count()
    pending_bookings = db.query(Booking).filter(Booking.status == BookingStatus.PENDING).count()
    completed_bookings = db.query(Booking).filter(Booking.status == BookingStatus.COMPLETED).count()
    cancelled_bookings = db.query(Booking).filter(Booking.status == BookingStatus.CANCELLED).count()

    # Revenue stats (completed bookings only)
    revenue_result = db.query(func.sum(Booking.amount)).filter(Booking.status == BookingStatus.COMPLETED).scalar()
    total_revenue = float(revenue_result) if revenue_result else 0.0

    # Calculate average booking value
    avg_booking_value = total_revenue / completed_bookings if completed_bookings > 0 else 0.0

    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        total_instructors=total_instructors,
        total_students=total_students,
        verified_instructors=verified_instructors,
        pending_verification=pending_verification,
        total_bookings=total_bookings,
        pending_bookings=pending_bookings,
        completed_bookings=completed_bookings,
        cancelled_bookings=cancelled_bookings,
        total_revenue=total_revenue,
        avg_booking_value=avg_booking_value,
    )


# ==================== Instructor Verification ====================


@router.get("/instructors/pending-verification", response_model=List[InstructorVerificationResponse])
async def get_pending_instructors(
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """
    Get list of instructors pending verification
    """
    instructors = db.query(Instructor).filter(Instructor.is_verified == False).offset(skip).limit(limit).all()

    result = []
    for instructor in instructors:
        user = db.query(User).filter(User.id == instructor.user_id).first()
        if user:
            result.append(
                InstructorVerificationResponse(
                    id=instructor.id,
                    user_id=user.id,
                    email=user.email,
                    phone=user.phone,
                    full_name=user.full_name,
                    license_number=instructor.license_number,
                    license_types=instructor.license_types,
                    id_number=instructor.id_number,
                    vehicle_registration=instructor.vehicle_registration,
                    vehicle_make=instructor.vehicle_make,
                    vehicle_model=instructor.vehicle_model,
                    vehicle_year=instructor.vehicle_year,
                    is_verified=instructor.is_verified,
                    created_at=user.created_at,
                )
            )

    return result


@router.post("/instructors/{instructor_id}/verify", response_model=InstructorVerificationResponse)
async def verify_instructor(
    instructor_id: int,
    verification_data: InstructorVerificationRequest,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Verify or reject an instructor's registration
    """
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found",
        )

    user = db.query(User).filter(User.id == instructor.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Update verification status
    instructor.is_verified = verification_data.is_verified

    # If rejecting, optionally deactivate the account
    if not verification_data.is_verified and verification_data.deactivate_account:
        user.status = UserStatus.SUSPENDED

    db.commit()
    db.refresh(instructor)
    db.refresh(user)

    return InstructorVerificationResponse(
        id=instructor.id,
        user_id=user.id,
        email=user.email,
        phone=user.phone,
        full_name=user.full_name,
        license_number=instructor.license_number,
        license_types=instructor.license_types,
        id_number=instructor.id_number,
        vehicle_registration=instructor.vehicle_registration,
        vehicle_make=instructor.vehicle_make,
        vehicle_model=instructor.vehicle_model,
        vehicle_year=instructor.vehicle_year,
        is_verified=instructor.is_verified,
        created_at=user.created_at,
    )


# ==================== User Management ====================


@router.get("/users", response_model=List[UserManagementResponse])
async def get_all_users(
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
    role: Optional[UserRole] = Query(None),
    status: Optional[UserStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """
    Get list of all users with filtering options
    """
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)

    users = query.offset(skip).limit(limit).all()

    return [
        UserManagementResponse(
            id=user.id,
            email=user.email,
            phone=user.phone,
            full_name=user.full_name,
            role=user.role,
            status=user.status,
            created_at=user.created_at,
            last_login=user.last_login,
        )
        for user in users
    ]


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    new_status: UserStatus,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Activate, deactivate, or suspend a user account
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent admin from deactivating themselves
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own account status",
        )

    old_status = user.status
    user.status = new_status
    db.commit()
    db.refresh(user)

    return {
        "message": f"User status updated from {old_status.value} to {new_status.value}",
        "user_id": user_id,
        "new_status": new_status.value,
    }


# ==================== Booking Oversight ====================


@router.get("/bookings", response_model=List[BookingOverview])
async def get_all_bookings(
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
    status_filter: Optional[BookingStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """
    Get overview of all bookings with optional status filter
    """
    query = db.query(Booking)

    if status_filter:
        query = query.filter(Booking.status == status_filter)

    bookings = query.order_by(Booking.lesson_date.desc()).offset(skip).limit(limit).all()

    result = []
    for booking in bookings:
        student = db.query(Student).filter(Student.id == booking.student_id).first()
        instructor = db.query(Instructor).filter(Instructor.id == booking.instructor_id).first()

        student_user = db.query(User).filter(User.id == student.user_id).first() if student else None
        instructor_user = db.query(User).filter(User.id == instructor.user_id).first() if instructor else None

        result.append(
            BookingOverview(
                id=booking.id,
                student_id=booking.student_id,
                student_name=student_user.full_name if student_user else "Unknown",
                student_id_number=student.id_number if student else "Unknown",
                instructor_id=booking.instructor_id,
                instructor_name=instructor_user.full_name if instructor_user else "Unknown",
                instructor_id_number=instructor.id_number if instructor else "Unknown",
                lesson_date=booking.lesson_date,
                duration_minutes=booking.duration_minutes,
                lesson_type=booking.lesson_type,
                pickup_address=booking.pickup_address,
                dropoff_address=booking.dropoff_address,
                status=booking.status,
                amount=booking.amount,
                created_at=booking.created_at,
            )
        )

    return result


@router.delete("/bookings/{booking_id}")
async def cancel_booking_admin(
    booking_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Admin: Cancel a booking (conflict resolution)
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    # Update booking status
    old_status = booking.status
    booking.status = BookingStatus.CANCELLED
    booking.cancellation_reason = "Cancelled by admin"
    booking.cancelled_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "message": "Booking cancelled successfully by admin",
        "booking_id": booking_id,
        "previous_status": old_status.value,
    }


# ==================== Revenue & Analytics ====================


@router.get("/revenue/stats", response_model=RevenueStats)
async def get_revenue_stats(
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Get detailed revenue statistics
    """
    # Total revenue from completed bookings
    total_revenue_result = db.query(func.sum(Booking.amount)).filter(Booking.status == BookingStatus.COMPLETED).scalar()
    total_revenue = float(total_revenue_result) if total_revenue_result else 0.0

    # Pending revenue (bookings not yet completed)
    pending_revenue_result = db.query(func.sum(Booking.amount)).filter(Booking.status == BookingStatus.PENDING).scalar()
    pending_revenue = float(pending_revenue_result) if pending_revenue_result else 0.0

    # Count of completed bookings
    completed_count = db.query(Booking).filter(Booking.status == BookingStatus.COMPLETED).count()

    # Average booking value
    avg_booking_value = total_revenue / completed_count if completed_count > 0 else 0.0

    # Top earning instructors (top 10)
    top_instructors_query = (
        db.query(
            Instructor.id,
            User.first_name,
            User.last_name,
            func.sum(Booking.amount).label("total_earnings"),
            func.count(Booking.id).label("booking_count"),
        )
        .join(Booking, Booking.instructor_id == Instructor.id)
        .join(User, User.id == Instructor.user_id)
        .filter(Booking.status == BookingStatus.COMPLETED)
        .group_by(Instructor.id, User.first_name, User.last_name)
        .order_by(func.sum(Booking.amount).desc())
        .limit(10)
        .all()
    )

    top_instructors = [
        {
            "instructor_id": row.id,
            "name": f"{row.first_name} {row.last_name}",
            "total_earnings": float(row.total_earnings),
            "booking_count": row.booking_count,
        }
        for row in top_instructors_query
    ]

    return RevenueStats(
        total_revenue=total_revenue,
        pending_revenue=pending_revenue,
        completed_bookings=completed_count,
        avg_booking_value=avg_booking_value,
        top_instructors=top_instructors,
    )


@router.get("/revenue/by-instructor/{instructor_id}")
async def get_instructor_revenue(
    instructor_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Get revenue details for a specific instructor
    """
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found",
        )

    user = db.query(User).filter(User.id == instructor.user_id).first()

    # Get completed bookings
    completed_bookings = db.query(Booking).filter(Booking.instructor_id == instructor_id, Booking.status == BookingStatus.COMPLETED).all()

    total_earnings = sum(float(booking.amount) for booking in completed_bookings)
    booking_count = len(completed_bookings)
    avg_per_booking = total_earnings / booking_count if booking_count > 0 else 0.0

    return {
        "instructor_id": instructor_id,
        "instructor_name": user.full_name if user else "Unknown",
        "total_earnings": total_earnings,
        "completed_bookings": booking_count,
        "avg_per_booking": avg_per_booking,
        "hourly_rate": float(instructor.hourly_rate),
        "rating": float(instructor.rating) if instructor.rating else 0.0,
    }
