"""
Migration: Remove unique constraints to allow multi-role users

This migration:
1. Removes unique constraint from users.phone
2. Removes unique constraint from instructors.id_number
3. Removes unique constraint from students.id_number

This allows one person to have multiple roles (student, instructor, admin)
using the same phone number and ID number.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import inspect, text

from app.database import engine


def remove_unique_constraints():
    """
    Remove unique constraints from phone and id_number fields
    """
    print("Starting migration: Remove unique constraints for multi-role users")

    with engine.connect() as conn:
        inspector = inspect(engine)

        # Get existing constraints
        print("\n=== Analyzing existing constraints ===")

        # Check users table
        users_constraints = inspector.get_unique_constraints("users")
        print(f"Users table constraints: {users_constraints}")

        # Check instructors table
        instructors_constraints = inspector.get_unique_constraints("instructors")
        print(f"Instructors table constraints: {instructors_constraints}")

        # Check students table
        students_constraints = inspector.get_unique_constraints("students")
        print(f"Students table constraints: {students_constraints}")

        print("\n=== Removing unique constraints ===")

        # SQLite doesn't support DROP CONSTRAINT, so we need to recreate tables
        # For production (PostgreSQL/MySQL), you would use ALTER TABLE DROP CONSTRAINT

        # Check if database is SQLite
        if engine.dialect.name == "sqlite":
            print("Detected SQLite database - recreating tables without unique constraints")

            # For SQLite, we need to:
            # 1. Create new tables without unique constraints
            # 2. Copy data
            # 3. Drop old tables
            # 4. Rename new tables

            # Start transaction
            trans = conn.begin()
            try:
                # Users table - remove phone unique constraint
                print("Recreating users table...")
                conn.execute(
                    text(
                        """
                    CREATE TABLE users_new (
                        id INTEGER PRIMARY KEY,
                        email VARCHAR NOT NULL UNIQUE,
                        phone VARCHAR NOT NULL,
                        password_hash VARCHAR NOT NULL,
                        first_name VARCHAR NOT NULL,
                        last_name VARCHAR NOT NULL,
                        role VARCHAR NOT NULL,
                        status VARCHAR,
                        firebase_uid VARCHAR UNIQUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP,
                        last_login TIMESTAMP
                    )
                    """
                    )
                )

                conn.execute(
                    text(
                        """
                    INSERT INTO users_new 
                    SELECT id, email, phone, password_hash, first_name, last_name, 
                           role, status, firebase_uid, created_at, updated_at, last_login
                    FROM users
                    """
                    )
                )

                # Instructors table - remove id_number unique constraint
                print("Recreating instructors table...")
                conn.execute(
                    text(
                        """
                    CREATE TABLE instructors_new (
                        id INTEGER PRIMARY KEY,
                        user_id INTEGER NOT NULL UNIQUE,
                        license_number VARCHAR NOT NULL UNIQUE,
                        license_types VARCHAR NOT NULL,
                        id_number VARCHAR NOT NULL,
                        vehicle_registration VARCHAR NOT NULL,
                        vehicle_make VARCHAR NOT NULL,
                        vehicle_model VARCHAR NOT NULL,
                        vehicle_year INTEGER NOT NULL,
                        current_latitude FLOAT,
                        current_longitude FLOAT,
                        province VARCHAR,
                        city VARCHAR NOT NULL,
                        suburb VARCHAR,
                        service_radius_km FLOAT DEFAULT 20.0,
                        max_travel_distance_km FLOAT DEFAULT 50.0,
                        rate_per_km_beyond_radius FLOAT DEFAULT 5.0,
                        is_available BOOLEAN DEFAULT 1,
                        hourly_rate FLOAT NOT NULL,
                        booking_fee FLOAT DEFAULT 20.0,
                        rating FLOAT DEFAULT 0.0,
                        total_reviews INTEGER DEFAULT 0,
                        bio TEXT,
                        is_verified BOOLEAN DEFAULT 0,
                        verified_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users_new (id)
                    )
                    """
                    )
                )

                conn.execute(
                    text(
                        """
                    INSERT INTO instructors_new 
                    SELECT * FROM instructors
                    """
                    )
                )

                # Students table - remove id_number unique constraint
                print("Recreating students table...")
                conn.execute(
                    text(
                        """
                    CREATE TABLE students_new (
                        id INTEGER PRIMARY KEY,
                        user_id INTEGER NOT NULL UNIQUE,
                        id_number VARCHAR NOT NULL,
                        learners_permit_number VARCHAR,
                        emergency_contact_name VARCHAR NOT NULL,
                        emergency_contact_phone VARCHAR NOT NULL,
                        address_line1 VARCHAR NOT NULL,
                        address_line2 VARCHAR,
                        province VARCHAR NOT NULL,
                        city VARCHAR NOT NULL,
                        suburb VARCHAR,
                        postal_code VARCHAR NOT NULL,
                        default_pickup_latitude FLOAT,
                        default_pickup_longitude FLOAT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users_new (id)
                    )
                    """
                    )
                )

                conn.execute(
                    text(
                        """
                    INSERT INTO students_new 
                    SELECT * FROM students
                    """
                    )
                )

                # Drop old tables
                print("Dropping old tables...")
                conn.execute(text("DROP TABLE students"))
                conn.execute(text("DROP TABLE instructors"))
                conn.execute(text("DROP TABLE users"))

                # Rename new tables
                print("Renaming new tables...")
                conn.execute(text("ALTER TABLE users_new RENAME TO users"))
                conn.execute(text("ALTER TABLE instructors_new RENAME TO instructors"))
                conn.execute(text("ALTER TABLE students_new RENAME TO students"))

                # Recreate indexes
                print("Recreating indexes...")
                conn.execute(text("CREATE INDEX ix_users_email ON users (email)"))
                conn.execute(text("CREATE INDEX ix_users_phone ON users (phone)"))
                conn.execute(
                    text("CREATE INDEX ix_users_firebase_uid ON users (firebase_uid)")
                )

                trans.commit()
                print("\n✅ Migration completed successfully!")
                print(
                    "Users can now have multiple roles with the same phone/ID number."
                )

            except Exception as e:
                trans.rollback()
                print(f"\n❌ Migration failed: {e}")
                raise

        else:
            # For PostgreSQL/MySQL - use ALTER TABLE
            print(f"Detected {engine.dialect.name} database - using ALTER TABLE")

            trans = conn.begin()
            try:
                # Drop unique constraint on phone (if exists)
                print("Dropping unique constraint on users.phone...")
                conn.execute(
                    text("ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_phone")
                )

                # Drop unique constraint on instructor id_number (if exists)
                print("Dropping unique constraint on instructors.id_number...")
                conn.execute(
                    text(
                        "ALTER TABLE instructors DROP CONSTRAINT IF EXISTS uq_instructors_id_number"
                    )
                )

                # Drop unique constraint on student id_number (if exists)
                print("Dropping unique constraint on students.id_number...")
                conn.execute(
                    text(
                        "ALTER TABLE students DROP CONSTRAINT IF EXISTS uq_students_id_number"
                    )
                )

                trans.commit()
                print("\n✅ Migration completed successfully!")
                print(
                    "Users can now have multiple roles with the same phone/ID number."
                )

            except Exception as e:
                trans.rollback()
                print(f"\n❌ Migration failed: {e}")
                raise


if __name__ == "__main__":
    remove_unique_constraints()
