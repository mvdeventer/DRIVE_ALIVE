"""
Migration: Make instructor city column nullable

This migration:
1. Makes instructors.city nullable (removes NOT NULL constraint)

Reason: GPS AddressAutocomplete captures location data, so manual city entry
is no longer required. The frontend has been updated to remove manual city/province/suburb
fields, relying solely on GPS-captured coordinates.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text

from app.database import engine


def make_city_nullable():
    """
    Make the city column nullable in instructors table
    """
    print("Starting migration: Make instructor city column nullable")

    with engine.connect() as conn:
        print("\n=== Step 1: Backup current instructors table ===")
        
        # Get current data
        result = conn.execute(text("SELECT COUNT(*) FROM instructors"))
        count = result.scalar()
        print(f"Found {count} instructor(s) in database")

        print("\n=== Step 2: Create new instructors table with nullable city ===")
        
        # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
        # Create new table with nullable city
        conn.execute(text("""
            CREATE TABLE instructors_new (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE,
                license_number TEXT NOT NULL UNIQUE,
                license_types TEXT NOT NULL,
                id_number TEXT NOT NULL,
                vehicle_registration TEXT NOT NULL,
                vehicle_make TEXT NOT NULL,
                vehicle_model TEXT NOT NULL,
                vehicle_year INTEGER NOT NULL,
                current_latitude REAL,
                current_longitude REAL,
                province TEXT,
                city TEXT,  -- NOW NULLABLE
                suburb TEXT,
                service_radius_km REAL DEFAULT 20.0,
                max_travel_distance_km REAL DEFAULT 50.0,
                rate_per_km_beyond_radius REAL DEFAULT 5.0,
                is_available BOOLEAN DEFAULT 1,
                hourly_rate REAL NOT NULL,
                booking_fee REAL DEFAULT 20.0,
                rating REAL DEFAULT 0.0,
                total_reviews INTEGER DEFAULT 0,
                bio TEXT,
                is_verified BOOLEAN DEFAULT 0,
                verified_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """))
        print("✅ New table 'instructors_new' created with nullable city column")

        print("\n=== Step 3: Copy data from old table to new table ===")
        
        # Copy all data
        conn.execute(text("""
            INSERT INTO instructors_new 
            SELECT * FROM instructors
        """))
        print("✅ Data copied successfully")

        print("\n=== Step 4: Drop old table and rename new table ===")
        
        # Drop old table
        conn.execute(text("DROP TABLE instructors"))
        print("✅ Old 'instructors' table dropped")
        
        # Rename new table
        conn.execute(text("ALTER TABLE instructors_new RENAME TO instructors"))
        print("✅ New table renamed to 'instructors'")

        print("\n=== Step 5: Recreate indexes ===")
        
        # Recreate indexes
        conn.execute(text("CREATE INDEX ix_instructors_id ON instructors (id)"))
        conn.execute(text("CREATE UNIQUE INDEX ix_instructors_user_id ON instructors (user_id)"))
        conn.execute(text("CREATE UNIQUE INDEX ix_instructors_license_number ON instructors (license_number)"))
        print("✅ Indexes recreated")

        # Commit changes
        conn.commit()

        print("\n=== Migration complete ===")
        print("✅ instructors.city column is now nullable")
        print("✅ GPS-captured addresses will work without manual city entry")


if __name__ == "__main__":
    try:
        make_city_nullable()
        print("\n✅ SUCCESS: Migration completed successfully")
    except Exception as e:
        print(f"\n❌ ERROR: Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
