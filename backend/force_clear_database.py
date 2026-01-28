"""
Complete database wipe - removes database file and recreates from scratch
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text, inspect
from app.database import engine, Base, SessionLocal


def force_clear_database():
    """
    Forcefully clear all data from database
    """
    print("\n" + "="*80)
    print("FORCE CLEARING DATABASE")
    print("="*80 + "\n")

    db = SessionLocal()
    try:
        # Get all table names
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        print(f"Found {len(tables)} tables to clear:")
        for table in tables:
            print(f"  - {table}")
        
        print("\nDeleting all records from each table...\n")
        
        # Delete from each table
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                for table in tables:
                    print(f"  Clearing {table}...")
                    conn.execute(text(f"DELETE FROM {table}"))
                trans.commit()
                print("\n✅ All records deleted successfully!")
            except Exception as e:
                trans.rollback()
                print(f"\n❌ Error during deletion: {e}")
                raise
    finally:
        db.close()


if __name__ == "__main__":
    force_clear_database()
