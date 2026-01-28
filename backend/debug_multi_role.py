"""
Debug script: Check multi-role user status and fix issues

This script checks what roles a user has and helps troubleshoot registration issues.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.user import User, Instructor, Student


def check_user_status(email: str):
    """Check all roles for a user by email"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"\n❌ User not found: {email}")
            return
        
        print(f"\n{'='*60}")
        print(f"User: {user.email}")
        print(f"{'='*60}")
        print(f"User ID: {user.id}")
        print(f"Name: {user.first_name} {user.last_name}")
        print(f"Phone: {user.phone}")
        print(f"Role: {user.role.value}")
        print(f"Status: {user.status.value}")
        
        # Check for student profile
        student = db.query(Student).filter(Student.user_id == user.id).first()
        if student:
            print(f"\n✅ Student Profile:")
            print(f"   ID: {student.id}")
            print(f"   ID Number: {student.id_number}")
            print(f"   City: {student.city}")
        else:
            print(f"\n❌ No Student Profile")
        
        # Check for instructor profile
        instructor = db.query(Instructor).filter(Instructor.user_id == user.id).first()
        if instructor:
            print(f"\n✅ Instructor Profile:")
            print(f"   ID: {instructor.id}")
            print(f"   ID Number: {instructor.id_number}")
            print(f"   License: {instructor.license_number}")
            print(f"   Verified: {instructor.is_verified}")
            print(f"   City: {instructor.city}")
        else:
            print(f"\n❌ No Instructor Profile")
        
        return user
        
    finally:
        db.close()


def check_phone_usage(phone: str):
    """Check which users have a given phone number"""
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.phone == phone).all()
        
        if not users:
            print(f"\n❌ No users with phone: {phone}")
            return
        
        print(f"\n{'='*60}")
        print(f"Users with phone: {phone}")
        print(f"{'='*60}")
        
        for user in users:
            print(f"\n{user.email}")
            print(f"  Role: {user.role.value}")
            
            student = db.query(Student).filter(Student.user_id == user.id).first()
            if student:
                print(f"  ✅ Has Student Profile")
            
            instructor = db.query(Instructor).filter(Instructor.user_id == user.id).first()
            if instructor:
                print(f"  ✅ Has Instructor Profile")
        
    finally:
        db.close()


def check_id_usage(id_number: str):
    """Check which users/instructors/students have a given ID number"""
    db = SessionLocal()
    try:
        print(f"\n{'='*60}")
        print(f"Checking ID number: {id_number}")
        print(f"{'='*60}")
        
        # Check students
        students = db.query(Student).filter(Student.id_number == id_number).all()
        if students:
            print(f"\n✅ Found in {len(students)} Student Profile(s):")
            for student in students:
                user = db.query(User).filter(User.id == student.user_id).first()
                print(f"   User: {user.email} (ID: {student.id})")
        
        # Check instructors
        instructors = db.query(Instructor).filter(Instructor.id_number == id_number).all()
        if instructors:
            print(f"\n✅ Found in {len(instructors)} Instructor Profile(s):")
            for instructor in instructors:
                user = db.query(User).filter(User.id == instructor.user_id).first()
                print(f"   User: {user.email} (ID: {instructor.id})")
        
        if not students and not instructors:
            print(f"\n❌ ID number not found in any profile")
        
    finally:
        db.close()


def delete_duplicate_profile(email: str, profile_type: str):
    """Delete a duplicate profile (student or instructor)"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"\n❌ User not found: {email}")
            return
        
        if profile_type.lower() == 'student':
            profile = db.query(Student).filter(Student.user_id == user.id).first()
            if profile:
                db.delete(profile)
                db.commit()
                print(f"\n✅ Deleted Student profile for {email}")
            else:
                print(f"\n❌ No Student profile found for {email}")
        
        elif profile_type.lower() == 'instructor':
            profile = db.query(Instructor).filter(Instructor.user_id == user.id).first()
            if profile:
                db.delete(profile)
                db.commit()
                print(f"\n✅ Deleted Instructor profile for {email}")
            else:
                print(f"\n❌ No Instructor profile found for {email}")
        else:
            print(f"\n❌ Invalid profile type: {profile_type}. Use 'student' or 'instructor'")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error deleting profile: {e}")
    finally:
        db.close()


def main():
    """Interactive menu"""
    print(f"\n{'#'*60}")
    print("# Multi-Role User Debug Tool")
    print(f"{'#'*60}\n")
    
    while True:
        print("\nOptions:")
        print("1. Check user status (by email)")
        print("2. Check phone number usage")
        print("3. Check ID number usage")
        print("4. Delete duplicate profile")
        print("5. Exit")
        
        choice = input("\nEnter choice (1-5): ").strip()
        
        if choice == '1':
            email = input("Enter email: ").strip()
            check_user_status(email)
        
        elif choice == '2':
            phone = input("Enter phone number: ").strip()
            check_phone_usage(phone)
        
        elif choice == '3':
            id_num = input("Enter ID number: ").strip()
            check_id_usage(id_num)
        
        elif choice == '4':
            email = input("Enter email: ").strip()
            profile = input("Enter profile type (student/instructor): ").strip()
            delete_duplicate_profile(email, profile)
        
        elif choice == '5':
            print("\nExiting...")
            break
        
        else:
            print("\n❌ Invalid choice. Try again.")


if __name__ == "__main__":
    main()
