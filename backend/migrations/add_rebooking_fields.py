"""
Migration: Add rebooking tracking fields to bookings table
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text

from app.config import settings


def migrate():
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # Add cancellation_fee column
        try:
            conn.execute(
                text(
                    """
                ALTER TABLE bookings
                ADD COLUMN cancellation_fee REAL DEFAULT 0.0
            """
                )
            )
            print("✅ Added cancellation_fee column")
        except Exception as e:
            print(f"⚠️  cancellation_fee column might already exist: {e}")

        # Add rebooking_count column
        try:
            conn.execute(
                text(
                    """
                ALTER TABLE bookings
                ADD COLUMN rebooking_count INTEGER DEFAULT 0 NOT NULL
            """
                )
            )
            print("✅ Added rebooking_count column")
        except Exception as e:
            print(f"⚠️  rebooking_count column might already exist: {e}")

        # Add original_lesson_date column
        try:
            conn.execute(
                text(
                    """
                ALTER TABLE bookings
                ADD COLUMN original_lesson_date TIMESTAMP WITH TIME ZONE
            """
                )
            )
            print("✅ Added original_lesson_date column")
        except Exception as e:
            print(f"⚠️  original_lesson_date column might already exist: {e}")

        conn.commit()
        print("✅ Migration completed successfully!")


if __name__ == "__main__":
    migrate()
