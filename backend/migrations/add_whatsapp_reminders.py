"""
Migration: Add WhatsApp reminder tracking and booking fee fields
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text

from app.config import settings


def migrate():
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # Add reminder_sent column
        try:
            conn.execute(
                text(
                    """
                ALTER TABLE bookings
                ADD COLUMN reminder_sent BOOLEAN DEFAULT 0 NOT NULL
            """
                )
            )
            print("✅ Added reminder_sent column")
        except Exception as e:
            print(f"⚠️  reminder_sent column might already exist: {e}")

        # Add instructor_reminder_sent column
        try:
            conn.execute(
                text(
                    """
                ALTER TABLE bookings
                ADD COLUMN instructor_reminder_sent BOOLEAN DEFAULT 0 NOT NULL
            """
                )
            )
            print("✅ Added instructor_reminder_sent column")
        except Exception as e:
            print(f"⚠️  instructor_reminder_sent column might already exist: {e}")

        # Add daily_summary_sent column
        try:
            conn.execute(
                text(
                    """
                ALTER TABLE bookings
                ADD COLUMN daily_summary_sent BOOLEAN DEFAULT 0 NOT NULL
            """
                )
            )
            print("✅ Added daily_summary_sent column")
        except Exception as e:
            print(f"⚠️  daily_summary_sent column might already exist: {e}")

        # Add booking_fee column
        try:
            conn.execute(
                text(
                    """
                ALTER TABLE bookings
                ADD COLUMN booking_fee REAL DEFAULT 10.0 NOT NULL
            """
                )
            )
            print("✅ Added booking_fee column")
        except Exception as e:
            print(f"⚠️  booking_fee column might already exist: {e}")

        conn.commit()
        print("✅ Migration completed successfully!")


def rollback():
    """Rollback the migration"""
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE bookings DROP COLUMN reminder_sent"))
            conn.execute(
                text("ALTER TABLE bookings DROP COLUMN instructor_reminder_sent")
            )
            conn.execute(text("ALTER TABLE bookings DROP COLUMN daily_summary_sent"))
            conn.execute(text("ALTER TABLE bookings DROP COLUMN booking_fee"))
            conn.commit()
            print("✅ Rollback completed successfully!")
        except Exception as e:
            print(f"❌ Rollback failed: {e}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback()
    else:
        migrate()
