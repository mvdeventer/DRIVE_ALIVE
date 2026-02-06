"""
Authentication routes
"""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from ..database import get_db
from ..models.password_reset import PasswordResetToken
from ..models.user import Instructor, Student, User, UserRole
from ..schemas.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    InstructorCreate,
    ResetPasswordRequest,
    StudentCreate,
    UserResponse,
    UserUpdate,
)
from ..services.auth import AuthService
from ..services.email_service import email_service
from ..utils.auth import decode_access_token, get_password_hash, verify_password
from ..utils.rate_limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    token_role = payload.get("role")
    if token_role:
        print(f"🔐 [AUTH] JWT token role: {token_role}, Database role: {user.role.value}")
        setattr(user, "active_role", token_role)
    else:
        # Fallback to database role if no role in JWT
        setattr(user, "active_role", user.role.value)

    return user


def get_active_role(user: User) -> str:
    """
    Get the active role from the current user session (from JWT token or fallback to database role)
    """
    return getattr(user, "active_role", user.role.value)


@router.post(
    "/register/student", response_model=dict, status_code=status.HTTP_201_CREATED
)
@limiter.limit("3/hour")  # Max 3 student registrations per hour per IP
async def register_student(
    request: Request,  # Required for rate limiter
    student_data: StudentCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new student
    Note: Admin user must exist before students can register
    Creates user as inactive and sends email/WhatsApp verification
    """
    from ..services.initialization import InitializationService
    from ..services.verification_service import VerificationService
    from ..config import settings
    
    # Check if admin exists
    if not InitializationService.admin_exists(db):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="System is not initialized. Please contact administrator to complete initial setup first.",
        )
    
    # Create student (user will be inactive)
    user, student = AuthService.create_student(db, student_data)
    
    # Get admin SMTP settings
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    validity_minutes = admin.verification_link_validity_minutes if admin else 30
    
    # Create verification token
    verification_token = VerificationService.create_verification_token(
        db=db,
        user_id=user.id,
        token_type="email",
        validity_minutes=validity_minutes
    )
    
    # Send verification messages (WhatsApp always attempted, email only if SMTP configured)
    result = VerificationService.send_verification_messages(
        db=db,
        user=user,
        verification_token=verification_token,
        frontend_url=settings.FRONTEND_URL,
        admin_smtp_email=admin.smtp_email if admin else None,
        admin_smtp_password=admin.smtp_password if admin else None,
    )
    verification_result = {
        "email_sent": result.get("email_sent", False),
        "whatsapp_sent": result.get("whatsapp_sent", False),
        "expires_in_minutes": validity_minutes,
    }
    
    return {
        "message": "Registration successful! Please check your email and WhatsApp to verify your account.",
        "user_id": user.id,
        "student_id": student.id,
        "verification_sent": verification_result,
        "note": "Account will be activated after verification. The verification link is valid for {} minutes.".format(validity_minutes)
    }


@router.post(
    "/register/instructor", response_model=dict, status_code=status.HTTP_201_CREATED
)
@limiter.limit("3/hour")  # Max 3 instructor registrations per hour per IP
async def register_instructor(
    request: Request,  # Required for rate limiter
    instructor_data: InstructorCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new instructor
    Note: Admin user must exist before instructors can register
    Creates user as inactive and sends email/WhatsApp verification
    """
    from ..services.initialization import InitializationService
    from ..services.verification_service import VerificationService
    from ..config import settings
    
    # Check if admin exists
    if not InitializationService.admin_exists(db):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="System is not initialized. Please contact administrator to complete initial setup first.",
        )
    
    try:
        print(f"[DEBUG] Received instructor registration data: {instructor_data}")
        
        # Create instructor (user will be inactive)
        user, instructor = AuthService.create_instructor(db, instructor_data)
        
        # Get admin SMTP settings
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        validity_minutes = admin.verification_link_validity_minutes if admin else 30
        
        # Create verification token
        verification_token = VerificationService.create_verification_token(
            db=db,
            user_id=user.id,
            token_type="email",
            validity_minutes=validity_minutes
        )
        
        # Send verification messages (WhatsApp always attempted, email only if SMTP configured)
        result = VerificationService.send_verification_messages(
            db=db,
            user=user,
            verification_token=verification_token,
            frontend_url=settings.FRONTEND_URL,
            admin_smtp_email=admin.smtp_email if admin else None,
            admin_smtp_password=admin.smtp_password if admin else None,
        )
        verification_result = {
            "email_sent": result.get("email_sent", False),
            "whatsapp_sent": result.get("whatsapp_sent", False),
            "expires_in_minutes": validity_minutes,
        }
        
        return {
            "message": "Registration successful! Please check your email and WhatsApp to verify your account.",
            "user_id": user.id,
            "instructor_id": instructor.id,
            "verification_sent": verification_result,
            "note": "Account will be activated after verification. The verification link is valid for {} minutes.".format(validity_minutes)
        }
    except Exception as e:
        print(f"[ERROR] Registration failed: {type(e).__name__}: {str(e)}")
        import traceback

        traceback.print_exc()
        raise


