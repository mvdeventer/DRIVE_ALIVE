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
from ..models.availability import InstructorSchedule, TimeOffException
from ..models.booking import Booking, BookingStatus
from ..models.user import Instructor, Student, User, UserRole, UserStatus
from ..schemas.admin import (
    AdminCreateRequest,
    AdminCreateResponse,
    AdminSettingsUpdate,
    AdminStats,
    BookingOverview,
    InstructorVerificationRequest,
    InstructorVerificationResponse,
    RevenueStats,
    UserManagementResponse,
)
from ..utils.auth import get_password_hash

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


# ==================== Admin Management ====================


@router.post(
    "/create", response_model=AdminCreateResponse, status_code=status.HTTP_201_CREATED
)
async def create_admin(
    admin_data: AdminCreateRequest,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Create a new admin user (requires existing admin privileges)
    
    If email exists, user must provide correct password to add admin role.
    """
    from ..utils.auth import verify_password
    from ..services.verification_service import VerificationService
    from ..config import settings
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == admin_data.email).first()

    if existing_user:
        # Check if user already has admin role
        if existing_user.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This email already has admin privileges.",
            )
        
        # Verify password matches (for security)
        if not verify_password(admin_data.password, existing_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Email is already registered with a different password. Please use the correct password to add admin role.",
            )
        
        # Update existing user to admin role (requires verification)
        existing_user.role = UserRole.ADMIN
        existing_user.status = UserStatus.INACTIVE
        db.commit()
        db.refresh(existing_user)

        validity_minutes = existing_user.verification_link_validity_minutes or 30
        verification_token = VerificationService.create_verification_token(
            db=db,
            user_id=existing_user.id,
            token_type="email",
            validity_minutes=validity_minutes,
        )

        verification_result = VerificationService.send_verification_messages(
            db=db,
            user=existing_user,
            verification_token=verification_token,
            frontend_url=settings.FRONTEND_URL,
            admin_smtp_email=existing_user.smtp_email,
            admin_smtp_password=existing_user.smtp_password,
        )
        
        # Trigger backup after successful role addition
        try:
            from ..services.backup_scheduler import backup_scheduler
            backup_scheduler.create_backup(
                f"role_creation_admin_{existing_user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
        except Exception as e:
            print(f"Warning: Backup after admin role creation failed: {e}")
        
        return {
            "message": "Admin role added. Verification required to activate.",
            "user_id": existing_user.id,
            "verification_sent": {
                "email_sent": verification_result.get("email_sent", False),
                "whatsapp_sent": verification_result.get("whatsapp_sent", False),
                "expires_in_minutes": verification_result.get("expires_in_minutes", validity_minutes),
            },
            "note": f"Account will be activated after verification. The verification link is valid for {validity_minutes} minutes.",
        }
    
    # Create new admin user
    new_admin = User(
        email=admin_data.email,
        phone=admin_data.phone,
        password_hash=get_password_hash(admin_data.password),
        first_name=admin_data.first_name,
        last_name=admin_data.last_name,
        id_number=admin_data.id_number,
        address=admin_data.address,
        address_latitude=admin_data.address_latitude,
        address_longitude=admin_data.address_longitude,
        role=UserRole.ADMIN,
        status=UserStatus.INACTIVE,
        smtp_email=admin_data.smtp_email,
        smtp_password=admin_data.smtp_password,
        verification_link_validity_minutes=admin_data.verification_link_validity_minutes,
        twilio_sender_phone_number=admin_data.twilio_sender_phone_number,  # Twilio sender number
        twilio_phone_number=admin_data.twilio_phone_number,  # Admin's test recipient phone
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    validity_minutes = new_admin.verification_link_validity_minutes or 30
    verification_token = VerificationService.create_verification_token(
        db=db,
        user_id=new_admin.id,
        token_type="email",
        validity_minutes=validity_minutes,
    )

    verification_result = VerificationService.send_verification_messages(
        db=db,
        user=new_admin,
        verification_token=verification_token,
        frontend_url=settings.FRONTEND_URL,
        admin_smtp_email=new_admin.smtp_email,
        admin_smtp_password=new_admin.smtp_password,
    )

    # Trigger backup after successful admin creation
    try:
        from ..services.backup_scheduler import backup_scheduler
        backup_scheduler.create_backup(
            f"role_creation_admin_{new_admin.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
    except Exception as e:
        print(f"Warning: Backup after admin creation failed: {e}")

    return {
        "message": "Registration successful! Please check your email and WhatsApp to verify your account.",
        "user_id": new_admin.id,
        "verification_sent": {
            "email_sent": verification_result.get("email_sent", False),
            "whatsapp_sent": verification_result.get("whatsapp_sent", False),
            "expires_in_minutes": verification_result.get("expires_in_minutes", validity_minutes),
        },
        "note": f"Account will be activated after verification. The verification link is valid for {validity_minutes} minutes.",
    }


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
    verified_instructors = (
        db.query(Instructor).filter(Instructor.is_verified == True).count()
    )
    pending_verification = (
        db.query(Instructor).filter(Instructor.is_verified == False).count()
    )

    # Booking stats
    total_bookings = db.query(Booking).count()
    pending_bookings = (
        db.query(Booking).filter(Booking.status == BookingStatus.PENDING).count()
    )
    completed_bookings = (
        db.query(Booking).filter(Booking.status == BookingStatus.COMPLETED).count()
    )
    cancelled_bookings = (
        db.query(Booking).filter(Booking.status == BookingStatus.CANCELLED).count()
    )

    # Revenue stats (completed bookings only)
    revenue_result = (
        db.query(func.sum(Booking.amount))
        .filter(Booking.status == BookingStatus.COMPLETED)
        .scalar()
    )
    total_revenue = float(revenue_result) if revenue_result else 0.0

    # Calculate average booking value
    avg_booking_value = (
        total_revenue / completed_bookings if completed_bookings > 0 else 0.0
    )

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


@router.get(
    "/instructors/pending-verification",
    response_model=List[InstructorVerificationResponse],
)
async def get_pending_instructors(
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """
    Get list of instructors pending verification
    """
    instructors = (
        db.query(Instructor)
        .filter(Instructor.is_verified == False)
        .offset(skip)
        .limit(limit)
        .all()
    )

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


@router.post(
    "/instructors/{instructor_id}/verify", response_model=InstructorVerificationResponse
)
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
    
    Multi-role system: Users can have multiple profiles (Student, Instructor, Admin)
    When filtering by role, we check for the existence of the corresponding profile:
    - STUDENT: users with student profiles
    - INSTRUCTOR: users with instructor profiles  
    - ADMIN: users with role=ADMIN (admin is role-based, not profile-based)
    """
    query = db.query(User)

    # Filter by role - check for actual profiles in multi-role system
    if role == UserRole.STUDENT:
        # Get users who have a student profile
        query = query.join(Student, Student.user_id == User.id)
    elif role == UserRole.INSTRUCTOR:
        # Get users who have an instructor profile
        query = query.join(Instructor, Instructor.user_id == User.id)
    elif role == UserRole.ADMIN:
        # Admin is role-based, not profile-based
        query = query.filter(User.role == UserRole.ADMIN)
    
    if status:
        query = query.filter(User.status == status)

    users = query.offset(skip).limit(limit).all()

    result = []
    for user in users:
        # Get id_number and booking_fee from instructor or student profile
        id_number = None
        booking_fee = None
        
        # When filtering by role, get data from the corresponding profile
        if role == UserRole.INSTRUCTOR:
            instructor = (
                db.query(Instructor).filter(Instructor.user_id == user.id).first()
            )
            if instructor:
                id_number = instructor.id_number
                booking_fee = instructor.booking_fee
        elif role == UserRole.STUDENT:
            student = db.query(Student).filter(Student.user_id == user.id).first()
            if student:
                id_number = student.id_number
        else:
            # No specific role filter - check both profiles
            instructor = (
                db.query(Instructor).filter(Instructor.user_id == user.id).first()
            )
            if instructor:
                id_number = instructor.id_number
                booking_fee = instructor.booking_fee
            else:
                student = db.query(Student).filter(Student.user_id == user.id).first()
                if student:
                    id_number = student.id_number

        result.append(
            UserManagementResponse(
                id=user.id,
                email=user.email,
                phone=user.phone,
                full_name=user.full_name,
                role=user.role,
                status=user.status,
                id_number=id_number,
                booking_fee=booking_fee,
                created_at=user.created_at,
                last_login=user.last_login,
            )
        )

    return result


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    new_status: UserStatus,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Activate, deactivate, or suspend a user account
    Admins can suspend their own Student/Instructor profiles.
    Only the main admin cannot suspend their own Admin profile.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # PROTECTION: Only the main admin can change any admin's status, and main admin cannot suspend own admin profile
    if user.role == UserRole.ADMIN:
        admins = db.query(User).filter(User.role == UserRole.ADMIN).order_by(User.id.asc()).all()
        if not admins:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No admin user found in system",
            )
        first_admin = admins[0]
        
        # Check if trying to change the main admin's own admin profile
        if user.id == current_admin.id and current_admin.id == first_admin.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The main admin cannot suspend their own admin profile. You can suspend your own student/instructor profiles via Database Interface.",
            )
        
        # Only the main admin can change other admins' status
        if current_admin.id != first_admin.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the original admin can change another admin's status",
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


