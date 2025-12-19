"""
Authentication service
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

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
            hourly_rate=instructor_data.hourly_rate,
            service_radius_km=instructor_data.service_radius_km,
            max_travel_distance_km=instructor_data.max_travel_distance_km,
            rate_per_km_beyond_radius=instructor_data.rate_per_km_beyond_radius,
            bio=instructor_data.bio,
        )

        db.add(instructor)
        db.commit()
        db.refresh(instructor)

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
            city=student_data.city,
            province=student_data.province,
            postal_code=student_data.postal_code,
        )

        db.add(student)
        db.commit()
        db.refresh(student)

        return user, student

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """
        Authenticate a user
        """
        user = db.query(User).filter(User.email == email).first()

        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

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
