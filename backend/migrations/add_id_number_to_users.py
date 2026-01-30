"""
Migration script to add id_number column to users table
Run this script to update the database schema
"""

import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.database import engine


def add_id_number_column():
    """Add id_number column to users table"""
    print("Adding id_number column to users table...")
    
    with engine.connect() as conn:
        # SQLite-compatible check for column existence
        result = conn.execute(text("PRAGMA table_info(users)"))
        columns = [row[1] for row in result.fetchall()]
        
        if 'id_number' in columns:
            print("✓ Column 'id_number' already exists in users table")
            return
        
        # Add the column (SQLite syntax)
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN id_number VARCHAR
        """))
        conn.commit()
        
        print("✓ Successfully added id_number column to users table")
        print("  Note: Existing users will have NULL id_number (acceptable for legacy accounts)")


if __name__ == "__main__":
    try:
        add_id_number_column()
        print("\n✅ Migration completed successfully!")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)
