"""
Quick verification script for Martin's account status
Run this to confirm database state before troubleshooting frontend
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.user import User, UserRole, UserStatus

db = SessionLocal()

print("=" * 60)
print("MARTIN'S ACCOUNT STATUS VERIFICATION")
print("=" * 60)

# Find Martin (should be user_id = 1)
martin = db.query(User).filter(User.id == 1).first()

if not martin:
    print("❌ ERROR: No user with ID=1 found!")
    db.close()
    exit(1)

print(f"\n✅ User Found:")
print(f"   ID: {martin.id}")
print(f"   Name: {martin.first_name} {martin.last_name}")
print(f"   Email: {martin.email}")
print(f"   Role: {martin.role.value}")
print(f"   Status: {martin.status.value}")
print(f"   Has Student Profile: {'✓' if martin.student_profile else '✗'}")
print(f"   Has Instructor Profile: {'✓' if martin.instructor_profile else '✗'}")

print("\n" + "=" * 60)
print("DIAGNOSIS:")
print("=" * 60)

if martin.status == UserStatus.ACTIVE:
    print("✅ Status is ACTIVE - Database is correct!")
    print("\n⚠️ If you're getting 403 errors, the problem is:")
    print("   → Your JWT token still says 'SUSPENDED'")
    print("   → You MUST logout and login to get a fresh token")
    print("\nSTEPS TO FIX:")
    print("   1. Click 'Logout' button (top-right)")
    print("   2. Login with: mvdeventer123@gmail.com / Martin@1234")
    print("   3. Select 'admin' role")
    print("   4. Try Database Interface again")
elif martin.status == UserStatus.SUSPENDED:
    print("⚠️ Status is SUSPENDED - Need to unsuspend!")
    print("\nRun: python unsuspend_martin.py")
else:
    print(f"⚠️ Status is {martin.status.value}")

print("=" * 60)

db.close()