@router.delete("/admins/{admin_id}")
async def delete_admin(
    admin_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Delete an admin user (only the original admin can delete other admins)
    """
    if admin_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own admin account",
        )

    admins = db.query(User).filter(User.role == UserRole.ADMIN).order_by(User.id.asc()).all()
    if not admins:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No admin user found in system",
        )

    first_admin = admins[0]
    if current_admin.id != first_admin.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the original admin can delete other admins",
        )

    if admin_id == first_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the original admin account",
        )

    admin_user = db.query(User).filter(User.id == admin_id).first()
    if not admin_user or admin_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin user not found",
        )

    db.delete(admin_user)
    db.commit()

    return {
        "message": "Admin deleted successfully",
        "admin_id": admin_id,
    }


@router.delete("/instructors/{user_id}")
async def delete_instructor(
    user_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Delete an instructor profile (allows user to re-register as instructor)
    
    - Removes instructor profile only
    - If user has no other profiles, user account is also deleted
    - User can re-register as instructor
    - Does NOT delete bookings (keeps history)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    instructor = db.query(Instructor).filter(Instructor.user_id == user_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor profile not found for this user",
        )

    active_statuses = [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.IN_PROGRESS,
    ]
    instructor_active_bookings = (
        db.query(Booking)
        .filter(Booking.instructor_id == instructor.id, Booking.status.in_(active_statuses))
        .count()
    )
    instructor_total_bookings = (
        db.query(Booking).filter(Booking.instructor_id == instructor.id).count()
    )

    # Delete related bookings to satisfy FK constraints
    if instructor_total_bookings > 0:
        db.query(Booking).filter(Booking.instructor_id == instructor.id).delete(
            synchronize_session=False
        )

    # Delete instructor profile
    db.delete(instructor)
    
    # Check if user has any other profiles
    remaining_student = db.query(Student).filter(Student.user_id == user_id).first()
    remaining_admin_profile = db.query(User).filter(User.id == user_id, User.role == UserRole.ADMIN).first()
    
    # If no other profiles and not an admin, delete the user account too
    if not remaining_student and not remaining_admin_profile:
        db.delete(user)
    
    db.commit()

    return {
        "message": "Instructor profile deleted successfully",
        "user_id": user_id,
        "email": user.email,
        "active_bookings_deleted": instructor_active_bookings,
        "total_bookings_deleted": instructor_total_bookings,
        "note": "Related bookings removed. User account also removed if no other profiles remain.",
    }


@router.get("/instructors/{user_id}/booking-summary")
async def get_instructor_booking_summary(
    user_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """Get active/total booking counts for an instructor profile"""
    instructor = db.query(Instructor).filter(Instructor.user_id == user_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor profile not found for this user",
        )

    active_statuses = [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.IN_PROGRESS,
    ]
    active_count = (
        db.query(Booking)
        .filter(Booking.instructor_id == instructor.id, Booking.status.in_(active_statuses))
        .count()
    )
    total_count = (
        db.query(Booking).filter(Booking.instructor_id == instructor.id).count()
    )

    return {
        "active_bookings": active_count,
        "total_bookings": total_count,
    }


@router.delete("/students/{user_id}")
async def delete_student(
    user_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Delete a student profile (allows user to re-register as student)
    
    - Removes student profile only
    - If user has no other profiles, user account is also deleted
    - User can re-register as student
    - Does NOT delete bookings (keeps history)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    student = db.query(Student).filter(Student.user_id == user_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for this user",
        )

    active_statuses = [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.IN_PROGRESS,
    ]
    student_active_bookings = (
        db.query(Booking)
        .filter(Booking.student_id == student.id, Booking.status.in_(active_statuses))
        .count()
    )
    student_total_bookings = (
        db.query(Booking).filter(Booking.student_id == student.id).count()
    )

    # Delete related bookings to satisfy FK constraints
    if student_total_bookings > 0:
        db.query(Booking).filter(Booking.student_id == student.id).delete(
            synchronize_session=False
        )

    # Delete student profile
    db.delete(student)
    
    # Check if user has any other profiles
    remaining_instructor = db.query(Instructor).filter(Instructor.user_id == user_id).first()
    remaining_admin_profile = db.query(User).filter(User.id == user_id, User.role == UserRole.ADMIN).first()
    
    # If no other profiles and not an admin, delete the user account too
    if not remaining_instructor and not remaining_admin_profile:
        db.delete(user)
    
    db.commit()

    return {
        "message": "Student profile deleted successfully",
        "user_id": user_id,
        "email": user.email,
        "active_bookings_deleted": student_active_bookings,
        "total_bookings_deleted": student_total_bookings,
        "note": "Related bookings removed. User account also removed if no other profiles remain.",
    }


@router.get("/students/{user_id}/booking-summary")
async def get_student_booking_summary(
    user_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """Get active/total booking counts for a student profile"""
    student = db.query(Student).filter(Student.user_id == user_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for this user",
        )

    active_statuses = [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.IN_PROGRESS,
    ]
    active_count = (
        db.query(Booking)
        .filter(Booking.student_id == student.id, Booking.status.in_(active_statuses))
        .count()
    )
    total_count = (
        db.query(Booking).filter(Booking.student_id == student.id).count()
    )

    return {
        "active_bookings": active_count,
        "total_bookings": total_count,
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Delete entire user account (COMPLETE removal)
    
    - Removes user account AND all related profiles
    - Deletes instructor profile (if exists)
    - Deletes student profile (if exists)
    - Deletes bookings, schedules, time-off
    - User can re-register with same email
    - CAUTION: This is permanent deletion
    """
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent deleting original admin
    if user.role == UserRole.ADMIN:
        admins = db.query(User).filter(User.role == UserRole.ADMIN).order_by(User.id.asc()).all()
        if admins and user.id == admins[0].id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the original admin account",
            )

    # Delete related instructor profile and data
    instructor = db.query(Instructor).filter(Instructor.user_id == user_id).first()
    if instructor:
        # Delete instructor schedules
        db.query(InstructorSchedule).filter(InstructorSchedule.instructor_id == instructor.id).delete()
        # Delete time-off exceptions
        db.query(TimeOffException).filter(TimeOffException.instructor_id == instructor.id).delete()
        # Delete bookings as instructor
        db.query(Booking).filter(Booking.instructor_id == instructor.id).delete()
        # Delete instructor profile
        db.delete(instructor)

    # Delete related student profile and data
    student = db.query(Student).filter(Student.user_id == user_id).first()
    if student:
        # Delete bookings as student
        db.query(Booking).filter(Booking.student_id == student.id).delete()
        # Delete student profile
        db.delete(student)

    # Delete user account
    user_email = user.email
    db.delete(user)
    db.commit()

    return {
        "message": "User account and all related data deleted successfully",
        "user_id": user_id,
        "email": user_email,
        "note": "User can re-register with this email",
    }


