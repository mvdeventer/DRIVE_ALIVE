"""
Database migration: Add province and suburb fields to instructors and students tables
Run this script to update your database schema
"""

import sqlite3
from pathlib import Path


def migrate():
    """Add province and suburb columns to instructors and students tables"""

    # Use default database path
    db_path = Path(__file__).parent.parent / "drive_alive.db"

    if not db_path.exists():
        print(f"❌ Database not found at: {db_path}")
        print("Please start the backend server first to create the database.")
        return

    print(f"Connecting to database: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Add province and suburb to instructors table
        print("Adding 'province' column to instructors table...")
        cursor.execute("ALTER TABLE instructors ADD COLUMN province TEXT")

        print("Adding 'suburb' column to instructors table...")
        cursor.execute("ALTER TABLE instructors ADD COLUMN suburb TEXT")

        # Add suburb to students table (province already exists)
        print("Adding 'suburb' column to students table...")
        cursor.execute("ALTER TABLE students ADD COLUMN suburb TEXT")

        conn.commit()
        print("✅ Migration completed successfully!")
        print("\nNew columns added:")
        print("  - instructors.province (nullable)")
        print("  - instructors.suburb (nullable)")
        print("  - students.suburb (nullable)")

    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("⚠️  Columns already exist - migration already applied")
        else:
            print(f"❌ Migration failed: {e}")
            conn.rollback()
            raise
    finally:
        conn.close()


def rollback():
    """
    Note: SQLite doesn't support DROP COLUMN directly.
    To rollback, you would need to:
    1. Create new tables without these columns
    2. Copy data from old tables
    3. Drop old tables
    4. Rename new tables

    For development, it's easier to just delete the database and recreate it.
    """
    print("⚠️  SQLite doesn't support DROP COLUMN.")
    print("To rollback: Delete drive_alive.db and restart the server to recreate the database.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Database migration for location fields")
    parser.add_argument("--rollback", action="store_true", help="Rollback the migration")
    args = parser.parse_args()
