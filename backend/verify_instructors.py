"""Verify all instructors in database"""

import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import Instructor

db = SessionLocal()

instructors = db.query(Instructor).all()
print(f"\nVerifying {len(instructors)} instructor(s)...\n")

for instructor in instructors:
    instructor.is_verified = True
    instructor.verified_at = datetime.utcnow()
    print(f"✅ Verified Instructor ID: {instructor.id}")

db.commit()
print(f"\n✅ All instructors verified successfully!\n")

db.close()