@router.put("/instructors/{instructor_id}/booking-fee")
async def update_instructor_booking_fee(
    instructor_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
    booking_fee: float = Query(..., ge=0, description="Booking fee in ZAR"),
):
    """
    Update the booking fee for a specific instructor
    """
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found",
        )

    old_fee = instructor.booking_fee
    instructor.booking_fee = booking_fee
    db.commit()
    db.refresh(instructor)

    return {
        "message": f"Booking fee updated from R{old_fee:.2f} to R{booking_fee:.2f}",
        "instructor_id": instructor_id,
        "old_fee": old_fee,
        "new_fee": booking_fee,
    }


# ==================== Booking Oversight ====================


@router.get("/bookings", response_model=List[BookingOverview])
async def get_all_bookings(
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
    status_filter: Optional[BookingStatus] = Query(None),
    instructor_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """
    Get overview of all bookings with optional status filter and instructor filter
    """
    # Auto-update past pending bookings to completed
    from ..routes.bookings import auto_update_past_bookings

    auto_update_past_bookings(db)

    query = db.query(Booking)

    if status_filter:
        query = query.filter(Booking.status == status_filter)

    if instructor_id:
        query = query.filter(Booking.instructor_id == instructor_id)

    bookings = (
        query.order_by(Booking.lesson_date.desc()).offset(skip).limit(limit).all()
    )

    # DEBUG: Log query details
    print(
        f"🔍 Admin bookings query - instructor_id: {instructor_id}, status_filter: {status_filter}, total found: {len(bookings)}"
    )
    if len(bookings) > 0:
        status_counts = {}
        for b in bookings:
            status_counts[b.status.value] = status_counts.get(b.status.value, 0) + 1
        print(f"  Status breakdown: {status_counts}")

    result = []
    for booking in bookings:
        student = db.query(Student).filter(Student.id == booking.student_id).first()
        instructor = (
            db.query(Instructor).filter(Instructor.id == booking.instructor_id).first()
        )

        student_user = (
            db.query(User).filter(User.id == student.user_id).first()
            if student
            else None
        )
        instructor_user = (
            db.query(User).filter(User.id == instructor.user_id).first()
            if instructor
            else None
        )

        result.append(
            BookingOverview(
                id=booking.id,
                booking_reference=booking.booking_reference,
                student_id=booking.student_id,
                student_name=student_user.full_name if student_user else "Unknown",
                student_id_number=student.id_number if student else "Unknown",
                student_phone=student_user.phone if student_user else None,
                instructor_id=booking.instructor_id,
                instructor_name=(
                    instructor_user.full_name if instructor_user else "Unknown"
                ),
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
    instructor_id: Optional[int] = Query(None),
):
    """
    Get detailed revenue statistics, optionally filtered by instructor
    """
    # Build base query with optional instructor filter
    completed_query = db.query(Booking).filter(
        Booking.status == BookingStatus.COMPLETED
    )
    pending_query = db.query(Booking).filter(Booking.status == BookingStatus.PENDING)

    if instructor_id:
        completed_query = completed_query.filter(Booking.instructor_id == instructor_id)
        pending_query = pending_query.filter(Booking.instructor_id == instructor_id)

    # Total revenue from completed bookings
    total_revenue_result = (
        db.query(func.sum(Booking.amount))
        .filter(Booking.status == BookingStatus.COMPLETED)
        .filter(Booking.instructor_id == instructor_id if instructor_id else True)
        .scalar()
    )
    total_revenue = float(total_revenue_result) if total_revenue_result else 0.0

    # Pending revenue (bookings not yet completed)
    pending_revenue_result = (
        db.query(func.sum(Booking.amount))
        .filter(Booking.status == BookingStatus.PENDING)
        .filter(Booking.instructor_id == instructor_id if instructor_id else True)
        .scalar()
    )
    pending_revenue = float(pending_revenue_result) if pending_revenue_result else 0.0

    # Count of completed bookings
    completed_count = completed_query.count()

    # Average booking value
    avg_booking_value = total_revenue / completed_count if completed_count > 0 else 0.0

    # Top earning instructors (top 10 or just the selected one)
    top_instructors_base = (
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
    )

    if instructor_id:
        top_instructors_base = top_instructors_base.filter(
            Instructor.id == instructor_id
        )

    top_instructors_query = (
        top_instructors_base.group_by(Instructor.id, User.first_name, User.last_name)
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
    completed_bookings = (
        db.query(Booking)
        .filter(
            Booking.instructor_id == instructor_id,
            Booking.status == BookingStatus.COMPLETED,
        )
        .all()
    )

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


# ==================== User Detail Management ====================


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific user
    
    Restriction: Only the original admin can view/edit the original admin's profile
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Check if trying to access original admin's profile
    if user.role == UserRole.ADMIN:
        admins = db.query(User).filter(User.role == UserRole.ADMIN).order_by(User.id.asc()).all()
        if admins:
            first_admin = admins[0]
            # If requesting original admin's details and current user is not the original admin
            if user_id == first_admin.id and current_admin.id != first_admin.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the original admin can view or edit the original admin's profile",
                )

    result = {
        "id": user.id,
        "email": user.email,
        "phone": user.phone,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role.value,
        "status": user.status.value,
        "created_at": user.created_at,
        "last_login": user.last_login,
        "id_number": user.id_number,
        "address": user.address,
    }

    # Get role-specific details
    if user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == user_id).first()
        if student:
            result["student_details"] = {
                "id_number": student.id_number,
                "learners_permit_number": student.learners_permit_number,
                "emergency_contact_name": student.emergency_contact_name,
                "emergency_contact_phone": student.emergency_contact_phone,
                "address_line1": student.address_line1,
                "address_line2": student.address_line2,
                "province": student.province,
                "city": student.city,
                "suburb": student.suburb,
                "postal_code": student.postal_code,
            }
    elif user.role == UserRole.INSTRUCTOR:
        instructor = db.query(Instructor).filter(Instructor.user_id == user_id).first()
        if instructor:
            result["instructor_details"] = {
                "id_number": instructor.id_number,
                "license_number": instructor.license_number,
                "license_types": instructor.license_types,
                "vehicle_make": instructor.vehicle_make,
                "vehicle_model": instructor.vehicle_model,
                "vehicle_registration": instructor.vehicle_registration,
                "vehicle_year": instructor.vehicle_year,
                "province": instructor.province,
                "city": instructor.city,
                "suburb": instructor.suburb,
                "hourly_rate": float(instructor.hourly_rate),
                "is_verified": instructor.is_verified,
                "rating": float(instructor.rating) if instructor.rating else 0.0,
            }

    return result


@router.put("/users/{user_id}")
async def update_user_details(
    user_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
    first_name: Optional[str] = Query(None),
    last_name: Optional[str] = Query(None),
    phone: Optional[str] = Query(None),
):
    """
    Update user basic details (name, phone)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Update fields if provided
    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name
    if phone is not None:
        # Check if phone is already used by another user
        existing = (
            db.query(User).filter(User.phone == phone, User.id != user_id).first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Phone number already in use: {phone}",
            )
        user.phone = phone

    db.commit()
    db.refresh(user)

    return {
        "message": "User details updated successfully",
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
        },
    }


@router.post("/users/{user_id}/reset-password")
async def admin_reset_password(
    user_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
    new_password: str = Query(...),
):
    """
    Reset a user's password (admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Validate password length
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long",
        )

    # Update password
    user.password_hash = get_password_hash(new_password)
    db.commit()

    return {
        "message": f"Password reset successfully for {user.full_name}",
        "user_id": user_id,
    }


