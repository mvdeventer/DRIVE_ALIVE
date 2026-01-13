"""Direct database test for earnings endpoint"""

import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.instructor import Instructor
from app.models.user import User, UserRole


async def test_earnings():
    db = SessionLocal()
    try:
        # Get first admin user
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not admin:
            print("❌ No admin user found")
            return

        print(f"✅ Found admin: {admin.email}")

        # Get first instructor
        instructor = db.query(Instructor).first()
        if not instructor:
            print("❌ No instructor found")
            return

        user = db.query(User).filter(User.id == instructor.user_id).first()
        print(
            f"✅ Found instructor: {user.first_name} {user.last_name} (ID: {instructor.id})"
        )

        # Import and call the function
        from app.routes.admin import get_instructor_earnings_report_admin

        result = await get_instructor_earnings_report_admin(
            instructor_id=instructor.id, current_admin=admin, db=db
        )

        print(f"\n📊 Earnings Report Results:")
        print(f"   Instructor: {result['instructor_name']}")
        print(f"   Total Earnings: R{result['total_earnings']}")
        print(f"   Completed Lessons: {result['completed_lessons']}")
        print(f"   Recent Earnings Count: {len(result['recent_earnings'])}")

        if result["recent_earnings"]:
            print(f"\n📝 First Recent Earning:")
            first = result["recent_earnings"][0]
            for key, value in first.items():
                print(f"   {key}: {value}")
        else:
            print("\n⚠️  No recent earnings found")

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(test_earnings())
