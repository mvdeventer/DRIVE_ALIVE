"""Check instructors in database"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import Instructor, User

db = SessionLocal()

instructors = db.query(Instructor).all()
print(f"\nTotal instructors in database: {len(instructors)}\n")

for instructor in instructors:
    user = db.query(User).filter(User.id == instructor.user_id).first()
    print(f"Instructor ID: {instructor.id}")
    print(f"  Name: {user.first_name} {user.last_name}")
    print(f"  Email: {user.email}")
    print(f"  City: {instructor.city}")
    print(f'  Suburb: {instructor.suburb or "N/A"}')
    print(f"  Verified: {instructor.is_verified}")
    print(f"  Available: {instructor.is_available}")
    print(f"  Rating: {instructor.rating}")
    print()

db.close()
