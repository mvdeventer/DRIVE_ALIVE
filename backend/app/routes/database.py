"""
Admin database backup and restore endpoints
"""

import json
import os
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.admin import require_admin
from ..models.availability import CustomAvailability, InstructorSchedule, TimeOffException
from ..models.booking import Booking, Review
from ..models.password_reset import PasswordResetToken
from ..models.payment import Transaction
from ..models.payment_session import PaymentSession
from ..models.user import Instructor, Student, User

router = APIRouter(prefix="/admin/database", tags=["admin-database"], dependencies=[Depends(require_admin)])


def backup_database_internal(db: Session) -> Dict[str, List[Dict[str, Any]]]:
    """
    Internal function to create a database backup as a dict
    Used by both API endpoint and backup scheduler
    Returns dict with all database tables
    """
    backup_data: Dict[str, List[Dict[str, Any]]] = {}
def list_available_backups():
    """
    List all available backup files in the backups directory
    Returns metadata (filename, size, created date) for each backup
    """
    try:
        backups_dir = "backups"
        if not os.path.exists(backups_dir):
            return {"backups": []}
        
        backups = []
        for filename in sorted(os.listdir(backups_dir), reverse=True):
            if filename.endswith('.json'):
                filepath = os.path.join(backups_dir, filename)
                file_size = os.path.getsize(filepath)
                file_mtime = os.path.getmtime(filepath)
                created_at = datetime.fromtimestamp(file_mtime).isoformat()
                
                backups.append({
                    "filename": filename,
                    "size_bytes": file_size,
                    "size_mb": round(file_size / (1024 * 1024), 2),
                    "created_at": created_at,
                })
        
        return {"backups": backups, "count": len(backups)}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list backups: {str(e)}"
        )


@router.get("/backups/download/{filename}")
def download_backup(filename: str):
    """
    Download a specific backup file from the server
    """
    try:
        # Security: Prevent directory traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )
        
        filepath = os.path.join("backups", filename)
        if not os.path.exists(filepath):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backup file not found"
            )
        
        return FileResponse(
            path=filepath,
            filename=filename,
            media_type='application/json'
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download backup: {str(e)}"
        )


