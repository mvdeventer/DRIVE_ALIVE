"""
Database Interface Routes - Admin CRUD operations for all database tables
Platform: Windows PC Web Browsers ONLY
Security: Admin authentication required, password fields excluded
Standards: REST API, OpenAPI 3.0, RFC 7807 error responses
"""

from fastapi import APIRouter, Depends, Query, Header, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
import hashlib
from datetime import datetime, timezone

from ..database import get_db
from ..middleware.admin import require_admin
from ..models.user import User, UserRole, UserStatus, Instructor, Student
from ..models.booking import Booking, BookingStatus, PaymentStatus, Review
from ..models.availability import InstructorSchedule
from ..schemas.database_interface import (
    TableListResponse,
    UserDetailResponse,
    UserUpdateRequest,
    InstructorUpdateRequest,
    StudentUpdateRequest,
    BookingUpdateRequest,
    BulkUpdateRequest,
    BulkUpdateResponse
)

router = APIRouter(
    prefix="/admin/database-interface",
    tags=["admin-database-interface"],
    dependencies=[Depends(require_admin)]
)


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def generate_etag(obj) -> str:
    """Generate ETag from object's updated_at timestamp for optimistic locking"""
    if hasattr(obj, 'updated_at') and obj.updated_at:
        timestamp = obj.updated_at.isoformat()
    elif hasattr(obj, 'created_at') and obj.created_at:
        timestamp = obj.created_at.isoformat()
    else:
        timestamp = str(obj.id)
    
    return hashlib.sha256(timestamp.encode()).hexdigest()


def parse_link_header(base_url: str, page: int, page_size: int, total_pages: int) -> str:
    """Generate RFC 5988 Link header for pagination"""
    links = []
    
    if page > 1:
        links.append(f'<{base_url}?page=1&page_size={page_size}>; rel="first"')
        links.append(f'<{base_url}?page={page-1}&page_size={page_size}>; rel="prev"')
    
    if page < total_pages:
        links.append(f'<{base_url}?page={page+1}&page_size={page_size}>; rel="next"')
        links.append(f'<{base_url}?page={total_pages}&page_size={page_size}>; rel="last"')
    
    return ', '.join(links)


# ============================================================================
# USERS ENDPOINTS
# ============================================================================

@router.get("/users", response_model=TableListResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=200, description="Records per page"),
    search: Optional[str] = Query(None, description="Search by name, email, phone"),
    filter_role: Optional[str] = Query(None, description="Filter by role (STUDENT, INSTRUCTOR, ADMIN)"),
    filter_status: Optional[str] = Query(None, description="Filter by status (ACTIVE, INACTIVE, SUSPENDED)"),
    sort: Optional[str] = Query("-created_at", description="Sort field (prefix with - for descending)"),
    db: Session = Depends(get_db)
):
    """
    List all users with pagination, search, and filtering
    
    Query Parameters:
    - search: Search in first_name, last_name, email, phone
    - filter_role: STUDENT, INSTRUCTOR, ADMIN
    - filter_status: ACTIVE, INACTIVE, SUSPENDED
    - sort: Field name (e.g., 'email', '-created_at' for descending)
    
    Response includes Link header (RFC 5988) for pagination
    """
    # Build query
    query = db.query(User)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                User.email.ilike(search_term),
                User.phone.ilike(search_term)
            )
        )
    
    # Apply role filter
    if filter_role:
        try:
            role = UserRole[filter_role.upper()]
            query = query.filter(User.role == role)
        except KeyError:
            raise HTTPException(400, detail=f"Invalid role: {filter_role}")
    
    # Apply status filter
    if filter_status:
        try:
            status_enum = UserStatus[filter_status.upper()]
            query = query.filter(User.status == status_enum)
        except KeyError:
            raise HTTPException(400, detail=f"Invalid status: {filter_status}")
    
    # Apply sorting
    if sort:
        descending = sort.startswith('-')
        field_name = sort[1:] if descending else sort
        
        if not hasattr(User, field_name):
            raise HTTPException(400, detail=f"Invalid sort field: {field_name}")
        
        field = getattr(User, field_name)
        query = query.order_by(field.desc() if descending else field.asc())
    
    # Get total count
    total = query.count()
    total_pages = (total + page_size - 1) // page_size
    
    # Apply pagination
    offset = (page - 1) * page_size
    users = query.offset(offset).limit(page_size).all()
    
    # Convert to response format (exclude sensitive fields)
    data = [
        {
            "id": user.id,
            "email": user.email,
            "phone": user.phone,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "id_number": user.id_number,
            "role": user.role.value if user.role else None,
            "status": user.status.value if user.status else None,
            "address": user.address,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        }
        for user in users
    ]
    
    return {
        "data": data,
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        },
        "links": {
            "self": f"/admin/database-interface/users?page={page}&page_size={page_size}",
            "first": f"/admin/database-interface/users?page=1&page_size={page_size}",
            "last": f"/admin/database-interface/users?page={total_pages}&page_size={page_size}",
            "prev": f"/admin/database-interface/users?page={page-1}&page_size={page_size}" if page > 1 else None,
            "next": f"/admin/database-interface/users?page={page+1}&page_size={page_size}" if page < total_pages else None,
        }
    }


