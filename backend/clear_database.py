"""Drop every table and recreate the schema.

Importing ``app.models`` is **required**, not incidental: ``Base.metadata`` is
populated as a side effect of the model modules being imported. Without it the
metadata is empty, ``drop_all``/``create_all`` iterate over nothing, and this
script reports success while changing absolutely nothing.

Tables are dropped in dependency order by SQLAlchemy, which needs every model
present — ``company_platform_charges`` holds a foreign key to ``bookings``, so
dropping with a partial metadata fails on the dangling constraint.
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine

# Populates Base.metadata. Do not remove — see the module docstring.
import app.models  # noqa: F401,E402


def clear_database():
    """Drop all tables and recreate them"""
    print("=" * 80)
    print("Clearing Database")
    print("=" * 80)

    table_count = len(Base.metadata.tables)
    if table_count == 0:
        raise SystemExit(
            "Refusing to run: Base.metadata is empty, so nothing would be dropped. "
            "The model modules failed to import."
        )
    print(f"Tables known to metadata: {table_count}")

    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("[OK] All tables dropped successfully!")

    print("\nRecreating all tables...")
    Base.metadata.create_all(bind=engine)
    print("[OK] All tables recreated successfully!")

    print("\n" + "=" * 80)
    print("Database cleared and ready for use!")
    print("=" * 80)


if __name__ == "__main__":
    clear_database()
