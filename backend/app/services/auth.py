"""
Authentication service
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..models.user import Instructor, Student, User, UserRole
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
        # Set role to instructor
        instructor_data.role = UserRole.INSTRUCTOR
        # Create user
        user = AuthService.create_user(db, instructor_data)

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

        # Auto-verify in development mode
        if settings.AUTO_VERIFY_INSTRUCTORS:
            instructor.is_verified = True
            instructor.verified_at = datetime.utcnow()

        db.add(instructor)

        try:
            db.commit()
            db.refresh(instructor)
        except IntegrityError as e:
            db.rollback()
            # Check if it's a duplicate ID number error
            if "id_number" in str(e.orig):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID number already in use. Please check your ID number.",
                )
            # Re-raise other integrity errors
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed due to duplicate data.",
            )

        return user, instructor

    @staticmethod
    def create_student(db: Session, student_data: StudentCreate) -> tuple[User, Student]:
        """
        Create a new student with profile
        """
        # Set role to student
        student_data.role = UserRole.STUDENT
        # Create user
        user = AuthService.create_user(db, student_data)

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

        try:
            db.commit()
            db.refresh(student)
        except IntegrityError as e:
            db.rollback()
            # Check if it's a duplicate ID number error
            if "id_number" in str(e.orig):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID number already in use. Please check your ID number.",
                )
            # Re-raise other integrity errors
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed due to duplicate data.",
            )

        return user, student

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

        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()

        return user

    @staticmethod
    def create_user_token(user: User) -> str:
        """
        Create access token for user
        """
        token_data = {"sub": str(user.id), "email": user.email, "role": user.role.value}

        return create_access_token(token_data)
