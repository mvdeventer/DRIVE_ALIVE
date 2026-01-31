"""
Migration script to add twilio_sender_phone_number column to users table
"""

import sqlite3
from pathlib import Path


def run_migration():
    """Add twilio_sender_phone_number column to users table"""

    # Find the database - try multiple locations
    backend_dir = Path(__file__).parent.parent
    possible_paths = [
        backend_dir / "drive_alive.db",  # Root of backend
        backend_dir / "app" / "database" / "drive_alive.db",  # In app/database
        Path.cwd() / "drive_alive.db",  # Current working directory
    ]

    db_path = None
    for path in possible_paths:
        if path.exists():
            db_path = path
            break

    if db_path is None:
        print(f"Database not found in any of these locations:")
        for path in possible_paths:
            print(f"  - {path}")
        print("Creating new database will happen on first run...")
        return

    print(f"Found database at: {db_path}")

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]

        if "twilio_sender_phone_number" in columns:
            print("Column 'twilio_sender_phone_number' already exists in users table")
            conn.close()
            return

        # Add the column
        cursor.execute(
            """
            ALTER TABLE users
            ADD COLUMN twilio_sender_phone_number VARCHAR(20) NULL
            """
        )

        conn.commit()
        print("✅ Successfully added 'twilio_sender_phone_number' column to users table")

        # Show table info
        cursor.execute("PRAGMA table_info(users)")
        print("\nUpdated users table schema:")
        for row in cursor.fetchall():
            if "twilio" in row[1].lower():
                print(f"  {row[1]}: {row[2]}")

        conn.close()

    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        raise


if __name__ == "__main__":
    run_migration()
