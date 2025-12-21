"""
Clear database and recreate all tables
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine


def clear_database():
    """Drop all tables and recreate them"""
    print("=" * 80)
    print("Clearing Database")
    print("=" * 80)

    # Drop all tables
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("✅ All tables dropped successfully!")

    # Recreate all tables
    print("\nRecreating all tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables recreated successfully!")

    print("\n" + "=" * 80)
    print("Database cleared and ready for use!")
    print("=" * 80)


if __name__ == "__main__":
    clear_database()
