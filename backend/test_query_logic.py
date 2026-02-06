"""
Test the database query logic directly (no API needed)
"""
import sys
sys.path.append('.')

from sqlalchemy import or_
from app.database import SessionLocal
from app.models.user import User, UserRole, UserStatus, Student, Instructor

db = SessionLocal()

try:
    print("=== Testing Database Queries ===\n")
    
    # Test 1: No filters (ALL)
    print("1. Query ALL users (no filters)")
    query = db.query(User)
    users = query.all()
    print(f"Total: {len(users)}")
    for user in users:
        print(f"  - {user.first_name} {user.last_name} ({user.role.value})")
        if user.student_profile:
            print(f"    ✓ Has Student profile")
        if user.instructor_profile:
            print(f"    ✓ Has Instructor profile")
    
    print("\n" + "="*60 + "\n")
    
    # Test 2: Filter STUDENT (users with student profiles OR role=STUDENT)
    print("2. Query STUDENT filter (has student profile OR role=STUDENT)")
    query = db.query(User).outerjoin(Student).filter(
        or_(
            User.role == UserRole.STUDENT,
            Student.id.isnot(None)
        )
    ).distinct()
    users = query.all()
    print(f"Total: {len(users)}")
    for user in users:
        print(f"  - {user.first_name} {user.last_name} ({user.role.value})")
        if user.student_profile:
            print(f"    ✓ Has Student profile (ID: {user.student_profile.id})")
    
    print("\n" + "="*60 + "\n")
    
    # Test 3: Filter INSTRUCTOR (users with instructor profiles OR role=INSTRUCTOR)
    print("3. Query INSTRUCTOR filter (has instructor profile OR role=INSTRUCTOR)")
    query = db.query(User).outerjoin(Instructor).filter(
        or_(
            User.role == UserRole.INSTRUCTOR,
            Instructor.id.isnot(None)
        )
    ).distinct()
    users = query.all()
    print(f"Total: {len(users)}")
    for user in users:
        print(f"  - {user.first_name} {user.last_name} ({user.role.value})")
        if user.instructor_profile:
            print(f"    ✓ Has Instructor profile (ID: {user.instructor_profile.id})")
    
    print("\n" + "="*60 + "\n")
    
    # Test 4: Filter ADMIN
    print("4. Query ADMIN filter (role=ADMIN)")
    query = db.query(User).filter(User.role == UserRole.ADMIN)
    users = query.all()
    print(f"Total: {len(users)}")
    for user in users:
        print(f"  - {user.first_name} {user.last_name} ({user.role.value})")
    
finally:
    db.close()