@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get single user by ID with ETag header for optimistic locking"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail={
                "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
                "title": "User Not Found",
                "status": 404,
                "detail": f"User with ID {user_id} does not exist",
                "instance": f"/admin/database-interface/users/{user_id}"
            }
        )
    
    # Generate ETag for optimistic locking
    etag = generate_etag(user)
    
    return {
        "data": {
            "id": user.id,
            "email": user.email,
            "phone": user.phone,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "id_number": user.id_number,
            "role": user.role.value if user.role else None,
            "status": user.status.value if user.status else None,
            "address": user.address,
            "firebase_uid": user.firebase_uid,
            "smtp_email": user.smtp_email,
            # smtp_password excluded for security
            "verification_link_validity_minutes": user.verification_link_validity_minutes,
            "twilio_sender_phone_number": user.twilio_sender_phone_number,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        },
        "meta": {
            "etag": etag,
            "last_modified": user.updated_at.isoformat() if user.updated_at else user.created_at.isoformat()
        }
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    data: UserUpdateRequest,
    if_match: Optional[str] = Header(None, description="ETag for optimistic locking"),
    db: Session = Depends(get_db)
):
    """
    Update user record (full update - idempotent)
    
    Headers:
    - If-Match: ETag from GET request (prevents concurrent modification)
    
    Excludes: password_hash, smtp_password (use dedicated endpoints)
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(404, detail=f"User with ID {user_id} not found")
    
    # Check optimistic locking
    if if_match:
        current_etag = generate_etag(user)
        if if_match != current_etag:
            raise HTTPException(
                status_code=409,
                detail={
                    "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
                    "title": "Conflict - Record Modified",
                    "status": 409,
                    "detail": "This record was modified by another user. Please refresh and try again.",
                    "instance": f"/admin/database-interface/users/{user_id}"
                }
            )
    
    # Update fields (exclude unset to allow partial updates)
    update_data = data.dict(exclude_unset=True)
    
    # Convert enum strings to enum values
    if "role" in update_data:
        update_data["role"] = UserRole[update_data["role"].upper()]
    if "status" in update_data:
        update_data["status"] = UserStatus[update_data["status"].upper()]
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    user.updated_at = datetime.now(timezone.utc)
    
    try:
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=f"Database error: {str(e)}")
    
    # Return updated record with new ETag
    new_etag = generate_etag(user)
    
    return {
        "data": {
            "id": user.id,
            "email": user.email,
            "phone": user.phone,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value if user.role else None,
            "status": user.status.value if user.status else None,
            "updated_at": user.updated_at.isoformat()
        },
        "meta": {
            "etag": new_etag,
            "message": "User updated successfully"
        }
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    if_match: Optional[str] = Header(None, description="ETag for optimistic locking"),
    db: Session = Depends(get_db)
):
    """Soft delete a user by setting status to SUSPENDED"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(404, detail=f"User with ID {user_id} not found")

    if if_match:
        current_etag = generate_etag(user)
        if if_match != current_etag:
            raise HTTPException(
                status_code=409,
                detail={
                    "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
                    "title": "Conflict - Record Modified",
                    "status": 409,
                    "detail": "This record was modified by another user. Please refresh and try again.",
                    "instance": f"/admin/database-interface/users/{user_id}"
                }
            )

    user.status = UserStatus.SUSPENDED
    user.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=f"Database error: {str(e)}")

    new_etag = generate_etag(user)

    return {
        "data": {
            "id": user.id,
            "status": user.status.value if user.status else None,
            "updated_at": user.updated_at.isoformat()
        },
        "meta": {
            "etag": new_etag,
            "message": "User suspended successfully"
        }
    }


