"""
Migration: Add active_session_token column to users table

This column enables single-session enforcement — only one login per user at a time.
Run this script once after updating to the version that includes single-session support.

Usage:
    cd backend
    python migrations/add_session_token.py
"""

import sys
from pathlib import Path

# Make sure 'backend/' is on the path so we can import app modules
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import inspect, text
from app.database import engine


def migrate():
    """Add active_session_token column to users table (idempotent)."""
    inspector = inspect(engine)
    existing_columns = [col["name"] for col in inspector.get_columns("users")]

    if "active_session_token" in existing_columns:
        print("✅ active_session_token column already exists — nothing to do.")
        return

    print("Adding active_session_token column to users table...")
    with engine.connect() as conn:
        conn.execute(
            text("ALTER TABLE users ADD COLUMN active_session_token VARCHAR")
        )
        conn.commit()

    print("✅ active_session_token column added successfully!")


if __name__ == "__main__":
    migrate()
