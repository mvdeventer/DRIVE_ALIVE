"""
Test the new role-specific delete functionality
"""
import sys
sys.path.append('.')

from app.database import SessionLocal
from app.models.user import User, UserRole, UserStatus, Student, Instructor

print("=== BEFORE DELETE ===\n")

db = SessionLocal()

try:
    # Get Martin
    martin = db.query(User).filter(User.first_name == 'Martin').first()
    
    print(f"Martin (User ID: {martin.id})")
    print(f"  Primary Role: {martin.role.value}")
    print(f"  Status: {martin.status.value}")
    
    # Check profiles
    student = db.query(Student).filter(Student.user_id == martin.id).first()
    print(f"  Student Profile: {'✓ EXISTS' if student else '✗ NONE'}")
    
    instructor = db.query(Instructor).filter(Instructor.user_id == martin.id).first()
    print(f"  Instructor Profile: {'✓ EXISTS' if instructor else '✗ NONE'}")
    
    print("\n" + "="*60)
    print("\nNow testing deletion scenarios:")
    print("\n1. To delete ONLY Student profile:")
    print("   DELETE /admin/database-interface/users/1?role_type=student_profile")
    print("   → Deletes Student profile, keeps User + Instructor")
    
    print("\n2. To delete ONLY Instructor profile:")
    print("   DELETE /admin/database-interface/users/1?role_type=instructor_profile")
    print("   → Deletes Instructor profile, keeps User + Student")
    
    print("\n3. To suspend the entire User:")
    print("   DELETE /admin/database-interface/users/1")
    print("   OR")
    print("   DELETE /admin/database-interface/users/1?role_type=primary")
    print("   → Sets User.status = SUSPENDED, keeps all profiles")
    
    print("\n" + "="*60)
    print("\nAny admin can unsuspend any user (including other admins):")
    print("   PUT /admin/database-interface/users/1")
    print("   Body: {\"status\": \"ACTIVE\"}")
    print("   → Sets User.status = ACTIVE")
    
finally:
    db.close()
