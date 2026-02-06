"""
Authentication service
"""

from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..models.user import Instructor, Student, User, UserRole, UserStatus
from ..schemas.user import InstructorCreate, StudentCreate, UserCreate
from ..utils.auth import create_access_token, get_password_hash, verify_password


class AuthService:
    """Authentication service"""

    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """
        Create a new user
        """
        # Check if user exists
        existing_user = db.query(User).filter((User.email == user_data.email) | (User.phone == user_data.phone)).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email or phone already exists",
            )

        # Create user
        user = User(
            email=user_data.email,
            phone=user_data.phone,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            password_hash=get_password_hash(user_data.password),
            role=user_data.role,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return user

    @staticmethod
    def create_instructor(db: Session, instructor_data: InstructorCreate) -> tuple[User, Instructor]:
        """
        Create a new instructor with profile
        """
        try:
            # Check if email exists - allow multi-role users
            existing_user = db.query(User).filter(User.email == instructor_data.email).first()
            
            if existing_user:
                # User exists - check if they already have an instructor profile
                existing_instructor = db.query(Instructor).filter(Instructor.user_id == existing_user.id).first()
                if existing_instructor:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"This email already has an instructor profile. Please log in instead.",
                    )
                
                # Verify password matches (for security)
                if not verify_password(instructor_data.password, existing_user.password_hash):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Email is already registered with a different password. Please use the correct password or log in to add instructor role.",
                    )
                
                # User is adding instructor role - allow phone/ID to be reused for same user
                user = existing_user
                print(f"[DEBUG] Adding instructor role to existing user {user.id} with email {user.email}")
            else:
                # New user - check if phone/ID belong to another user
                phone_user = db.query(User).filter(User.phone == instructor_data.phone).first()
                if phone_user:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Phone number '{instructor_data.phone}' is already registered to another account. Please use a different phone number.",
                    )
                
                # Check if ID number belongs to another user
                existing_instructor_id = db.query(Instructor).filter(Instructor.id_number == instructor_data.id_number).first()
                if existing_instructor_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"ID number '{instructor_data.id_number}' is already registered to another instructor. Please check your ID number.",
                    )
                
                existing_student_id = db.query(Student).filter(Student.id_number == instructor_data.id_number).first()
                if existing_student_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"ID number '{instructor_data.id_number}' is already registered to another student. Please check your ID number.",
                    )
                
                # Create new user (INACTIVE - requires email/WhatsApp verification)
                user = User(
                    email=instructor_data.email,
                    phone=instructor_data.phone,
                    first_name=instructor_data.first_name,
                    last_name=instructor_data.last_name,
                    password_hash=get_password_hash(instructor_data.password),
                    role=UserRole.INSTRUCTOR,
                    status=UserStatus.INACTIVE,  # Requires verification
                )
                db.add(user)
                db.flush()  # Flush to get user.id without committing
                print(f"[DEBUG] Created new user {user.id} with email {user.email} for instructor role (INACTIVE - awaiting verification)")

            # Check if license number exists
            existing_license = db.query(Instructor).filter(Instructor.license_number == instructor_data.license_number).first()
            if existing_license:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"License number '{instructor_data.license_number}' is already registered. Please check your license number.",
                )

            # Create instructor profile
            instructor = Instructor(
                user_id=user.id,
                license_number=instructor_data.license_number,
                license_types=instructor_data.license_types,
                id_number=instructor_data.id_number,
                vehicle_registration=instructor_data.vehicle_registration,
                vehicle_make=instructor_data.vehicle_make,
                vehicle_model=instructor_data.vehicle_model,
                vehicle_year=instructor_data.vehicle_year,
                province=instructor_data.province,
                city=instructor_data.city,
                suburb=instructor_data.suburb,
                hourly_rate=instructor_data.hourly_rate,
                service_radius_km=instructor_data.service_radius_km,
                max_travel_distance_km=instructor_data.max_travel_distance_km,
                rate_per_km_beyond_radius=instructor_data.rate_per_km_beyond_radius,
                bio=instructor_data.bio,
            )

            # Auto-verify only in debug mode
            if settings.should_auto_verify_instructors:
                instructor.is_verified = True
                instructor.verified_at = datetime.utcnow()
                print(f"[DEBUG] Auto-verified instructor {instructor.id} (debug mode enabled)")
            else:
                print(f"[INFO] Instructor {instructor.id} created - requires manual verification")

            db.add(instructor)

            # Commit both user and instructor together
            db.commit()
            db.refresh(user)
            db.refresh(instructor)

            # Trigger backup after successful role creation
            try:
                from .backup_scheduler import backup_scheduler
                backup_scheduler.create_backup(
                    f"role_creation_instructor_{user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                )
            except Exception as e:
                # Log but don't fail the request if backup fails
                print(f"Warning: Backup after instructor role creation failed: {e}")

            return user, instructor

        except HTTPException:
            db.rollback()
            raise
        except IntegrityError as e:
            db.rollback()
            # Check if it's a duplicate license number error
            if "license_number" in str(e.orig):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="License number already in use. Please check your license number.",
                )
            # Re-raise other integrity errors
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed due to duplicate data.",
            )
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def create_student(db: Session, student_data: StudentCreate) -> tuple[User, Student]:
        """
        Create a new student with profile
        """
        try:
            # Check if email exists - allow multi-role users
            existing_user = db.query(User).filter(User.email == student_data.email).first()
            
            if existing_user:
                # User exists - check if they already have a student profile
                existing_student = db.query(Student).filter(Student.user_id == existing_user.id).first()
                if existing_student:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"This email already has a student profile. Please log in instead.",
                    )
                
                # Verify password matches (for security)
                if not verify_password(student_data.password, existing_user.password_hash):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Email is already registered with a different password. Please use the correct password or log in to add student role.",
                    )
                
                # Use existing user
                user = existing_user
            else:
                # New user - check if phone/ID belong to another user
                phone_user = db.query(User).filter(User.phone == student_data.phone).first()
                if phone_user:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Phone number '{student_data.phone}' is already registered to another account. Please use a different phone number.",
                    )
                
                # Check if ID number belongs to another user
                existing_instructor_id = db.query(Instructor).filter(Instructor.id_number == student_data.id_number).first()
                if existing_instructor_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"ID number '{student_data.id_number}' is already registered to another instructor. Please check your ID number.",
                    )
                
                existing_student_id = db.query(Student).filter(Student.id_number == student_data.id_number).first()
                if existing_student_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"ID number '{student_data.id_number}' is already registered to another student. Please check your ID number.",
                    )
                
                # Create new user (INACTIVE - requires email/WhatsApp verification)
                user = User(
                    email=student_data.email,
                    phone=student_data.phone,
                    first_name=student_data.first_name,
                    last_name=student_data.last_name,
                    password_hash=get_password_hash(student_data.password),
                    role=UserRole.STUDENT,
                    status=UserStatus.INACTIVE,  # Requires verification
                )
                db.add(user)
                db.flush()  # Flush to get user.id without committing

            # Create student profile
            student = Student(
                user_id=user.id,
                id_number=student_data.id_number,
                learners_permit_number=student_data.learners_permit_number,
                emergency_contact_name=student_data.emergency_contact_name,
                emergency_contact_phone=student_data.emergency_contact_phone,
                address_line1=student_data.address_line1,
                address_line2=student_data.address_line2,
                province=student_data.province,
                city=student_data.city,
                suburb=student_data.suburb,
                postal_code=student_data.postal_code,
            )

            db.add(student)

            # Commit both user and student together
            db.commit()
            db.refresh(user)
            db.refresh(student)

            # Trigger backup after successful role creation
            try:
                from .backup_scheduler import backup_scheduler
                backup_scheduler.create_backup(
                    f"role_creation_student_{user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                )
            except Exception as e:
                # Log but don't fail the request if backup fails
                print(f"Warning: Backup after student role creation failed: {e}")

            return user, student

        except HTTPException:
            db.rollback()
            raise
        except IntegrityError:
            db.rollback()
            # Re-raise integrity errors with generic message
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed due to duplicate data.",
            )
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def authenticate_user(db: Session, email_or_phone: str, password: str) -> Optional[User]:
        """
        Authenticate a user by email or phone number
        Raises HTTPException with specific error messages
        """
        # Try to find user by email or phone
        user = db.query(User).filter((User.email == email_or_phone) | (User.phone == email_or_phone)).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User does not exist. Please register first.",
            )

        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password",
            )

        # Check user status - only active users can log in
        from ..models.user import UserStatus

        if user.status == UserStatus.INACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is not verified. Please check your email and WhatsApp for the verification link. If you didn't receive it, please register again.",
            )
        elif user.status == UserStatus.SUSPENDED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is SUSPENDED. Please contact support for more information.",
            )

        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()

        return user

    @staticmethod
    def create_user_token(user: User, role: Optional[str] = None) -> str:
        """
        Create access token for user
        """
        selected_role = role or user.role.value
        print(f"🔑 [CREATE_TOKEN] User: {user.email}, role param: {role}, user.role: {user.role.value}, selected_role: {selected_role}")
        token_data = {"sub": str(user.id), "email": user.email, "role": selected_role}
        print(f"🔑 [CREATE_TOKEN] Token data: {token_data}")

        return create_access_token(token_data)