# ==================== Instructor Schedule & Time Off Viewing ====================


@router.get("/instructors/{instructor_id}/schedule")
async def get_instructor_schedule(
    instructor_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Get instructor's weekly schedule (admin view)
    """
    print(f"🔍 Fetching schedule for instructor_id: {instructor_id}")

    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found",
        )

    print(f"✅ Found instructor: {instructor.id}")

    schedules = (
        db.query(InstructorSchedule)
        .filter(InstructorSchedule.instructor_id == instructor_id)
        .all()
    )

    print(f"📅 Found {len(schedules)} schedule records")
    for sched in schedules:
        print(
            f"   - {sched.day_of_week.value}: {sched.start_time} - {sched.end_time} (Active: {sched.is_active})"
        )

    result = [
        {
            "id": sched.id,
            "day_of_week": sched.day_of_week.value,
            "start_time": sched.start_time.strftime("%H:%M"),
            "end_time": sched.end_time.strftime("%H:%M"),
            "is_active": sched.is_active,
        }
        for sched in schedules
    ]

    print(f"📤 Returning {len(result)} schedule items")
    print(f"   Result: {result}")

    return result


@router.get("/instructors/{instructor_id}/time-off")
async def get_instructor_time_off(
    instructor_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Get instructor's time off dates - ALL dates including past ones (admin view)
    """
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found",
        )

    # Get ALL time off dates (no filtering by date)
    time_offs = (
        db.query(TimeOffException)
        .filter(TimeOffException.instructor_id == instructor_id)
        .all()
    )

    return [
        {
            "id": time_off.id,
            "start_date": time_off.start_date.strftime("%Y-%m-%d"),
            "end_date": time_off.end_date.strftime("%Y-%m-%d"),
            "start_time": (
                time_off.start_time.strftime("%H:%M") if time_off.start_time else None
            ),
            "end_time": (
                time_off.end_time.strftime("%H:%M") if time_off.end_time else None
            ),
            "reason": time_off.reason,
            "notes": time_off.notes,
        }
        for time_off in time_offs
    ]


