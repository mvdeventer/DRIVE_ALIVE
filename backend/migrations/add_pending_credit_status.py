"""
Migration: Add 'pending' value to creditstatus enum

Credits from cancellations start as PENDING and only become
AVAILABLE/APPLIED when the student makes and pays for a new booking.
This ensures the 24h policy credit is calculated immediately but
only processed on the next payment.
"""

import logging

logger = logging.getLogger(__name__)


def run_migration(db_session):
    """
    Add 'pending' to the creditstatus enum type in PostgreSQL.
    For SQLite (dev), enum values are stored as strings so no migration needed.
    """
    engine = db_session.get_bind()
    dialect = engine.dialect.name

    if dialect == "postgresql":
        from sqlalchemy import text

        try:
            # Check if 'pending' already exists in the enum
            result = db_session.execute(
                text(
                    "SELECT enumlabel FROM pg_enum "
                    "WHERE enumtypid = 'creditstatus'::regtype"
                )
            )
            existing_values = [row[0] for row in result]

            if "pending" not in existing_values:
                logger.info("Adding 'pending' to creditstatus enum...")
                db_session.execute(
                    text("ALTER TYPE creditstatus ADD VALUE 'pending'")
                )
                db_session.commit()
                logger.info("✅ Added 'pending' to creditstatus enum")
            else:
                logger.info("'pending' already exists in creditstatus enum")

        except Exception as e:
            logger.error(f"Error adding pending status: {e}")
            db_session.rollback()
            raise
    else:
        # SQLite stores enum as string — no schema change needed
        logger.info(
            f"Dialect '{dialect}' stores enums as strings — no migration needed"
        )


if __name__ == "__main__":
    import sys
    import os

    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

    from app.database import SessionLocal

    db = SessionLocal()
    try:
        run_migration(db)
    finally:
        db.close()
