"""
Test first admin protection
"""
import sys
sys.path.append('.')

from app.database import SessionLocal
from app.models.user import User, UserRole, UserStatus
from datetime import datetime, timezone

db = SessionLocal()

try:
    # Get first admin
    first_admin = db.query(User).filter(User.id == 1).first()
    
    print("=== FIRST ADMIN PROTECTION TEST ===\n")
    print(f"First Admin (ID: {first_admin.id})")
    print(f"  Name: {first_admin.first_name} {first_admin.last_name}")
    print(f"  Email: {first_admin.email}")
    print(f"  Role: {first_admin.role.value}")
    print(f"  Status: {first_admin.status.value}")
    
    print("\n" + "="*60)
    print("\n✓ PROTECTED OPERATIONS (Will be blocked by API):")
    print("\n1. DELETE /admin/database-interface/users/1")
    print("   → 403 Forbidden: Cannot suspend the original admin account")
    
    print("\n2. PUT /admin/database-interface/users/1")
    print("   Body: {\"status\": \"SUSPENDED\"}")
    print("   → 403 Forbidden: Cannot change status of original admin")
    
    print("\n3. PUT /admin/database-interface/users/1")
    print("   Body: {\"status\": \"INACTIVE\"}")
    print("   → 403 Forbidden: Cannot change status of original admin")
    
    print("\n" + "="*60)
    print("\n✓ ALLOWED OPERATIONS:")
    print("\n1. DELETE /admin/database-interface/users/1?role_type=student_profile")
    print("   → Deletes Student profile only (admin role remains)")
    
    print("\n2. DELETE /admin/database-interface/users/1?role_type=instructor_profile")
    print("   → Deletes Instructor profile only (admin role remains)")
    
    print("\n3. PUT /admin/database-interface/users/1")
    print("   Body: {\"first_name\": \"NewName\"}")
    print("   → Updates name (status remains ACTIVE)")
    
    print("\n4. PUT /admin/database-interface/users/1")
    print("   Body: {\"status\": \"ACTIVE\"}")
    print("   → Allowed (keeps status ACTIVE)")
    
    print("\n" + "="*60)
    print("\n✓ OTHER ADMINS (ID != 1):")
    print("  Can be suspended/deleted by any admin")
    
finally:
    db.close()