# ==================== Admin Update Instructor Profile ====================


@router.put("/instructors/{instructor_id}")
async def admin_update_instructor(
    instructor_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
    license_number: Optional[str] = Query(None),
    license_types: Optional[str] = Query(None),
    vehicle_registration: Optional[str] = Query(None),
    vehicle_make: Optional[str] = Query(None),
    vehicle_model: Optional[str] = Query(None),
    vehicle_year: Optional[int] = Query(None),
    province: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    suburb: Optional[str] = Query(None),
    hourly_rate: Optional[float] = Query(None),
    service_radius_km: Optional[float] = Query(None),
    max_travel_distance_km: Optional[float] = Query(None),
    rate_per_km_beyond_radius: Optional[float] = Query(None),
    bio: Optional[str] = Query(None),
    is_available: Optional[bool] = Query(None),
):
    """
    Admin update instructor profile details
    """
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found",
        )

    # Update fields if provided
    if license_number is not None:
        instructor.license_number = license_number
    if license_types is not None:
        instructor.license_types = license_types
    if vehicle_registration is not None:
        instructor.vehicle_registration = vehicle_registration
    if vehicle_make is not None:
        instructor.vehicle_make = vehicle_make
    if vehicle_model is not None:
        instructor.vehicle_model = vehicle_model
    if vehicle_year is not None:
        instructor.vehicle_year = vehicle_year
    if province is not None:
        instructor.province = province
    if city is not None:
        instructor.city = city
    if suburb is not None:
        instructor.suburb = suburb
    if hourly_rate is not None:
        instructor.hourly_rate = hourly_rate
    if service_radius_km is not None:
        instructor.service_radius_km = service_radius_km
    if max_travel_distance_km is not None:
        instructor.max_travel_distance_km = max_travel_distance_km
    if rate_per_km_beyond_radius is not None:
        instructor.rate_per_km_beyond_radius = rate_per_km_beyond_radius
    if bio is not None:
        instructor.bio = bio
    if is_available is not None:
        instructor.is_available = is_available

    db.commit()
    db.refresh(instructor)

    return {
        "message": "Instructor profile updated successfully",
        "instructor_id": instructor.id,
    }


