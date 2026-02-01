"""
Migration: Add inactivity_timeout_minutes to users table
Adds global system setting for auto-logout timeout
"""

import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from sqlalchemy import Column, Integer, text

def add_inactivity_timeout_column():
    """Add inactivity_timeout_minutes column to users table"""
    db = SessionLocal()
    
    try:
        print("🔄 Starting migration: Add inactivity_timeout_minutes column...")
        
        # Check if column already exists
        result = db.execute(text("""
            SELECT COUNT(*) 
            FROM pragma_table_info('users') 
            WHERE name='inactivity_timeout_minutes'
        """))
        
        column_exists = result.scalar() > 0
        
        if column_exists:
            print("✅ Column 'inactivity_timeout_minutes' already exists. Skipping migration.")
            return
        
        # Add column with default value of 15 minutes
        print("➕ Adding 'inactivity_timeout_minutes' column...")
        db.execute(text("""
            ALTER TABLE users 
            ADD COLUMN inactivity_timeout_minutes INTEGER DEFAULT 15
        """))
        
        db.commit()
        print("✅ Migration completed successfully!")
        print("📌 Default inactivity timeout: 15 minutes")
        print("📌 Admins can change this via Admin Settings screen")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_inactivity_timeout_column()
