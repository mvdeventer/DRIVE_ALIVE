"""
Reset Martin's password to Koolkop11
"""

from app.database import SessionLocal
from app.models.user import User
from app.utils.auth import get_password_hash

db = SessionLocal()

martin = db.query(User).filter(User.email == "mvdeventer123@gmail.com").first()
if martin:
    martin.password_hash = get_password_hash("Koolkop11")
    db.commit()
    print(f"✓ Password reset for {martin.first_name} {martin.last_name}")
    print(f"  Email: {martin.email}")
    print(f"  New password: Koolkop11")
else:
    print("User not found")

db.close()
