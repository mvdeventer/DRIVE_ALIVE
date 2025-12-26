"""
Student routes
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import Student as StudentModel
from ..models.user import User, UserRole
from ..routes.auth import get_current_user
from ..schemas.user import StudentResponse, StudentUpdate

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/me", response_model=StudentResponse)
async def get_student_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get current student's profile
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access student profile",
        )

    student = db.query(StudentModel).filter(StudentModel.user_id == current_user.id).first()

    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    # Build response dict to avoid type checking warnings
    response_data = {
        "id": current_user.id,
        "email": current_user.email,
        "phone": current_user.phone,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role": current_user.role,
        "status": current_user.status,
        "created_at": current_user.created_at,
        "student_id": student.id,
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
    return StudentResponse(**response_data)


@router.put("/me", response_model=StudentResponse)
async def update_student_profile(
    student_data: StudentUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Update student profile (students only)
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can update student profile",
        )

    student = db.query(StudentModel).filter(StudentModel.user_id == current_user.id).first()

    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    # Update fields
    for field, value in student_data.model_dump(exclude_unset=True).items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)

    # Build response dict to avoid type checking warnings
    response_data = {
        "id": current_user.id,
        "email": current_user.email,
        "phone": current_user.phone,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role": current_user.role,
        "status": current_user.status,
        "created_at": current_user.created_at,
        "student_id": student.id,
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
    return StudentResponse(**response_data)


@router.get('/{student_id}', response_model=StudentResponse)
async def get_student(student_id: int, db: Session = Depends(get_db)):
    '''
    Get student by student_id (NOT user_id!)
    '''
    student = db.query(StudentModel).filter(StudentModel.id == student_id).first()

    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Student not found')

    user = db.query(User).filter(User.id == student.user_id).first()

    response_data = {
        'id': user.id,
        'email': user.email,
        'phone': user.phone,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'status': user.status,
        'created_at': user.created_at,
        'student_id': student.id,
        'id_number': student.id_number,
        'learners_permit_number': student.learners_permit_number,
        'emergency_contact_name': student.emergency_contact_name,
        'emergency_contact_phone': student.emergency_contact_phone,
        'address_line1': student.address_line1,
        'address_line2': student.address_line2,
        'province': student.province,
        'city': student.city,
        'suburb': student.suburb,
        'postal_code': student.postal_code,
    }
    return StudentResponse(**response_data)


@router.get('/by-user/{user_id}')
async def get_student_by_user_id(user_id: int, db: Session = Depends(get_db)):
    '''
    Get student_id by user_id (for admin looking up students by user record)
    Returns just the student_id for further lookups
    '''
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='User is not a student')

    student = db.query(StudentModel).filter(StudentModel.user_id == user_id).first()

    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Student profile not found')

    return {'student_id': student.id}
