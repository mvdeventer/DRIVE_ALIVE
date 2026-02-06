"""
Demonstrate unsuspending Martin (any admin can do this)
"""
import sys
sys.path.append('.')

from app.database import SessionLocal
from app.models.user import User, UserStatus
from datetime import datetime, timezone

db = SessionLocal()

try:
    # Get Martin
    martin = db.query(User).filter(User.first_name == 'Martin').first()
    
    print(f"=== BEFORE UNSUSPEND ===")
    print(f"Martin (ID: {martin.id})")
    print(f"  Status: {martin.status.value}")
    print(f"  Student Profile: {'✓' if martin.student_profile else '✗'}")
    print(f"  Instructor Profile: {'✓' if martin.instructor_profile else '✗'}")
    
    # Unsuspend Martin
    print(f"\n>>> Unsuspending Martin...")
    martin.status = UserStatus.ACTIVE
    martin.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(martin)
    
    print(f"\n=== AFTER UNSUSPEND ===")
    print(f"Martin (ID: {martin.id})")
    print(f"  Status: {martin.status.value} ✓")
    print(f"  Student Profile: {'✓' if martin.student_profile else '✗'}")
    print(f"  Instructor Profile: {'✓' if martin.instructor_profile else '✗'}")
    
    print(f"\n✓ Successfully unsuspended Martin!")
    print(f"✓ All profiles remain intact")
    
finally:
    db.close()