# ============================================================================
# INSTRUCTORS ENDPOINTS
# ============================================================================

@router.get("/instructors", response_model=TableListResponse)
async def list_instructors(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: Optional[str] = Query(None),
    filter_verified: Optional[bool] = Query(None),
    sort: Optional[str] = Query("-created_at"),
    db: Session = Depends(get_db)
):
    """List all instructors with pagination and filtering"""
    query = db.query(Instructor).join(User)
    
    # Apply search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                Instructor.license_number.ilike(search_term),
                Instructor.vehicle_make.ilike(search_term)
            )
        )
    
    # Apply verified filter
    if filter_verified is not None:
        query = query.filter(Instructor.is_verified == filter_verified)
    
    # Apply sorting
    if sort:
        descending = sort.startswith('-')
        field_name = sort[1:] if descending else sort
        
        if hasattr(Instructor, field_name):
            field = getattr(Instructor, field_name)
        elif hasattr(User, field_name):
            field = getattr(User, field_name)
        else:
            raise HTTPException(400, detail=f"Invalid sort field: {field_name}")
        
        query = query.order_by(field.desc() if descending else field.asc())
    
    total = query.count()
    total_pages = (total + page_size - 1) // page_size
    
    offset = (page - 1) * page_size
    instructors = query.offset(offset).limit(page_size).all()
    
    data = [
        {
            "id": inst.id,
            "user_id": inst.user_id,
            "instructor_name": f"{inst.user.first_name} {inst.user.last_name}",
            "license_number": inst.license_number,
            "vehicle_make": inst.vehicle_make,
            "vehicle_model": inst.vehicle_model,
            "vehicle_year": inst.vehicle_year,
            "is_verified": inst.is_verified,
            "hourly_rate": float(inst.hourly_rate) if inst.hourly_rate else None,
            "average_rating": float(inst.rating) if inst.rating else None,
            "created_at": inst.created_at.isoformat() if inst.created_at else None,
        }
        for inst in instructors
    ]
    
    return {
        "data": data,
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        },
        "links": {
            "self": f"/admin/database-interface/instructors?page={page}&page_size={page_size}",
            "first": f"/admin/database-interface/instructors?page=1&page_size={page_size}",
            "last": f"/admin/database-interface/instructors?page={total_pages}&page_size={page_size}",
            "prev": f"/admin/database-interface/instructors?page={page-1}&page_size={page_size}" if page > 1 else None,
            "next": f"/admin/database-interface/instructors?page={page+1}&page_size={page_size}" if page < total_pages else None,
        }
    }


# ============================================================================
# STUDENTS ENDPOINTS
# ============================================================================

@router.get("/students", response_model=TableListResponse)
async def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query("-created_at"),
    db: Session = Depends(get_db)
):
    """List all students with pagination and filtering"""
    query = db.query(Student).join(User)
    
    # Apply search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                User.email.ilike(search_term),
                User.phone.ilike(search_term)
            )
        )
    
    # Apply sorting
    if sort:
        descending = sort.startswith('-')
        field_name = sort[1:] if descending else sort
        
        if hasattr(Student, field_name):
            field = getattr(Student, field_name)
        elif hasattr(User, field_name):
            field = getattr(User, field_name)
        else:
            raise HTTPException(400, detail=f"Invalid sort field: {field_name}")
        
        query = query.order_by(field.desc() if descending else field.asc())
    
    total = query.count()
    total_pages = (total + page_size - 1) // page_size
    
    offset = (page - 1) * page_size
    students = query.offset(offset).limit(page_size).all()
    
    data = [
        {
            "id": student.id,
            "user_id": student.user_id,
            "student_name": f"{student.user.first_name} {student.user.last_name}",
            "email": student.user.email,
            "phone": student.user.phone,
            "city": student.city,
            "suburb": student.suburb,
            "created_at": student.created_at.isoformat() if student.created_at else None,
        }
        for student in students
    ]
    
    return {
        "data": data,
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        },
        "links": {
            "self": f"/admin/database-interface/students?page={page}&page_size={page_size}",
            "first": f"/admin/database-interface/students?page=1&page_size={page_size}",
            "last": f"/admin/database-interface/students?page={total_pages}&page_size={page_size}",
            "prev": f"/admin/database-interface/students?page={page-1}&page_size={page_size}" if page > 1 else None,
            "next": f"/admin/database-interface/students?page={page+1}&page_size={page_size}" if page < total_pages else None,
        }
    }


# ============================================================================
# BOOKINGS ENDPOINTS
# ============================================================================

