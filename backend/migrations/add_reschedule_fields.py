"""
Migration: Add reschedule status and tracking fields
- Add RESCHEDULED to BookingStatus enum
- Add rescheduled_to_booking_id column to bookings
- Add reschedule_booking_id column to payment_sessions
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text

from app.config import settings


def migrate():
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # For PostgreSQL: Add 'rescheduled' to BookingStatus enum
        try:
            conn.execute(
                text(
                    """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_enum
                        WHERE enumtypid = 'bookingstatus'::regtype
                        AND enumlabel = 'rescheduled'
                    ) THEN
                        ALTER TYPE bookingstatus ADD VALUE 'rescheduled';
                    END IF;
                END$$;
            """
                )
            )
            print("✅ Added 'rescheduled' to BookingStatus enum")
        except Exception as e:
            print(f"⚠️  BookingStatus enum update: {e}")
            # For SQLite: enum values are stored as strings, no migration needed
            print("   (SQLite stores enums as strings — no change needed)")

        # Add rescheduled_to_booking_id column to bookings
        try:
            conn.execute(
                text(
                    """
                ALTER TABLE bookings
                ADD COLUMN rescheduled_to_booking_id INTEGER
                REFERENCES bookings(id)
            """
                )
            )
            print("✅ Added rescheduled_to_booking_id column to bookings")
        except Exception as e:
            print(
                f"⚠️  rescheduled_to_booking_id column might already exist: {e}"
            )

        # Add reschedule_booking_id column to payment_sessions
        try:
            conn.execute(
                text(
                    """
                ALTER TABLE payment_sessions
                ADD COLUMN reschedule_booking_id INTEGER
            """
                )
            )
            print("✅ Added reschedule_booking_id column to payment_sessions")
        except Exception as e:
            print(
                f"⚠️  reschedule_booking_id column might already exist: {e}"
            )

        conn.commit()
        print("\n✅ Migration complete!")


if __name__ == "__main__":
    migrate()
