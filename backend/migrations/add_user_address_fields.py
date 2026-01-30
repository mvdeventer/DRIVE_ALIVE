"""
Migration: Add address fields to users table
Date: 2026-01-30
Purpose: Add address, address_latitude, and address_longitude to users table
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text

from app.database import SessionLocal, engine


def add_address_fields():
    """Add address fields to users table"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("ADDING ADDRESS FIELDS TO USERS TABLE")
        print("=" * 80)
        
        # Check if columns already exist (SQLite method)
        result = db.execute(text("PRAGMA table_info(users)"))
        existing_columns = [row[1] for row in result]  # row[1] is column name
        
        if 'address' in existing_columns and 'address_latitude' in existing_columns and 'address_longitude' in existing_columns:
            print("✅ Address fields already exist in users table!")
            return
        
        print(f"\nExisting columns: {len(existing_columns)} columns in users table")
        print("\nAdding missing address columns...")
        
        # Add address column if it doesn't exist
        if 'address' not in existing_columns:
            print("  Adding 'address' column...")
            db.execute(text("ALTER TABLE users ADD COLUMN address VARCHAR"))
            print("  ✅ Added 'address' column")
        
        # Add address_latitude column if it doesn't exist
        if 'address_latitude' not in existing_columns:
            print("  Adding 'address_latitude' column...")
            db.execute(text("ALTER TABLE users ADD COLUMN address_latitude FLOAT"))
            print("  ✅ Added 'address_latitude' column")
        
        # Add address_longitude column if it doesn't exist
        if 'address_longitude' not in existing_columns:
            print("  Adding 'address_longitude' column...")
            db.execute(text("ALTER TABLE users ADD COLUMN address_longitude FLOAT"))
            print("  ✅ Added 'address_longitude' column")
        
        db.commit()
        
        print("\n" + "=" * 80)
        print("✅ ADDRESS FIELDS ADDED SUCCESSFULLY!")
        print("=" * 80)
        print("\nChanges made:")
        print("  • Added 'address' (VARCHAR, nullable)")
        print("  • Added 'address_latitude' (FLOAT, nullable)")
        print("  • Added 'address_longitude' (FLOAT, nullable)")
        print("\nAll users can now store their address information with GPS coordinates.")
        
    except Exception as e:
        print(f"\n❌ Error adding address fields: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_address_fields()
