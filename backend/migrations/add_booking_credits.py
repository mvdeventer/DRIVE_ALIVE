"""
Migration: Add booking_credits table and cancellation policy fields

This migration creates the booking_credits table for tracking 50% credits
when bookings are cancelled/rescheduled 24+ hours before the lesson.

It also adds a new_booking_id field to bookings to enforce the policy
that a student must make a new booking before cancelling an existing one.
"""

import logging
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum, inspect

logger = logging.getLogger(__name__)


def run_migration(db_session):
    """
    Run booking credits migration
    """
    engine = db_session.get_bind()
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    # Create booking_credits table
    if "booking_credits" not in existing_tables:
        logger.info("Creating booking_credits table...")
        from sqlalchemy import MetaData, Table

        metadata = MetaData()

        booking_credits = Table(
            "booking_credits",
            metadata,
            Column("id", Integer, primary_key=True, index=True),
            Column("student_id", Integer, ForeignKey("students.id"), nullable=False),
            Column("original_booking_id", Integer, ForeignKey("bookings.id"), nullable=False),
            Column("applied_booking_id", Integer, ForeignKey("bookings.id"), nullable=True),
            Column("credit_amount", Float, nullable=False),
            Column("original_amount", Float, nullable=False),
            Column(
                "status",
                SQLEnum("available", "applied", "expired", name="creditstatus"),
                default="available",
            ),
            Column("reason", String, nullable=False),
            Column("notes", Text, nullable=True),
            Column("created_at", DateTime(timezone=True), server_default="now()"),
            Column("applied_at", DateTime(timezone=True), nullable=True),
        )

        booking_credits.create(engine, checkfirst=True)
        logger.info("✅ booking_credits table created")
    else:
        logger.info("booking_credits table already exists, skipping")

    # Add new_booking_id column to bookings table (links cancellation to new booking)
    if "bookings" in existing_tables:
        existing_columns = [col["name"] for col in inspector.get_columns("bookings")]

        if "replacement_booking_id" not in existing_columns:
            logger.info("Adding replacement_booking_id column to bookings...")
            db_session.execute(
                "ALTER TABLE bookings ADD COLUMN replacement_booking_id INTEGER REFERENCES bookings(id)"
            )
            db_session.commit()
            logger.info("✅ replacement_booking_id column added to bookings")
        else:
            logger.info("replacement_booking_id column already exists, skipping")

        if "credit_applied_amount" not in existing_columns:
            logger.info("Adding credit_applied_amount column to bookings...")
            db_session.execute(
                "ALTER TABLE bookings ADD COLUMN credit_applied_amount FLOAT DEFAULT 0.0"
            )
            db_session.commit()
            logger.info("✅ credit_applied_amount column added to bookings")
        else:
            logger.info("credit_applied_amount column already exists, skipping")

    logger.info("✅ Booking credits migration complete")


if __name__ == "__main__":
    from ..database import SessionLocal

    db = SessionLocal()
    try:
        run_migration(db)
    finally:
        db.close()
