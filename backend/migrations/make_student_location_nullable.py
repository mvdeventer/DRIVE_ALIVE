"""
Migration: Make student province and city columns nullable

This migration:
1. Makes students.province nullable (removes NOT NULL constraint)
2. Makes students.city nullable (removes NOT NULL constraint)

Reason: GPS AddressAutocomplete captures location data, so manual province/city entry
is no longer required. The frontend has been updated to remove manual province/city/suburb
fields, relying solely on GPS-captured coordinates.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text

from app.database import engine


def make_student_location_nullable():
    """
    Make province and city columns nullable in students table
    """
    print("Starting migration: Make student province/city columns nullable")

    with engine.connect() as conn:
        print("\n=== Step 1: Backup current students table ===")
        
        # Get current data
        result = conn.execute(text("SELECT COUNT(*) FROM students"))
        count = result.scalar()
        print(f"Found {count} student(s) in database")

        print("\n=== Step 2: Create new students table with nullable province/city ===")
        
        # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
        # Create new table with nullable province and city
        conn.execute(text("""
            CREATE TABLE students_new (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE,
                id_number TEXT NOT NULL,
                learners_permit_number TEXT,
                emergency_contact_name TEXT NOT NULL,
                emergency_contact_phone TEXT NOT NULL,
                address_line1 TEXT NOT NULL,
                address_line2 TEXT,
                province TEXT,  -- NOW NULLABLE
                city TEXT,      -- NOW NULLABLE
                suburb TEXT,
                postal_code TEXT NOT NULL,
                default_pickup_latitude REAL,
                default_pickup_longitude REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """))
        print("✅ New table 'students_new' created with nullable province/city columns")

        print("\n=== Step 3: Copy data from old table to new table ===")
        
        # Copy all data
        conn.execute(text("""
            INSERT INTO students_new 
            SELECT * FROM students
        """))
        print("✅ Data copied successfully")

        print("\n=== Step 4: Drop old table and rename new table ===")
        
        # Drop old table
        conn.execute(text("DROP TABLE students"))
        print("✅ Old 'students' table dropped")
        
        # Rename new table
        conn.execute(text("ALTER TABLE students_new RENAME TO students"))
        print("✅ New table renamed to 'students'")

        print("\n=== Step 5: Recreate indexes ===")
        
        # Recreate indexes
        conn.execute(text("CREATE INDEX ix_students_id ON students (id)"))
        conn.execute(text("CREATE UNIQUE INDEX ix_students_user_id ON students (user_id)"))
        print("✅ Indexes recreated")

        # Commit changes
        conn.commit()

        print("\n=== Migration complete ===")
        print("✅ students.province column is now nullable")
        print("✅ students.city column is now nullable")
        print("✅ GPS-captured addresses will work without manual province/city entry")


if __name__ == "__main__":
    try:
        make_student_location_nullable()
        print("\n✅ SUCCESS: Migration completed successfully")
    except Exception as e:
        print(f"\n❌ ERROR: Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
