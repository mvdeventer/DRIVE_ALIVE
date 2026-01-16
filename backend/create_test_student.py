"""
Create a test student for payment testing
"""

from passlib.context import CryptContext

from app.database import get_db
from app.models.user import Student, User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = next(get_db())

# Check if test user already exists
existing = db.query(User).filter_by(email="test@student.com").first()
if existing:
    db.delete(existing)
    db.commit()
    print("Deleted existing test user")

# Create new test user
user = User(
    email="test@student.com",
    phone="+27111222333",
    password_hash=pwd_context.hash("password123"),
    role=UserRole.STUDENT,
    first_name="Test",
    last_name="Student",
)
db.add(user)
db.commit()
db.refresh(user)

# Create student profile
student = Student(
    user_id=user.id,
    id_number="9001015009087",  # Valid SA ID
    emergency_contact_name="Emergency Contact",
    emergency_contact_phone="+27999888777",
    address_line1="123 Test Street",
    province="Western Cape",
    city="Cape Town",
    postal_code="8001",
)
db.add(student)
db.commit()

print("=" * 80)
print("✓ Test student created successfully!")
print("=" * 80)
print(f"Email: test@student.com")
print(f"Password: password123")
print(f"Name: {user.first_name} {user.last_name}")
print(f"User ID: {user.id}")
print(f"Student ID: {student.id}")
print("=" * 80)
