"""
Database migration script to add payment_sessions table
Run this script to update the database schema
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text

from app.config import settings
from app.database import Base
from app.models.payment_session import PaymentSession


def migrate():
    """Add payment_sessions table to database"""
    engine = create_engine(settings.DATABASE_URL)

    # Create payment_sessions table
    PaymentSession.__table__.create(engine, checkfirst=True)

    print("✅ Migration complete: payment_sessions table created")


if __name__ == "__main__":
    migrate()
