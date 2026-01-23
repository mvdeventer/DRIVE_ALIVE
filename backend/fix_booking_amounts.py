"""
Fix booking amounts - separate lesson price from booking fee
This script updates existing bookings where amount includes the booking fee
"""

from app.database import SessionLocal
from app.models.booking import Booking


def fix_booking_amounts():
    """
    Fix booking amounts by subtracting booking_fee from amount field.

    Previously: amount = lesson_price + booking_fee
    Now: amount = lesson_price only (booking_fee stored separately)
    """
    db = SessionLocal()

    try:
        # Get all bookings
        bookings = db.query(Booking).all()

        print(f"Found {len(bookings)} bookings to process")

        updated_count = 0
        for booking in bookings:
            # Check if amount needs to be fixed
            # If booking_fee exists and is > 0, assume amount includes it
            if booking.booking_fee and booking.booking_fee > 0:
                # Subtract booking fee from amount
                old_amount = booking.amount
                booking.amount = old_amount - booking.booking_fee

                print(
                    f"Booking ID {booking.id}: R{old_amount} → R{booking.amount} (fee: R{booking.booking_fee})"
                )
                updated_count += 1

        # Commit changes
        if updated_count > 0:
            db.commit()
            print(f"\n✅ Successfully updated {updated_count} bookings")
        else:
            print("\n✅ No bookings needed updating")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("FIXING BOOKING AMOUNTS")
    print("=" * 60)
    print("\nThis will separate lesson prices from booking fees")
    print("Amount field will contain ONLY the lesson price")
    print("Booking fee is stored separately in booking_fee field\n")

    confirm = input("Continue? (yes/no): ")
    if confirm.lower() == "yes":
        fix_booking_amounts()
    else:
        print("Cancelled")