@router.get("/instructors/{instructor_id}")
async def get_instructor_detail(
    instructor_id: int,
    db: Session = Depends(get_db)
):
    """Get single instructor by ID with ETag header"""
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=404,
            detail={
                "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
                "title": "Instructor Not Found",
                "status": 404,
                "detail": f"Instructor with ID {instructor_id} does not exist",
                "instance": f"/admin/database-interface/instructors/{instructor_id}"
            }
        )
    
    etag = generate_etag(instructor)
    
    return {
        "data": {
            "id": instructor.id,
            "user_id": instructor.user_id,
            "license_number": instructor.license_number,
            "license_types": instructor.license_types,
            "id_number": instructor.id_number,
            "vehicle_registration": instructor.vehicle_registration,
            "vehicle_make": instructor.vehicle_make,
            "vehicle_model": instructor.vehicle_model,
            "vehicle_year": instructor.vehicle_year,
            "is_available": instructor.is_available,
            "is_verified": instructor.is_verified,
            "hourly_rate": float(instructor.hourly_rate) if instructor.hourly_rate else None,
            "rating": float(instructor.rating) if instructor.rating else None,
            "total_reviews": instructor.total_reviews,
            "bio": instructor.bio,
            "service_radius_km": float(instructor.service_radius_km) if instructor.service_radius_km else None,
            "province": instructor.province,
            "city": instructor.city,
            "suburb": instructor.suburb,
            "created_at": instructor.created_at.isoformat() if instructor.created_at else None,
            "updated_at": instructor.updated_at.isoformat() if instructor.updated_at else None,
        },
        "meta": {
            "etag": etag,
            "last_modified": instructor.updated_at.isoformat() if instructor.updated_at else instructor.created_at.isoformat()
        }
    }


