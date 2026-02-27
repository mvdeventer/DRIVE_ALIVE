"""
Authentication routes
"""

from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Cookie, Depends, Form, HTTPException, Query, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from ..config import settings
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
from ..utils.encryption import EncryptionService  # For SMTP password decryption

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Handle CORS preflight requests for registration endpoints
@router.options("/register/student")
async def options_register_student():
    """Handle OPTIONS preflight requests for CORS"""
    return {"ok": True}


@router.options("/register/instructor")
async def options_register_instructor():
    """Handle OPTIONS preflight requests for CORS"""
    return {"ok": True}


@router.options("/login")
async def options_login():
    """Handle OPTIONS preflight requests for CORS"""
    return {"ok": True}


@router.options("/me")
async def options_me():
    """Handle OPTIONS preflight requests for CORS"""
    return {"ok": True}


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    access_token: Optional[str] = Cookie(None)
) -> User:
    """
    Get current authenticated user from HTTP-only cookie (preferred) or Authorization header (fallback)
    """
    # Try cookie first (HTTP-only, more secure)
    token = access_token
    
    # Fallback to Authorization header for mobile/API clients
    if not token:
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    # ── Single-session validation ─────────────────────────────────────────────
    # Each JWT carries a `jti` (session token ID). If the DB no longer holds this
    # token (because the user logged in elsewhere), reject the request.
    jti = payload.get("jti")
    if jti is not None and user.active_session_token != jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has been ended from another device. Please log in again.",
            headers={"WWW-Authenticate": "Bearer", "X-Error-Code": "SESSION_INVALIDATED"},
        )
    # ─────────────────────────────────────────────────────────────────────────

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
    response: Response,  # Required for rate limiter to inject headers
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
    # Decrypt admin's SMTP password before passing to email service
    smtp_password = EncryptionService.decrypt(admin.smtp_password) if admin and admin.smtp_password else None
    
    result = VerificationService.send_verification_messages(
        db=db,
        user=user,
        verification_token=verification_token,
        frontend_url=settings.FRONTEND_URL,
        admin_smtp_email=admin.smtp_email if admin else None,
        admin_smtp_password=smtp_password,
        notify_admins=True,  # Enable admin notifications for student registrations
        user_type="student"
    )
    verification_result = {
        "email_sent": result.get("email_sent", False),
        "whatsapp_sent": result.get("whatsapp_sent", False),
        "expires_in_minutes": validity_minutes,
        "admins_notified": result.get("total_admins_notified", 0),
        "admin_emails_sent": result.get("admin_emails_sent", 0),
        "admin_whatsapp_sent": result.get("admin_whatsapp_sent", 0),
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
    response: Response,  # Required for rate limiter to inject headers
    instructor_data: InstructorCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new instructor
    - Creates instructor with pending verification status
    - Sends user account verification link to the instructor (email + WhatsApp)
    - Sends instructor credential verification link to all admins (email + WhatsApp)
    - Instructor can setup schedule immediately (before admin verification)
    - Admin can verify instructor credentials via link or manually from dashboard
    """
    from ..services.initialization import InitializationService
    from ..services.instructor_verification_service import InstructorVerificationService
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
        
        # Create instructor (user will be INACTIVE, instructor not verified)
        user, instructor = AuthService.create_instructor(db, instructor_data)
        
        # Get admin settings for token validity
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        validity_minutes = admin.verification_link_validity_minutes if admin else 60
        
        # 1. Send USER ACCOUNT verification to the instructor (to activate their login)
        user_verification_token = VerificationService.create_verification_token(
            db=db,
            user_id=user.id,
            token_type="email",
            validity_minutes=validity_minutes,
        )
        
        smtp_password = EncryptionService.decrypt(admin.smtp_password) if admin and admin.smtp_password else None
        
        user_verification_result = VerificationService.send_verification_messages(
            db=db,
            user=user,
            verification_token=user_verification_token,
            frontend_url=settings.FRONTEND_URL,
            admin_smtp_email=admin.smtp_email if admin else None,
            admin_smtp_password=smtp_password,
        )
        
        # 2. Send INSTRUCTOR CREDENTIAL verification to all admins
        instructor_verification_token = InstructorVerificationService.create_verification_token(
            db=db,
            instructor_id=instructor.id,
            validity_minutes=validity_minutes
        )
        
        admin_verification_result = InstructorVerificationService.send_verification_to_all_admins(
            db=db,
            instructor=instructor,
            verification_token=instructor_verification_token,
            frontend_url=settings.FRONTEND_URL,
        )
        
        return {
            "message": "Registration successful! Please verify your account via email/WhatsApp. Admins have also been notified to verify your instructor credentials.",
            "user_id": user.id,
            "instructor_id": instructor.id,
            "setup_token": instructor.setup_token,
            "verification_sent": {
                "email_sent": user_verification_result.get("email_sent", False),
                "whatsapp_sent": user_verification_result.get("whatsapp_sent", False),
                "expires_in_minutes": validity_minutes,
                "emails_sent": admin_verification_result["emails_sent"],
                "whatsapp_sent_to_admins": admin_verification_result["whatsapp_sent"],
                "total_admins": admin_verification_result["total_admins"],
            },
            "note": f"Please verify your account to log in. Admins ({admin_verification_result['total_admins']}) have been notified to verify your instructor credentials.",
        }
    except Exception as e:
        print(f"[ERROR] Registration failed: {type(e).__name__}: {str(e)}")
        import traceback

        traceback.print_exc()
        raise


@router.post("/login", response_model=dict)
@limiter.limit("5/minute")  # Max 5 login attempts per minute per IP
async def login(
    response: Response,  # Required for setting cookies
    request: Request,  # Required for rate limiter
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    role: str | None = Form(None),
    force_login: bool = Form(False),
    db: Session = Depends(get_db),
):
    """
    Login with email/phone and password.
    Single-session enforcement: each user may only be logged in from one device at a time.
    Pass force_login=true to invalidate any existing session and log in anyway.
    """
    # authenticate_user now raises HTTPException with specific error messages
    user = AuthService.authenticate_user(db, form_data.username, form_data.password)
    
    print(f"🔐 [LOGIN] User: {user.email}, Received role param: {role}, force_login: {force_login}")

    # ── Single-session check ──────────────────────────────────────────────────
    if user.active_session_token is not None and not force_login:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "You are already logged in from another device or browser. Log out there first, or choose 'Force Login' to end that session.",
                "error_code": "ALREADY_LOGGED_IN",
            },
        )
    # ─────────────────────────────────────────────────────────────────────────

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
    access_token = AuthService.create_user_token(user, selected_role, db=db)
    
    # Set HTTP-only cookie for web security (prevents XSS token theft)
    is_secure_cookie = settings.ENVIRONMENT.lower() == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,  # JavaScript cannot access (XSS protection)
        secure=is_secure_cookie,  # True in production with HTTPS
        samesite="lax",  # CSRF protection
        max_age=3600 * 24 * 7,  # 7 days
    )

    print(f"🔐 [LOGIN] Returning role: {selected_role}")
    return {
        "access_token": access_token,  # Still return for mobile/API clients
        "token_type": "bearer",
        "role": selected_role,
    }


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    access_token: Optional[str] = Cookie(None),
):
    """
    Logout user: clear HTTP-only cookie and invalidate the active session token in the DB
    so that the same user cannot remain logged in from another device after this logout.
    """
    # Attempt to decode the token to locate the user and clear their session token.
    # We do this softly (no exception on mismatch) so the logout always succeeds.
    token = access_token
    if not token:
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")

    if token:
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == int(user_id)).first()
                if user:
                    user.active_session_token = None
                    db.commit()
                    print(f"🔓 [LOGOUT] Cleared active_session_token for user {user.email}")

    response.delete_cookie(key="access_token")
    return {"message": "Successfully logged out"}


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


@router.get("/check-unique")
async def check_unique_fields(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    email: Optional[str] = Query(None),
    id_number: Optional[str] = Query(None),
    exclude_user_id: Optional[int] = Query(None),
):
    """
    Check if email or id_number are already in use by another user.
    exclude_user_id: the user being edited (so their own values don't conflict).
    """
    exclude_id = exclude_user_id or current_user.id
    conflicts = {}

    if email:
        existing = db.query(User).filter(
            User.email == email,
            User.id != exclude_id
        ).first()
        if existing:
            conflicts["email"] = "This email is already in use by another user"

    if id_number:
        existing = db.query(User).filter(
            User.id_number == id_number,
            User.id != exclude_id
        ).first()
        if existing:
            conflicts["id_number"] = "This ID number is already in use by another user"

    return {"conflicts": conflicts, "is_unique": len(conflicts) == 0}


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Update current user's basic profile information
    """
    # Check email uniqueness if email is being changed
    if user_update.email is not None and user_update.email != current_user.email:
        existing = db.query(User).filter(
            User.email == user_update.email,
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is already in use by another user",
            )
        current_user.email = user_update.email

    # Check id_number uniqueness if being changed
    if user_update.id_number is not None and user_update.id_number != current_user.id_number:
        existing = db.query(User).filter(
            User.id_number == user_update.id_number,
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This ID number is already in use by another user",
            )
        current_user.id_number = user_update.id_number

    # Update other provided fields
    if user_update.first_name is not None:
        current_user.first_name = user_update.first_name
    if user_update.last_name is not None:
        current_user.last_name = user_update.last_name
    if user_update.phone is not None:
        current_user.phone = user_update.phone
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
    response: Response,  # Required for rate limiter to inject headers
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
    response: Response,  # Required for rate limiter to inject headers
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
