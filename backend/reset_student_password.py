"""
Reset student password to 'password123'
"""

from passlib.context import CryptContext

from app.database import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = next(get_db())

student = db.query(User).filter_by(email="mvdeventer@lhar.co.za").first()

if student:
    student.hashed_password = pwd_context.hash("password123")
    db.commit()
    print(f"✓ Password reset for {student.email}")
    print("  New password: password123")
else:
    print("✗ Student not found")