def backup_database_internal(db: Session) -> Dict[str, List[Dict[str, Any]]]:
    """
    Internal function to create a database backup as a dict
    Used by both API endpoint and backup scheduler
    Returns dict with all database tables
    """
    backup_data: Dict[str, List[Dict[str, Any]]] = {}
    
    # Backup users
    users = db.query(User).all()
    backup_data['users'] = [
        {
            'id': u.id,
            'email': u.email,
            'phone': u.phone,
            'password_hash': u.password_hash,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'role': u.role.value,
            'status': u.status.value,
            'firebase_uid': u.firebase_uid,
            'address': u.address,
            'address_latitude': u.address_latitude,
            'address_longitude': u.address_longitude,
            'created_at': u.created_at.isoformat() if u.created_at else None,
            'updated_at': u.updated_at.isoformat() if u.updated_at else None,
            'last_login': u.last_login.isoformat() if u.last_login else None,
        }
        for u in users
    ]
    
    # Backup instructors
    instructors = db.query(Instructor).all()
    backup_data['instructors'] = [
        {
            'id': i.id,
            'user_id': i.user_id,
            'license_number': i.license_number,
            'license_types': i.license_types,
            'id_number': i.id_number,
            'vehicle_registration': i.vehicle_registration,
            'vehicle_make': i.vehicle_make,
            'vehicle_model': i.vehicle_model,
            'vehicle_year': i.vehicle_year,
            'current_latitude': i.current_latitude,
            'current_longitude': i.current_longitude,
            'province': i.province,
            'city': i.city,
            'suburb': i.suburb,
            'service_radius_km': i.service_radius_km,
            'max_travel_distance_km': i.max_travel_distance_km,
            'rate_per_km_beyond_radius': i.rate_per_km_beyond_radius,
            'is_available': i.is_available,
            'hourly_rate': i.hourly_rate,
            'booking_fee': i.booking_fee,
            'rating': i.rating,
            'total_reviews': i.total_reviews,
            'is_verified': i.is_verified,
            'created_at': i.created_at.isoformat() if i.created_at else None,
            'updated_at': i.updated_at.isoformat() if i.updated_at else None,
        }
        for i in instructors
    ]
    
    # Backup students
    students = db.query(Student).all()
    backup_data['students'] = [
        {
            'id': s.id,
            'user_id': s.user_id,
            'id_number': s.id_number,
            'learners_permit_number': s.learners_permit_number,
            'emergency_contact_name': s.emergency_contact_name,
            'emergency_contact_phone': s.emergency_contact_phone,
            'address_line1': s.address_line1,
            'address_line2': s.address_line2,
            'province': s.province,
            'city': s.city,
            'suburb': s.suburb,
            'postal_code': s.postal_code,
            'default_pickup_latitude': s.default_pickup_latitude,
            'default_pickup_longitude': s.default_pickup_longitude,
            'created_at': s.created_at.isoformat() if s.created_at else None,
            'updated_at': s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in students
    ]
    
    # Backup bookings
    bookings = db.query(Booking).all()
    backup_data['bookings'] = [
        {
            'id': b.id,
            'booking_reference': b.booking_reference,
            'student_id': b.student_id,
            'instructor_id': b.instructor_id,
            'lesson_date': b.lesson_date.isoformat() if b.lesson_date else None,
            'duration_minutes': b.duration_minutes,
            'lesson_type': b.lesson_type,
            'pickup_address': b.pickup_address,
            'pickup_latitude': b.pickup_latitude,
            'pickup_longitude': b.pickup_longitude,
            'dropoff_address': b.dropoff_address,
            'dropoff_latitude': b.dropoff_latitude,
            'dropoff_longitude': b.dropoff_longitude,
            'student_notes': b.student_notes,
            'instructor_notes': b.instructor_notes,
            'status': b.status.value,
            'amount': b.amount,
            'payment_status': b.payment_status.value,
            'payment_method': b.payment_method,
            'payment_id': b.payment_id,
            'cancelled_at': b.cancelled_at.isoformat() if b.cancelled_at else None,
            'cancelled_by': b.cancelled_by,
            'cancellation_reason': b.cancellation_reason,
            'refund_amount': b.refund_amount,
            'cancellation_fee': b.cancellation_fee,
            'rebooking_count': b.rebooking_count,
            'original_lesson_date': b.original_lesson_date.isoformat() if b.original_lesson_date else None,
            'reminder_sent': b.reminder_sent,
            'instructor_reminder_sent': b.instructor_reminder_sent,
            'created_at': b.created_at.isoformat() if b.created_at else None,
            'updated_at': b.updated_at.isoformat() if b.updated_at else None,
        }
        for b in bookings
    ]
    
    # Backup reviews
    reviews = db.query(Review).all()
    backup_data['reviews'] = [
        {
            'id': r.id,
            'booking_id': r.booking_id,
            'student_id': r.student_id,
            'instructor_id': r.instructor_id,
            'rating': r.rating,
            'comment': r.comment,
            'created_at': r.created_at.isoformat() if r.created_at else None,
        }
        for r in reviews
    ]
    
    # Backup instructor schedules
    schedules = db.query(InstructorSchedule).all()
    backup_data['instructor_schedules'] = [
        {
            'id': s.id,
            'instructor_id': s.instructor_id,
            'day_of_week': s.day_of_week,
            'start_time': s.start_time.isoformat() if s.start_time else None,
            'end_time': s.end_time.isoformat() if s.end_time else None,
            'is_active': s.is_active,
        }
        for s in schedules
    ]
    
    # Backup time off exceptions
    time_offs = db.query(TimeOffException).all()
    backup_data['time_off_exceptions'] = [
        {
            'id': t.id,
            'instructor_id': t.instructor_id,
            'start_date': t.start_date.isoformat() if t.start_date else None,
            'end_date': t.end_date.isoformat() if t.end_date else None,
            'start_time': t.start_time.isoformat() if t.start_time else None,
            'end_time': t.end_time.isoformat() if t.end_time else None,
            'reason': t.reason,
            'notes': t.notes,
        }
        for t in time_offs
    ]
    
    # Backup custom availability
    custom_avail = db.query(CustomAvailability).all()
    backup_data['custom_availability'] = [
        {
            'id': c.id,
            'instructor_id': c.instructor_id,
            'date': c.date.isoformat() if c.date else None,
            'start_time': c.start_time.isoformat() if c.start_time else None,
            'end_time': c.end_time.isoformat() if c.end_time else None,
        }
        for c in custom_avail
    ]
    
    # Backup transactions
    transactions = db.query(Transaction).all()
    backup_data['transactions'] = [
        {
            'id': t.id,
            'booking_id': t.booking_id,
            'amount': t.amount,
            'payment_method': t.payment_method,
            'payment_provider': t.payment_provider,
            'transaction_id': t.transaction_id,
            'status': t.status,
            'created_at': t.created_at.isoformat() if t.created_at else None,
        }
        for t in transactions
    ]
    
    return backup_data


@router.get("/backup")
def backup_database(db: Session = Depends(get_db)):
    """
    Create a JSON backup of the entire database
    Returns a downloadable JSON file with all database records
    """
    try:
        backup_data = backup_database_internal(db)
        
        # Create backup file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"roadready_backup_{timestamp}.json"
        filepath = os.path.join("backups", filename)
        
        # Create backups directory if it doesn't exist
        os.makedirs("backups", exist_ok=True)
        
        # Write backup to file
        with open(filepath, 'w') as f:
            json.dump(backup_data, f, indent=2)
        
        return FileResponse(
            filepath,
            media_type='application/json',
            filename=filename
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup failed: {str(e)}"
        )


@router.post("/reset")
def reset_database(db: Session = Depends(get_db)):
    """
    Clear all data from the database (USE WITH CAUTION!)
    Auto-creates a backup before resetting
    This will delete ALL records from ALL tables
    """
    try:
        # AUTO-BACKUP BEFORE RESET
        backup_data: Dict[str, List[Dict[str, Any]]] = {}
        
        # Backup all tables (same as backup endpoint)
        users = db.query(User).all()
        backup_data['users'] = [
            {
                'id': u.id, 'email': u.email, 'phone': u.phone, 'password_hash': u.password_hash,
                'first_name': u.first_name, 'last_name': u.last_name, 'role': u.role.value,
                'status': u.status.value, 'firebase_uid': u.firebase_uid, 'address': u.address,
                'address_latitude': u.address_latitude, 'address_longitude': u.address_longitude,
                'created_at': u.created_at.isoformat() if u.created_at else None,
                'updated_at': u.updated_at.isoformat() if u.updated_at else None,
                'last_login': u.last_login.isoformat() if u.last_login else None,
            } for u in users
        ]
        
        instructors = db.query(Instructor).all()
        backup_data['instructors'] = [
            {
                'id': i.id, 'user_id': i.user_id, 'license_number': i.license_number,
                'license_types': i.license_types, 'id_number': i.id_number,
                'vehicle_registration': i.vehicle_registration, 'vehicle_make': i.vehicle_make,
                'vehicle_model': i.vehicle_model, 'vehicle_year': i.vehicle_year,
                'current_latitude': i.current_latitude, 'current_longitude': i.current_longitude,
                'province': i.province, 'city': i.city, 'suburb': i.suburb,
                'service_radius_km': i.service_radius_km, 'max_travel_distance_km': i.max_travel_distance_km,
                'rate_per_km_beyond_radius': i.rate_per_km_beyond_radius, 'is_available': i.is_available,
                'hourly_rate': i.hourly_rate, 'booking_fee': i.booking_fee, 'rating': i.rating,
                'total_reviews': i.total_reviews, 'is_verified': i.is_verified,
                'created_at': i.created_at.isoformat() if i.created_at else None,
                'updated_at': i.updated_at.isoformat() if i.updated_at else None,
            } for i in instructors
        ]
        
        students = db.query(Student).all()
        backup_data['students'] = [
            {
                'id': s.id, 'user_id': s.user_id, 'id_number': s.id_number,
                'learners_permit_number': s.learners_permit_number,
                'emergency_contact_name': s.emergency_contact_name,
                'emergency_contact_phone': s.emergency_contact_phone,
                'address_line1': s.address_line1,
                'address_line2': s.address_line2,
                'province': s.province,
                'city': s.city,
                'suburb': s.suburb,
                'postal_code': s.postal_code,
                'default_pickup_latitude': s.default_pickup_latitude,
                'default_pickup_longitude': s.default_pickup_longitude,
                'created_at': s.created_at.isoformat() if s.created_at else None,
                'updated_at': s.updated_at.isoformat() if s.updated_at else None,
            } for s in db.query(Student).all()
        ]
        
        bookings = db.query(Booking).all()
        backup_data['bookings'] = [
            {
                'id': b.id, 'student_id': b.student_id, 'instructor_id': b.instructor_id,
                'lesson_datetime': b.lesson_datetime.isoformat() if b.lesson_datetime else None,
                'duration_hours': b.duration_hours, 'pickup_address': b.pickup_address,
                'pickup_latitude': b.pickup_latitude, 'pickup_longitude': b.pickup_longitude,
                'status': b.status.value, 'hourly_rate': b.hourly_rate, 'booking_fee': b.booking_fee,
                'total_amount': b.total_amount, 'payment_status': b.payment_status.value,
                'stripe_payment_intent_id': b.stripe_payment_intent_id,
                'payfast_payment_id': b.payfast_payment_id,
                'created_at': b.created_at.isoformat() if b.created_at else None,
                'updated_at': b.updated_at.isoformat() if b.updated_at else None,
            } for b in bookings
        ]
        
        # Save auto-backup
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"auto_backup_before_reset_{timestamp}.json"
        filepath = os.path.join("backups", filename)
        os.makedirs("backups", exist_ok=True)
        
        with open(filepath, 'w') as f:
            json.dump(backup_data, f, indent=2)
        
        # Now reset database
        db.query(Review).delete()
        db.query(Transaction).delete()
        db.query(PaymentSession).delete()
        db.query(Booking).delete()
        db.query(CustomAvailability).delete()
        db.query(TimeOffException).delete()
        db.query(InstructorSchedule).delete()
        db.query(Instructor).delete()
        db.query(Student).delete()
        db.query(PasswordResetToken).delete()
        db.query(User).delete()
        
        db.commit()
        
        return {
            "message": "Database reset successfully. All data has been deleted.",
            "backup_file": filename,
            "backup_path": filepath,
            "info": "An automatic backup was created before reset."
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database reset failed: {str(e)}"
        )


@router.get("/backups/config")
def get_backup_config():
    """Get current backup configuration (retention policy, etc.)"""
    try:
        from ..services.backup_scheduler import backup_scheduler
        config = backup_scheduler.load_config()
        return config
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load backup config: {str(e)}"
        )


