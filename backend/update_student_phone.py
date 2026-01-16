"""Update student phone number"""

import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()

# Update Piet's phone number to +27611154598
user = db.query(User).filter(User.email == "mvdeventer@lhar.co.za").first()
if user:
    old_phone = user.phone
    user.phone = "+27611154598"
    db.commit()
    print(f"✅ Updated {user.first_name} {user.last_name}'s phone")
    print(f"   Old: {old_phone}")
    print(f"   New: {user.phone}")
    print()
    print("Now when you book a lesson with this student account,")
    print("you'll receive WhatsApp confirmation on +27611154598")
else:
    print("❌ Student not found")

db.close()
