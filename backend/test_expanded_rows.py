"""
Test the new expanded rows logic - should show Martin 3 times
"""
import sys
sys.path.append('.')

from app.database import SessionLocal
from app.models.user import User, UserRole

db = SessionLocal()

try:
    # Fetch all users
    users = db.query(User).all()
    
    # Simulate the expansion logic
    expanded_rows = []
    for user in users:
        # Always include user's primary role
        expanded_rows.append({
            "name": f"{user.first_name} {user.last_name}",
            "email": user.email,
            "role": user.role.value,
            "row_type": "primary"
        })
        
        # If has Student profile AND primary role is not STUDENT
        if user.student_profile and user.role != UserRole.STUDENT:
            expanded_rows.append({
                "name": f"{user.first_name} {user.last_name}",
                "email": user.email,
                "role": "student",
                "row_type": "student_profile"
            })
        
        # If has Instructor profile AND primary role is not INSTRUCTOR
        if user.instructor_profile and user.role != UserRole.INSTRUCTOR:
            expanded_rows.append({
                "name": f"{user.first_name} {user.last_name}",
                "email": user.email,
                "role": "instructor",
                "row_type": "instructor_profile"
            })
    
    print("=== ALL USERS (Expanded Rows) ===")
    print(f"Total rows: {len(expanded_rows)}\n")
    
    for row in expanded_rows:
        print(f"{row['name']:30} | {row['email']:35} | {row['role']:12} | {row['row_type']}")
    
    print("\n" + "="*60)
    
    # Test filter by STUDENT
    student_rows = [row for row in expanded_rows if row["role"] == "student"]
    print(f"\n=== STUDENT FILTER ({len(student_rows)} rows) ===")
    for row in student_rows:
        print(f"{row['name']:30} | {row['role']:12}")
    
    # Test filter by INSTRUCTOR
    instructor_rows = [row for row in expanded_rows if row["role"] == "instructor"]
    print(f"\n=== INSTRUCTOR FILTER ({len(instructor_rows)} rows) ===")
    for row in instructor_rows:
        print(f"{row['name']:30} | {row['role']:12}")
    
    # Test filter by ADMIN
    admin_rows = [row for row in expanded_rows if row["role"] == "admin"]
    print(f"\n=== ADMIN FILTER ({len(admin_rows)} rows) ===")
    for row in admin_rows:
        print(f"{row['name']:30} | {row['role']:12}")
    
finally:
    db.close()
