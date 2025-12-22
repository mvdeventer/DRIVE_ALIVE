"""
Check if availability tables exist in the database
"""

import sys
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import inspect, text

from app.database import engine


def check_tables():
    """Check if all availability tables exist"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    print("\n" + "=" * 70)
    print("DATABASE TABLES CHECK")
    print("=" * 70)

    print(f"\nTotal tables in database: {len(tables)}")
    print("\nAll tables:")
    for table in sorted(tables):
        print(f"  ✓ {table}")

    # Check for availability tables
    required_tables = ["instructor_schedules", "time_off_exceptions", "custom_availability"]

    print("\n" + "=" * 70)
    print("AVAILABILITY TABLES CHECK")
    print("=" * 70)

    all_exist = True
    for table in required_tables:
        if table in tables:
            print(f"  ✅ {table} - EXISTS")

            # Show columns
            columns = inspector.get_columns(table)
            print(f"     Columns ({len(columns)}):")
            for col in columns:
                print(f"       - {col['name']}: {col['type']}")
        else:
            print(f"  ❌ {table} - MISSING")
            all_exist = False

    print("\n" + "=" * 70)
    if all_exist:
        print("✅ All availability tables are present and ready!")
    else:
        print("❌ Some tables are missing. Run the migration:")
        print("   python backend/migrations/add_availability_tables.py")
    print("=" * 70 + "\n")

    # Check existing data
    print("\n" + "=" * 70)
    print("DATA CHECK")
    print("=" * 70)

    with engine.connect() as conn:
        for table in required_tables:
            if table in tables:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                print(f"  {table}: {count} records")

    print("=" * 70 + "\n")


if __name__ == "__main__":
    check_tables()