@router.put("/backups/config")
def update_backup_config(config: dict):
    """Update backup configuration (retention days, archive settings, etc.)"""
    try:
        from ..services.backup_scheduler import backup_scheduler
        
        # Validate config
        if "retention_days" in config and config["retention_days"] < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Retention days must be at least 1"
            )
        
        backup_scheduler.save_config(config)
        return {"message": "Backup configuration updated", "config": config}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update backup config: {str(e)}"
        )


@router.get("/backups/all")
def list_all_backups():
    """
    List all available backups (regular + archived ZIP files)
    Returns both regular JSON files and zipped archives
    """
    try:
        from ..services.backup_scheduler import backup_scheduler
        return backup_scheduler.list_all_backups()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list backups: {str(e)}"
        )


@router.get("/backups/extract/{archive_name}/{backup_filename}")
def extract_from_archive(archive_name: str, backup_filename: str):
    """
    Extract a backup file from a ZIP archive
    Returns the backup file content for restore
    """
    try:
        from ..services.backup_scheduler import backup_scheduler
        backup_content = backup_scheduler.extract_from_archive(archive_name, backup_filename)
        
        return {
            "filename": backup_filename,
            "archive": archive_name,
            "data": json.loads(backup_content.decode('utf-8'))
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract backup: {str(e)}"
        )