@router.put("/instructors/{instructor_id}")
async def update_instructor(
    instructor_id: int,
    data: InstructorUpdateRequest,
    if_match: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Update instructor record"""
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(404, detail=f"Instructor with ID {instructor_id} not found")
    
    # Check optimistic locking
    if if_match:
        current_etag = generate_etag(instructor)
        if if_match != current_etag:
            raise HTTPException(
                status_code=409,
                detail={
                    "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
                    "title": "Conflict - Record Modified",
                    "status": 409,
                    "detail": "This record was modified by another user. Please refresh and try again.",
                    "instance": f"/admin/database-interface/instructors/{instructor_id}"
                }
            )
    
    update_data = data.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(instructor, key, value)
    
    instructor.updated_at = datetime.now(timezone.utc)
    
    try:
        db.commit()
        db.refresh(instructor)
    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=f"Database error: {str(e)}")
    
    new_etag = generate_etag(instructor)
    
    return {
        "data": {
            "id": instructor.id,
            "license_number": instructor.license_number,
            "is_verified": instructor.is_verified,
            "hourly_rate": float(instructor.hourly_rate) if instructor.hourly_rate else None,
            "updated_at": instructor.updated_at.isoformat()
        },
        "meta": {
            "etag": new_etag,
            "message": "Instructor updated successfully"
        }
    }


@router.delete("/instructors/{instructor_id}")
async def delete_instructor(
    instructor_id: int,
    if_match: Optional[str] = Header(None, description="ETag for optimistic locking"),
    db: Session = Depends(get_db)
):
    """Soft delete an instructor by disabling verification"""
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()

    if not instructor:
        raise HTTPException(404, detail=f"Instructor with ID {instructor_id} not found")

    if if_match:
        current_etag = generate_etag(instructor)
        if if_match != current_etag:
            raise HTTPException(
                status_code=409,
                detail={
                    "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
                    "title": "Conflict - Record Modified",
                    "status": 409,
                    "detail": "This record was modified by another user. Please refresh and try again.",
                    "instance": f"/admin/database-interface/instructors/{instructor_id}"
                }
            )

    instructor.is_verified = False
    instructor.verified_at = None
    instructor.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(instructor)
    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=f"Database error: {str(e)}")

    new_etag = generate_etag(instructor)

    return {
        "data": {
            "id": instructor.id,
            "is_verified": instructor.is_verified,
            "updated_at": instructor.updated_at.isoformat()
        },
        "meta": {
            "etag": new_etag,
            "message": "Instructor verification disabled"
        }
    }


@router.get("/students/{student_id}")
async def get_student_detail(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Get single student by ID with ETag header"""
    student = db.query(Student).filter(Student.id == student_id).first()
    
    if not student:
        raise HTTPException(
            status_code=404,
            detail={
                "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
                "title": "Student Not Found",
                "status": 404,
                "detail": f"Student with ID {student_id} does not exist",
                "instance": f"/admin/database-interface/students/{student_id}"
            }
        )
    
    etag = generate_etag(student)
    
    return {
        "data": {
            "id": student.id,
            "user_id": student.user_id,
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
            "default_pickup_latitude": student.default_pickup_latitude,
            "default_pickup_longitude": student.default_pickup_longitude,
            "created_at": student.created_at.isoformat() if student.created_at else None,
            "updated_at": student.updated_at.isoformat() if student.updated_at else None,
        },
        "meta": {
            "etag": etag,
            "last_modified": student.updated_at.isoformat() if student.updated_at else student.created_at.isoformat()
        }
    }


@router.put("/students/{student_id}")
async def update_student(
    student_id: int,
    data: StudentUpdateRequest,
    if_match: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Update student record"""
    student = db.query(Student).filter(Student.id == student_id).first()
    
    if not student:
        raise HTTPException(404, detail=f"Student with ID {student_id} not found")
    
    # Check optimistic locking
    if if_match:
        current_etag = generate_etag(student)
        if if_match != current_etag:
            raise HTTPException(409, detail="Record was modified by another user")
    
    update_data = data.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(student, key, value)
    
    student.updated_at = datetime.now(timezone.utc)
    
    try:
        db.commit()
        db.refresh(student)
    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=f"Database error: {str(e)}")
    
    new_etag = generate_etag(student)
    
    return {
        "data": {
            "id": student.id,
            "updated_at": student.updated_at.isoformat()
        },
        "meta": {
            "etag": new_etag,
            "message": "Student updated successfully"
        }
    }


@router.delete("/students/{student_id}")
async def delete_student(
    student_id: int,
    if_match: Optional[str] = Header(None, description="ETag for optimistic locking"),
    db: Session = Depends(get_db)
):
    """Soft delete a student by setting the linked user to INACTIVE"""
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(404, detail=f"Student with ID {student_id} not found")

    if if_match:
        current_etag = generate_etag(student)
        if if_match != current_etag:
            raise HTTPException(
                status_code=409,
                detail={
                    "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
                    "title": "Conflict - Record Modified",
                    "status": 409,
                    "detail": "This record was modified by another user. Please refresh and try again.",
                    "instance": f"/admin/database-interface/students/{student_id}"
                }
            )

    if student.user:
        student.user.status = UserStatus.INACTIVE
        student.user.updated_at = datetime.now(timezone.utc)

    student.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(student)
    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=f"Database error: {str(e)}")

    new_etag = generate_etag(student)

    return {
        "data": {
            "id": student.id,
            "user_status": student.user.status.value if student.user and student.user.status else None,
            "updated_at": student.updated_at.isoformat()
        },
        "meta": {
            "etag": new_etag,
            "message": "Student deactivated successfully"
        }
    }


@router.get("/bookings", response_model=TableListResponse)
async def list_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: Optional[str] = Query(None),
    filter_status: Optional[str] = Query(None),
    filter_payment_status: Optional[str] = Query(None),
    sort: Optional[str] = Query("-lesson_date"),
    db: Session = Depends(get_db)
):
    """List all bookings with pagination and filtering"""
    query = db.query(Booking)
    
    # Apply search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Booking.booking_reference.ilike(search_term),
                Booking.pickup_address.ilike(search_term)
            )
        )
    
    # Apply status filter
    if filter_status:
        try:
            status_enum = BookingStatus[filter_status.upper()]
            query = query.filter(Booking.status == status_enum)
        except KeyError:
            raise HTTPException(400, detail=f"Invalid booking status: {filter_status}")
    
    # Apply payment status filter
    if filter_payment_status:
        try:
            payment_enum = PaymentStatus[filter_payment_status.upper()]
            query = query.filter(Booking.payment_status == payment_enum)
        except KeyError:
            raise HTTPException(400, detail=f"Invalid payment status: {filter_payment_status}")
    
    # Apply sorting
    if sort:
        descending = sort.startswith('-')
        field_name = sort[1:] if descending else sort
        
        if not hasattr(Booking, field_name):
            raise HTTPException(400, detail=f"Invalid sort field: {field_name}")
        
        field = getattr(Booking, field_name)
        query = query.order_by(field.desc() if descending else field.asc())
    
    total = query.count()
    total_pages = (total + page_size - 1) // page_size
    
    offset = (page - 1) * page_size
    bookings = query.offset(offset).limit(page_size).all()
    
    data = [
        {
            "id": booking.id,
            "booking_reference": booking.booking_reference,
            "student_id": booking.student_id,
            "instructor_id": booking.instructor_id,
            "lesson_date": booking.lesson_date.isoformat() if booking.lesson_date else None,
            "duration_minutes": booking.duration_minutes,
            "status": booking.status.value if booking.status else None,
            "payment_status": booking.payment_status.value if booking.payment_status else None,
            "amount": float(booking.amount) if booking.amount else None,
            "pickup_address": booking.pickup_address,
            "created_at": booking.created_at.isoformat() if booking.created_at else None,
        }
        for booking in bookings
    ]
    
    return {
        "data": data,
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        },
        "links": {
            "self": f"/admin/database-interface/bookings?page={page}&page_size={page_size}",
            "first": f"/admin/database-interface/bookings?page=1&page_size={page_size}",
            "last": f"/admin/database-interface/bookings?page={total_pages}&page_size={page_size}",
            "prev": f"/admin/database-interface/bookings?page={page-1}&page_size={page_size}" if page > 1 else None,
            "next": f"/admin/database-interface/bookings?page={page+1}&page_size={page_size}" if page < total_pages else None,
        }
    }


@router.get("/bookings/{booking_id}")
async def get_booking_detail(
    booking_id: int,
    db: Session = Depends(get_db)
):
    """Get single booking by ID with ETag header"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=404,
            detail={
                "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
                "title": "Booking Not Found",
                "status": 404,
                "detail": f"Booking with ID {booking_id} does not exist",
                "instance": f"/admin/database-interface/bookings/{booking_id}"
            }
        )
    
    etag = generate_etag(booking)
    
    return {
        "data": {
            "id": booking.id,
            "booking_reference": booking.booking_reference,
            "student_id": booking.student_id,
            "instructor_id": booking.instructor_id,
            "lesson_date": booking.lesson_date.isoformat() if booking.lesson_date else None,
            "duration_minutes": booking.duration_minutes,
            "lesson_type": booking.lesson_type,
            "status": booking.status.value if booking.status else None,
            "payment_status": booking.payment_status.value if booking.payment_status else None,
            "amount": float(booking.amount) if booking.amount else None,
            "booking_fee": float(booking.booking_fee) if booking.booking_fee else None,
            "pickup_address": booking.pickup_address,
            "dropoff_address": booking.dropoff_address,
            "pickup_latitude": booking.pickup_latitude,
            "pickup_longitude": booking.pickup_longitude,
            "instructor_notes": booking.instructor_notes,
            "student_notes": booking.student_notes,
            "created_at": booking.created_at.isoformat() if booking.created_at else None,
            "updated_at": booking.updated_at.isoformat() if booking.updated_at else None,
        },
        "meta": {
            "etag": etag,
            "last_modified": booking.updated_at.isoformat() if booking.updated_at else booking.created_at.isoformat()
        }
    }


@router.put("/bookings/{booking_id}")
async def update_booking(
    booking_id: int,
    data: BookingUpdateRequest,
    if_match: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Update booking record (status, payment status, notes)"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(404, detail=f"Booking with ID {booking_id} not found")
    
    # Check optimistic locking
    if if_match:
        current_etag = generate_etag(booking)
        if if_match != current_etag:
            raise HTTPException(409, detail="Record was modified by another user")
    
    update_data = data.dict(exclude_unset=True)
    
    # Convert enum strings to enum values
    if "status" in update_data:
        update_data["status"] = BookingStatus[update_data["status"].upper()]
    if "payment_status" in update_data:
        update_data["payment_status"] = PaymentStatus[update_data["payment_status"].upper()]
    
    for key, value in update_data.items():
        setattr(booking, key, value)
    
    booking.updated_at = datetime.now(timezone.utc)
    
    try:
        db.commit()
        db.refresh(booking)
    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=f"Database error: {str(e)}")
    
    new_etag = generate_etag(booking)
    
    return {
        "data": {
            "id": booking.id,
            "status": booking.status.value if booking.status else None,
            "payment_status": booking.payment_status.value if booking.payment_status else None,
            "updated_at": booking.updated_at.isoformat()
        },
        "meta": {
            "etag": new_etag,
            "message": "Booking updated successfully"
        }
    }


@router.delete("/bookings/{booking_id}")
async def delete_booking(
    booking_id: int,
    if_match: Optional[str] = Header(None, description="ETag for optimistic locking"),
    reason: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db)
):
    """Hard delete a booking record"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(404, detail=f"Booking with ID {booking_id} not found")

    if if_match:
        current_etag = generate_etag(booking)
        if if_match != current_etag:
            raise HTTPException(
                status_code=409,
                detail={
                    "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
                    "title": "Conflict - Record Modified",
                    "status": 409,
                    "detail": "This record was modified by another user. Please refresh and try again.",
                    "instance": f"/admin/database-interface/bookings/{booking_id}"
                }
            )

    review = db.query(Review).filter(Review.booking_id == booking_id).first()
    if review:
        db.delete(review)

    try:
        db.delete(booking)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=f"Database error: {str(e)}")

    return {
        "data": {
            "id": booking_id
        },
        "meta": {
            "message": "Booking deleted successfully"
        }
    }


# ============================================================================
# REVIEWS ENDPOINTS
# ============================================================================

@router.get("/reviews", response_model=TableListResponse)
async def list_reviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort: Optional[str] = Query("-created_at"),
    db: Session = Depends(get_db)
):
    """List all reviews with pagination"""
    query = db.query(Review)
    
    # Apply sorting
    if sort:
        descending = sort.startswith('-')
        field_name = sort[1:] if descending else sort
        
        if not hasattr(Review, field_name):
            raise HTTPException(400, detail=f"Invalid sort field: {field_name}")
        
        field = getattr(Review, field_name)
        query = query.order_by(field.desc() if descending else field.asc())
    
    total = query.count()
    total_pages = (total + page_size - 1) // page_size
    
    offset = (page - 1) * page_size
    reviews = query.offset(offset).limit(page_size).all()
    
    data = [
        {
            "id": review.id,
            "booking_id": review.booking_id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at.isoformat() if review.created_at else None,
        }
        for review in reviews
    ]
    
    return {
        "data": data,
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        },
        "links": {
            "self": f"/admin/database-interface/reviews?page={page}&page_size={page_size}",
            "first": f"/admin/database-interface/reviews?page=1&page_size={page_size}",
            "last": f"/admin/database-interface/reviews?page={total_pages}&page_size={page_size}",
            "prev": f"/admin/database-interface/reviews?page={page-1}&page_size={page_size}" if page > 1 else None,
            "next": f"/admin/database-interface/reviews?page={page+1}&page_size={page_size}" if page < total_pages else None,
        }
    }


# ============================================================================
# SCHEDULES ENDPOINTS
# ============================================================================

@router.get("/schedules", response_model=TableListResponse)
async def list_schedules(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    filter_instructor_id: Optional[int] = Query(None),
    sort: Optional[str] = Query("day_of_week"),
    db: Session = Depends(get_db)
):
    """List all instructor schedules with pagination"""
    query = db.query(InstructorSchedule)
    
    # Apply instructor filter
    if filter_instructor_id:
        query = query.filter(InstructorSchedule.instructor_id == filter_instructor_id)
    
    # Apply sorting
    if sort:
        descending = sort.startswith('-')
        field_name = sort[1:] if descending else sort
        
        if not hasattr(InstructorSchedule, field_name):
            raise HTTPException(400, detail=f"Invalid sort field: {field_name}")
        
        field = getattr(InstructorSchedule, field_name)
        query = query.order_by(field.desc() if descending else field.asc())
    
    total = query.count()
    total_pages = (total + page_size - 1) // page_size
    
    offset = (page - 1) * page_size
    schedules = query.offset(offset).limit(page_size).all()
    
    data = [
        {
            "id": schedule.id,
            "instructor_id": schedule.instructor_id,
            "day_of_week": schedule.day_of_week.value if schedule.day_of_week else None,
            "start_time": schedule.start_time,
            "end_time": schedule.end_time,
            "is_available": schedule.is_available,
        }
        for schedule in schedules
    ]
    
    return {
        "data": data,
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        },
        "links": {
            "self": f"/admin/database-interface/schedules?page={page}&page_size={page_size}",
            "first": f"/admin/database-interface/schedules?page=1&page_size={page_size}",
            "last": f"/admin/database-interface/schedules?page={total_pages}&page_size={page_size}",
            "prev": f"/admin/database-interface/schedules?page={page-1}&page_size={page_size}" if page > 1 else None,
            "next": f"/admin/database-interface/schedules?page={page+1}&page_size={page_size}" if page < total_pages else None,
        }
    }


# ============================================================================
# BULK OPERATIONS ENDPOINT (PHASE 4.2)
# ============================================================================

@router.post("/bulk-update", response_model=BulkUpdateResponse)
async def bulk_update_records(
    request: BulkUpdateRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Bulk update multiple records in a single transaction
    
    Supported tables:
    - users: Update status (ACTIVE, INACTIVE, SUSPENDED)
    - instructors: Update is_verified (True/False)
    - students: No bulk updates currently supported
    - bookings: Update status or payment_status
    
    Returns:
    - updated_count: Number of successfully updated records
    - failed_ids: List of IDs that failed to update
    - message: Success/error message
    """
    
    if not request.ids:
        raise HTTPException(400, detail="No IDs provided for bulk update")
    
    if len(request.ids) > 100:
        raise HTTPException(400, detail="Bulk update limited to 100 records at a time")
    
    updated_count = 0
    failed_ids = []
    
    try:
        # Select appropriate model based on table
        if request.table == 'users':
            model = User
            allowed_fields = {'status'}
            allowed_values = {'ACTIVE', 'INACTIVE', 'SUSPENDED'}
            
            if request.field not in allowed_fields:
                raise HTTPException(400, detail=f"Field '{request.field}' not allowed for bulk update on users")
            
            if request.field == 'status':
                if request.value not in allowed_values:
                    raise HTTPException(400, detail=f"Invalid status value. Must be one of: {', '.join(allowed_values)}")
                
                # Update users
                for user_id in request.ids:
                    user = db.query(User).filter(User.id == user_id).first()
                    if user:
                        user.status = UserStatus[request.value]
                        user.updated_at = datetime.now(timezone.utc)
                        updated_count += 1
                    else:
                        failed_ids.append(user_id)
        
        elif request.table == 'instructors':
            model = Instructor
            allowed_fields = {'is_verified'}
            
            if request.field not in allowed_fields:
                raise HTTPException(400, detail=f"Field '{request.field}' not allowed for bulk update on instructors")
            
            if request.field == 'is_verified':
                if not isinstance(request.value, bool):
                    raise HTTPException(400, detail="is_verified must be a boolean (true/false)")
                
                # Update instructors
                for instructor_id in request.ids:
                    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
                    if instructor:
                        instructor.is_verified = request.value
                        instructor.verified_at = datetime.now(timezone.utc) if request.value else None
                        instructor.updated_at = datetime.now(timezone.utc)
                        updated_count += 1
                    else:
                        failed_ids.append(instructor_id)
        
        elif request.table == 'bookings':
            model = Booking
            allowed_fields = {'status', 'payment_status'}
            
            if request.field not in allowed_fields:
                raise HTTPException(400, detail=f"Field '{request.field}' not allowed for bulk update on bookings")
            
            if request.field == 'status':
                allowed_values = {'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'}
                if request.value not in allowed_values:
                    raise HTTPException(400, detail=f"Invalid status. Must be one of: {', '.join(allowed_values)}")
                
                # Update bookings
                for booking_id in request.ids:
                    booking = db.query(Booking).filter(Booking.id == booking_id).first()
                    if booking:
                        booking.status = BookingStatus[request.value]
                        booking.updated_at = datetime.now(timezone.utc)
                        updated_count += 1
                    else:
                        failed_ids.append(booking_id)
            
            elif request.field == 'payment_status':
                allowed_values = {'PENDING', 'PAID', 'FAILED', 'REFUNDED'}
                if request.value not in allowed_values:
                    raise HTTPException(400, detail=f"Invalid payment status. Must be one of: {', '.join(allowed_values)}")
                
                # Update payment status
                for booking_id in request.ids:
                    booking = db.query(Booking).filter(Booking.id == booking_id).first()
                    if booking:
                        booking.payment_status = PaymentStatus[request.value]
                        booking.updated_at = datetime.now(timezone.utc)
                        updated_count += 1
                    else:
                        failed_ids.append(booking_id)
        
        elif request.table == 'students':
            raise HTTPException(400, detail="Bulk updates not supported for students table")
        
        # Commit transaction
        db.commit()
        
        message = f"Successfully updated {updated_count} record(s)"
        if failed_ids:
            message += f". Failed to update {len(failed_ids)} record(s): {failed_ids}"
        
        return {
            "updated_count": updated_count,
            "failed_ids": failed_ids,
            "message": message
        }
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=f"Bulk update failed: {str(e)}")