# ==================== Admin Update Student Profile ====================


@router.put("/students/{student_id}")
async def admin_update_student(
    student_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
    address: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    province: Optional[str] = Query(None),
    emergency_contact_name: Optional[str] = Query(None),
    emergency_contact_phone: Optional[str] = Query(None),
):
    """
    Admin update student profile details
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    # Update fields if provided
    if address is not None:
        student.address = address
    if city is not None:
        student.city = city
    if province is not None:
        student.province = province
    if emergency_contact_name is not None:
        student.emergency_contact_name = emergency_contact_name
    if emergency_contact_phone is not None:
        student.emergency_contact_phone = emergency_contact_phone

    db.commit()
    db.refresh(student)

    return {
        "message": "Student profile updated successfully",
        "student_id": student.id,
    }


# ==================== Instructor Earnings Reports (Admin) ====================


@router.get("/instructors/{instructor_id}/earnings-report")
async def get_instructor_earnings_report_admin(
    instructor_id: int,
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Get comprehensive earnings report for a specific instructor (Admin only)
    """
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found"
        )

    user = db.query(User).filter(User.id == instructor.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Get all bookings for this instructor
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
        month_key = booking.lesson_date.strftime("%Y-%m")
        earnings_by_month[month_key]["earnings"] += float(booking.amount)
        earnings_by_month[month_key]["lessons"] += 1

    # Convert to sorted list
    monthly_breakdown = []
    for month, data in sorted(earnings_by_month.items(), reverse=True):
        month_obj = datetime.strptime(month, "%Y-%m")
        month_name = month_obj.strftime("%B %Y")
        monthly_breakdown.append(
            {
                "month": month_name,
                "earnings": data["earnings"],
                "lessons": data["lessons"],
            }
        )

    # Get all recent bookings (not just completed - include pending, cancelled, etc.)
    all_recent_bookings = sorted(bookings, key=lambda x: x.lesson_date, reverse=True)[
        :50
    ]  # Increased from 20 to 50 to show more bookings

    recent_earnings = []
    for booking in all_recent_bookings:
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
                "duration_minutes": booking.duration_minutes,
                "amount": float(booking.amount),
                "status": booking.status.value,
            }
        )

    return {
        "instructor_id": instructor.id,
        "instructor_name": f"{user.first_name} {user.last_name}",
        "total_earnings": total_earnings,
        "hourly_rate": float(instructor.hourly_rate),
        "completed_lessons": completed_lessons,
        "pending_lessons": len(pending_bookings),
        "cancelled_lessons": len(cancelled_bookings),
        "total_lessons": len(bookings),
        "earnings_by_month": monthly_breakdown,
        "recent_earnings": recent_earnings,
    }


