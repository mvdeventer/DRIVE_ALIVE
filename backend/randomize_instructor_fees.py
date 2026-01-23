"""
Set random booking fees (R1-R20) and uniform hourly rate (R250) for all instructors
For testing purposes
"""

import random

from app.database import SessionLocal
from app.models.user import Instructor


def randomize_instructor_fees():
    """
    Set random booking fees between R1 and R20 for all instructors
    Set all hourly rates to R250
    """
    db = SessionLocal()

    try:
        # Get all instructors
        instructors = db.query(Instructor).all()

        print(f"Found {len(instructors)} instructors to update")
        print("=" * 60)

        for instructor in instructors:
            # Generate random booking fee between R1 and R20
            old_booking_fee = instructor.booking_fee
            old_hourly_rate = instructor.hourly_rate

            instructor.booking_fee = round(random.uniform(1.0, 20.0), 2)
            instructor.hourly_rate = 250.0

            print(f"Instructor ID {instructor.id}:")
            print(f"  Hourly Rate: R{old_hourly_rate} → R{instructor.hourly_rate}")
            print(f"  Booking Fee: R{old_booking_fee} → R{instructor.booking_fee}")
            print()

        # Commit changes
        db.commit()
        print("=" * 60)
        print(f"✅ Successfully updated {len(instructors)} instructors")
        print("   - All hourly rates set to R250")
        print("   - All booking fees randomized between R1 and R20")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("RANDOMIZE INSTRUCTOR FEES (TESTING)")
    print("=" * 60)
    print("\nThis will:")
    print("  1. Set ALL instructor hourly rates to R250")
    print("  2. Set ALL booking fees to random values (R1-R20)\n")

    confirm = input("Continue? (yes/no): ")
    if confirm.lower() == "yes":
        randomize_instructor_fees()
    else:
        print("Cancelled")