@router.post("/login", response_model=dict)
@limiter.limit("5/minute")  # Max 5 login attempts per minute per IP
async def login(
    request: Request,  # Required for rate limiter
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    role: str | None = Form(None),
    db: Session = Depends(get_db),
):
    """
    Login with email/phone and password
    """
    # authenticate_user now raises HTTPException with specific error messages
    user = AuthService.authenticate_user(db, form_data.username, form_data.password)
    
    print(f"🔐 [LOGIN] User: {user.email}, Received role param: {role}")

    available_roles: set[str] = set()

    if user.role == UserRole.ADMIN:
        available_roles.add(UserRole.ADMIN.value)
    if user.role == UserRole.INSTRUCTOR:
        available_roles.add(UserRole.INSTRUCTOR.value)
    if user.role == UserRole.STUDENT:
        available_roles.add(UserRole.STUDENT.value)

    if db.query(Instructor).filter(Instructor.user_id == user.id).first():
        available_roles.add(UserRole.INSTRUCTOR.value)
    if db.query(Student).filter(Student.user_id == user.id).first():
        available_roles.add(UserRole.STUDENT.value)

    print(f"🔐 [LOGIN] Available roles for {user.email}: {available_roles}")

    if role is None and len(available_roles) > 1:
        print(f"🔐 [LOGIN] Multiple roles available, returning role selection required")
        return {
            "requires_role_selection": True,
            "available_roles": sorted(list(available_roles)),
        }

    selected_role = role or next(iter(available_roles))
    if selected_role not in available_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role selection for this account.",
        )

    print(f"🔐 [LOGIN] Creating token with selected_role: {selected_role}")
    access_token = AuthService.create_user_token(user, selected_role)

    print(f"🔐 [LOGIN] Returning role: {selected_role}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": selected_role,
    }


@router.get("/me")
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get current user information with profile details
    """
    active_role = getattr(current_user, "active_role", current_user.role.value)
    user_data = {
        "id": current_user.id,
        "email": current_user.email,
        "phone": current_user.phone,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role": active_role,
        "status": current_user.status.value,
        "id_number": current_user.id_number,
        "address": current_user.address,
    }

    # Add role-specific details
    if active_role == UserRole.INSTRUCTOR.value:
        instructor = (
            db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
        )
        if instructor:
            # Calculate total earnings from completed bookings
            from ..models.booking import Booking, BookingStatus, PaymentStatus
            total_earnings = (
                db.query(func.sum(Booking.amount))
                .filter(
                    Booking.instructor_id == instructor.id,
                    Booking.status == BookingStatus.COMPLETED,
                    Booking.payment_status == PaymentStatus.PAID,
                )
                .scalar()
                or 0.0
            )
            
            user_data.update(
                {
                    "instructor_id": instructor.id,
                    "license_types": instructor.license_types,
                    "hourly_rate": float(instructor.hourly_rate),
                    "is_available": instructor.is_available,
                    "total_earnings": float(total_earnings),
                    "rating": float(instructor.rating) if instructor.rating else 0.0,
                }
            )

    elif active_role == UserRole.STUDENT.value:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            user_data.update(
                {
                    "id_number": student.id_number,
                    "learners_permit_number": student.learners_permit_number,
                    "emergency_contact_name": student.emergency_contact_name,
                    "emergency_contact_phone": student.emergency_contact_phone,
                }
            )

    return user_data


@router.get("/inactivity-timeout")
async def get_inactivity_timeout(db: Session = Depends(get_db)):
    """
    Get global inactivity timeout setting (public endpoint - no auth required)
    Used by frontend to configure auto-logout timer
    """
    try:
        # Get first admin's settings (global config)
        from ..models.user import UserRole
        
        admin = db.query(User).filter(User.role == UserRole.ADMIN).order_by(User.id.asc()).first()
        
        if admin and admin.inactivity_timeout_minutes:
            return {"inactivity_timeout_minutes": admin.inactivity_timeout_minutes}
        
        # Default to 15 minutes if not configured
        return {"inactivity_timeout_minutes": 15}
    except Exception as e:
        print(f"Error fetching inactivity timeout: {str(e)}")
        # Return default on error
        return {"inactivity_timeout_minutes": 15}


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Update current user's basic profile information
    """
    # Update only provided fields
    if user_update.first_name is not None:
        current_user.first_name = user_update.first_name
    if user_update.last_name is not None:
        current_user.last_name = user_update.last_name
    if user_update.phone is not None:
        current_user.phone = user_update.phone
    if user_update.id_number is not None:
        current_user.id_number = user_update.id_number
    if user_update.address is not None:
        current_user.address = user_update.address

    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Change user's password
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Password changed successfully"}


@router.post("/forgot-password")
@limiter.limit("3/hour")  # Max 3 password reset requests per hour per IP
async def forgot_password(
    request: Request,  # Required for rate limiter
    password_request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Request password reset - sends email with reset token
    """
    # Find user by email
    user = db.query(User).filter(User.email == password_request.email).first()

    # Always return success to prevent email enumeration attacks
    if not user:
        return {
            "message": "If an account with that email exists, a password reset link has been sent."
        }

    # Delete any existing unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None)
    ).delete()
    db.commit()

    # Generate new reset token
    reset_token = PasswordResetToken.generate_token()
    expires_at = PasswordResetToken.get_expiration_time()

    # Save token to database
    token_record = PasswordResetToken(
        user_id=user.id, token=reset_token, expires_at=expires_at
    )
    db.add(token_record)
    db.commit()

    # Send email with reset link
    email_sent = email_service.send_password_reset_email(
        to_email=user.email, reset_token=reset_token, user_name=user.first_name
    )

    if not email_sent:
        # Log the token for development/testing purposes
        print(f"🔑 Password reset token for {user.email}: {reset_token}")

    return {
        "message": "If an account with that email exists, a password reset link has been sent."
    }


@router.post("/reset-password")
@limiter.limit("5/hour")  # Max 5 password resets per hour per IP
async def reset_password(
    request: Request,  # Required for rate limiter
    reset_data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Reset password using token from email
    """
    # Find token
    token_record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token == reset_data.token)
        .first()
    )

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Check if token is valid
    if not token_record.is_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Get user
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User not found"
        )

    # Update password
    user.password_hash = get_password_hash(reset_data.new_password)

    # Mark token as used
    token_record.used_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "message": "Password reset successfully. You can now log in with your new password."
    }
