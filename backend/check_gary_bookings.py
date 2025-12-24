from app.database import get_db
from app.models.user import User, Instructor
from app.models.booking import Booking
from sqlalchemy import desc

db = next(get_db())

# Find Gary (instructor)
instructor = db.query(Instructor).join(User).filter(User.first_name == "gary").first()
if instructor:
    print(f"Instructor: {instructor.user.first_name} {instructor.user.last_name}")
    print(f"Instructor ID: {instructor.id}")

    # Get recent bookings
    bookings = db.query(Booking).filter(Booking.instructor_id == instructor.id).order_by(desc(Booking.lesson_date)).limit(10).all()
    print(f"\nRecent Bookings: {len(bookings)}")
    for b in bookings:
        student_name = f"{b.student.user.first_name} {b.student.user.last_name}" if b.student and b.student.user else "Unknown"
        print(f"  ID: {b.id}")
        print(f"    Date: {b.lesson_date}")
        print(f"    Student: {student_name}")
        print(f"    Status: {b.status}")
        print(f"    Payment: {b.payment_status}")
        print(f"    Duration: {b.duration_minutes} min")
        print()
else:
    print("Instructor Gary not found")

db.close()
