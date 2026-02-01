#!/usr/bin/env python3
"""
Script to delete Elana van Deventer's instructor profile from the database
"""

import sys
sys.path.insert(0, '/Projects/DRIVE_ALIVE/backend')

from app.database import SessionLocal
from app.models.user import User, UserRole, Instructor

def delete_elana_instructor():
    db = SessionLocal()
    try:
        # Find Elana's user account
        elana = db.query(User).filter(
            User.full_name.ilike('%Elana%van Deventer%')
        ).first()
        
        if not elana:
            print("❌ Elana van Deventer not found in database")
            return
        
        print(f"✅ Found user: {elana.full_name} (ID: {elana.id}, Email: {elana.email})")
        print(f"   Role: {elana.role}, Status: {elana.status}")
        
        # Find her instructor profile
        instructor = db.query(Instructor).filter(
            Instructor.user_id == elana.id
        ).first()
        
        if not instructor:
            print("❌ No instructor profile found for Elana")
            return
        
        print(f"✅ Found instructor profile (ID: {instructor.id})")
        print(f"   Vehicle: {instructor.vehicle_model if hasattr(instructor, 'vehicle_model') else 'N/A'}")
        print(f"   Booking Fee: R{instructor.booking_fee if hasattr(instructor, 'booking_fee') else 'N/A'}")
        
        # Delete instructor profile
        db.delete(instructor)
        db.commit()
        
        print(f"\n✅ Successfully deleted Elana's instructor profile!")
        
        # Check if user should also be deleted
        student = db.query(User).filter(User.id == elana.id).first()
        if student and student.role != UserRole.ADMIN:
            print(f"⚠️  Note: User account still exists with role: {student.role}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    delete_elana_instructor()
