"""
Migration: Add backup configuration settings to users table
Adds backup_interval_minutes, retention_days, auto_archive_after_days columns
"""

import os
import sys
import sqlite3
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def run_migration():
    """Add backup settings columns to users table"""
    
    try:
        db_path = 'drive_alive.db'
        if not os.path.exists(db_path):
            print(f"Database file not found at {db_path}")
            return False
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔄 Adding backup configuration columns to users table...")
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'backup_interval_minutes' not in columns:
            print("  ✓ Adding backup_interval_minutes column...")
            cursor.execute("""
                ALTER TABLE users ADD COLUMN backup_interval_minutes INTEGER DEFAULT 10
            """)
        else:
            print("  • backup_interval_minutes already exists")
        
        if 'retention_days' not in columns:
            print("  ✓ Adding retention_days column...")
            cursor.execute("""
                ALTER TABLE users ADD COLUMN retention_days INTEGER DEFAULT 30
            """)
        else:
            print("  • retention_days already exists")
        
        if 'auto_archive_after_days' not in columns:
            print("  ✓ Adding auto_archive_after_days column...")
            cursor.execute("""
                ALTER TABLE users ADD COLUMN auto_archive_after_days INTEGER DEFAULT 14
            """)
        else:
            print("  • auto_archive_after_days already exists")
        
        conn.commit()
        conn.close()
        
        print("\n✅ Backup settings migration completed successfully!")
        print("\nNew columns added:")
        print("  • backup_interval_minutes (default: 10 minutes)")
        print("  • retention_days (default: 30 days)")
        print("  • auto_archive_after_days (default: 14 days)")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