@router.post("/restore")
async def restore_database(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Restore database from a backup JSON file
    This will REPLACE all existing data with the backup data
    """
    try:
        # Read and parse uploaded JSON file
        content = await file.read()
        backup_data = json.loads(content)
        
        # First, clear existing data
        db.query(Review).delete()
        db.query(Transaction).delete()
        db.query(PaymentSession).delete()
        db.query(Booking).delete()
        db.query(CustomAvailability).delete()
        db.query(TimeOffException).delete()
        db.query(InstructorSchedule).delete()
        db.query(Instructor).delete()
        db.query(Student).delete()
        db.query(PasswordResetToken).delete()
        db.query(User).delete()
        
        db.commit()
        
        # Restore users
        for user_data in backup_data.get('users', []):
            db.execute(text("""
                INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, status, 
                                   firebase_uid, address, address_latitude, address_longitude, 
                                   created_at, updated_at, last_login)
                VALUES (:id, :email, :phone, :password_hash, :first_name, :last_name, :role, :status,
                        :firebase_uid, :address, :address_latitude, :address_longitude,
                        :created_at, :updated_at, :last_login)
            """), user_data)
        
        # Restore instructors
        for instructor_data in backup_data.get('instructors', []):
            db.execute(text("""
                INSERT INTO instructors (id, user_id, license_number, license_types, id_number,
                                        vehicle_registration, vehicle_make, vehicle_model, vehicle_year,
                                        current_latitude, current_longitude, province, city, suburb,
                                        service_radius_km, max_travel_distance_km, rate_per_km_beyond_radius,
                                        is_available, hourly_rate, booking_fee, rating, total_reviews,
                                        is_verified, created_at, updated_at)
                VALUES (:id, :user_id, :license_number, :license_types, :id_number,
                        :vehicle_registration, :vehicle_make, :vehicle_model, :vehicle_year,
                        :current_latitude, :current_longitude, :province, :city, :suburb,
                        :service_radius_km, :max_travel_distance_km, :rate_per_km_beyond_radius,
                        :is_available, :hourly_rate, :booking_fee, :rating, :total_reviews,
                        :is_verified, :created_at, :updated_at)
            """), instructor_data)
        
        # Restore students
        for student_data in backup_data.get('students', []):
            db.execute(text("""
                INSERT INTO students (id, user_id, id_number, date_of_birth, created_at, updated_at)
                VALUES (:id, :user_id, :id_number, :date_of_birth, :created_at, :updated_at)
            """), student_data)
        
        # Restore bookings
        for booking_data in backup_data.get('bookings', []):
            db.execute(text("""
                INSERT INTO bookings (id, student_id, instructor_id, scheduled_time, duration_minutes,
                                     pickup_address, pickup_latitude, pickup_longitude, notes, status,
                                     cancellation_reason, payment_method, total_amount, instructor_fee,
                                     booking_fee, payment_status, created_at, updated_at)
                VALUES (:id, :student_id, :instructor_id, :scheduled_time, :duration_minutes,
                        :pickup_address, :pickup_latitude, :pickup_longitude, :notes, :status,
                        :cancellation_reason, :payment_method, :total_amount, :instructor_fee,
                        :booking_fee, :payment_status, :created_at, :updated_at)
            """), booking_data)
        
        # Restore reviews
        for review_data in backup_data.get('reviews', []):
            db.execute(text("""
                INSERT INTO reviews (id, booking_id, student_id, instructor_id, rating, comment, created_at)
                VALUES (:id, :booking_id, :student_id, :instructor_id, :rating, :comment, :created_at)
            """), review_data)
        
        # Restore schedules
        for schedule_data in backup_data.get('instructor_schedules', []):
            db.execute(text("""
                INSERT INTO instructor_schedules (id, instructor_id, day_of_week, start_time, end_time, is_available)
                VALUES (:id, :instructor_id, :day_of_week, :start_time, :end_time, :is_available)
            """), schedule_data)
        
        # Restore time off
        for timeoff_data in backup_data.get('time_off_exceptions', []):
            db.execute(text("""
                INSERT INTO time_off_exceptions (id, instructor_id, start_date, end_date, start_time, end_time, reason, notes)
                VALUES (:id, :instructor_id, :start_date, :end_date, :start_time, :end_time, :reason, :notes)
            """), timeoff_data)
        
        # Restore custom availability
        for custom_data in backup_data.get('custom_availability', []):
            db.execute(text("""
                INSERT INTO custom_availability (id, instructor_id, date, start_time, end_time)
                VALUES (:id, :instructor_id, :date, :start_time, :end_time)
            """), custom_data)
        
        # Restore transactions
        for transaction_data in backup_data.get('transactions', []):
            db.execute(text("""
                INSERT INTO transactions (id, booking_id, amount, payment_method, payment_provider,
                                         transaction_id, status, created_at)
                VALUES (:id, :booking_id, :amount, :payment_method, :payment_provider,
                        :transaction_id, :status, :created_at)
            """), transaction_data)
        
        db.commit()
        
        return {
            "message": "Database restored successfully",
            "users_restored": len(backup_data.get('users', [])),
            "instructors_restored": len(backup_data.get('instructors', [])),
            "students_restored": len(backup_data.get('students', [])),
            "bookings_restored": len(backup_data.get('bookings', [])),
            "reviews_restored": len(backup_data.get('reviews', [])),
        }
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON file format"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database restore failed: {str(e)}"
        )