@router.get("/instructors/earnings-summary")
async def get_all_instructors_earnings_summary(
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Get earnings summary for all instructors (Admin overview)
    """
    instructors = db.query(Instructor).all()

    summary = []
    for instructor in instructors:
        user = db.query(User).filter(User.id == instructor.user_id).first()
        if not user:
            continue

        # Get completed bookings
        completed_bookings = (
            db.query(Booking)
            .filter(
                Booking.instructor_id == instructor.id,
                Booking.status == BookingStatus.COMPLETED,
            )
            .all()
        )

        total_earnings = sum(float(b.amount) for b in completed_bookings)
        completed_lessons = len(completed_bookings)

        summary.append(
            {
                "instructor_id": instructor.id,
                "user_id": user.id,
                "instructor_name": f"{user.first_name} {user.last_name}",
                "email": user.email,
                "phone": user.phone,
                "total_earnings": total_earnings,
                "completed_lessons": completed_lessons,
                "hourly_rate": float(instructor.hourly_rate),
                "is_verified": instructor.is_verified,
                "is_available": instructor.is_available,
                "rating": float(instructor.rating) if instructor.rating else 0.0,
                "total_reviews": instructor.total_reviews or 0,
            }
        )

    # Sort by total earnings (highest first)
    summary.sort(key=lambda x: x["total_earnings"], reverse=True)

    return {"instructors": summary, "total_instructors": len(summary)}


# ==================== Admin Settings ====================


@router.get("/settings")
async def get_admin_settings(
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Get global admin settings (stored on the first admin user)
    
    All admins share the same email and WhatsApp configuration for consistency.
    Settings are retrieved from the first admin in the system.
    """
    try:
        # Get the first admin (by user ID) - this is our global settings holder
        # Using all() to avoid LIMIT/OFFSET issues, then get first from list
        admins = db.query(User).filter(User.role == UserRole.ADMIN).order_by(User.id.asc()).all()
        
        if not admins or len(admins) == 0:
            raise HTTPException(status_code=500, detail="No admin user found in system")
        
        first_admin = admins[0]
        
        return {
            "user_id": first_admin.id,
            "email": first_admin.email,
            "smtp_email": first_admin.smtp_email,
            "smtp_password": first_admin.smtp_password,
            "verification_link_validity_minutes": first_admin.verification_link_validity_minutes or 30,
            "backup_interval_minutes": first_admin.backup_interval_minutes or 10,
            "retention_days": first_admin.retention_days or 30,
            "auto_archive_after_days": first_admin.auto_archive_after_days or 14,
            "twilio_sender_phone_number": first_admin.twilio_sender_phone_number,  # Twilio sender number
            "twilio_phone_number": first_admin.twilio_phone_number,  # Admin's test recipient phone
            "inactivity_timeout_minutes": first_admin.inactivity_timeout_minutes or 15,  # Auto-logout timeout
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching admin settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch settings: {str(e)}")


@router.put("/settings")
async def update_admin_settings(
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
    settings_update: AdminSettingsUpdate = None,
):
    """
    Update global admin settings (updates the first admin's configuration)
    
    All admins share the same email and WhatsApp configuration.
    When any admin updates settings, it affects all admins in the system.
    Settings are stored on the first admin user.
    """
    if settings_update is None:
        raise HTTPException(status_code=400, detail="No settings provided")
    
    try:
        # Get the first admin (by user ID) - this is our global settings holder
        # Using all() to avoid LIMIT/OFFSET issues, then get first from list
        admins = db.query(User).filter(User.role == UserRole.ADMIN).order_by(User.id.asc()).all()
        
        if not admins or len(admins) == 0:
            raise HTTPException(status_code=500, detail="No admin user found in system")
        
        first_admin = admins[0]

        # Update global settings on the first admin
        if settings_update.smtp_email is not None:
            first_admin.smtp_email = settings_update.smtp_email if settings_update.smtp_email else None
        if settings_update.smtp_password is not None:
            first_admin.smtp_password = settings_update.smtp_password if settings_update.smtp_password else None
        if settings_update.verification_link_validity_minutes is not None:
            first_admin.verification_link_validity_minutes = settings_update.verification_link_validity_minutes
        if settings_update.backup_interval_minutes is not None:
            first_admin.backup_interval_minutes = settings_update.backup_interval_minutes
        if settings_update.retention_days is not None:
            first_admin.retention_days = settings_update.retention_days
        if settings_update.auto_archive_after_days is not None:
            first_admin.auto_archive_after_days = settings_update.auto_archive_after_days
        if settings_update.twilio_sender_phone_number is not None:
            first_admin.twilio_sender_phone_number = settings_update.twilio_sender_phone_number if settings_update.twilio_sender_phone_number else None
        if settings_update.twilio_phone_number is not None:
            first_admin.twilio_phone_number = settings_update.twilio_phone_number if settings_update.twilio_phone_number else None
        if settings_update.inactivity_timeout_minutes is not None:
            first_admin.inactivity_timeout_minutes = settings_update.inactivity_timeout_minutes

        db.commit()
        db.refresh(first_admin)

        return {
            "message": "Global settings updated successfully for all admins",
            "updated_on_admin_id": first_admin.id,
            "smtp_email": first_admin.smtp_email,
            "verification_link_validity_minutes": first_admin.verification_link_validity_minutes,
            "backup_interval_minutes": first_admin.backup_interval_minutes,
            "retention_days": first_admin.retention_days,
            "auto_archive_after_days": first_admin.auto_archive_after_days,
            "twilio_sender_phone_number": first_admin.twilio_sender_phone_number,
            "twilio_phone_number": first_admin.twilio_phone_number,
            "inactivity_timeout_minutes": first_admin.inactivity_timeout_minutes,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating admin settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")


