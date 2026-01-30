"""
Database migration: Add email verification system

This migration adds:
1. smtp_email, smtp_password, verification_link_validity_minutes to users table
2. verification_tokens table for email/phone verification
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create engine
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def migrate():
    """Run migration"""
    print("Starting email verification system migration...")

    with engine.connect() as conn:
        # Check current users table schema
        result = conn.execute(text("PRAGMA table_info(users)"))
        columns = [row[1] for row in result.fetchall()]
        print(f"Current users table columns: {columns}")

        # Add SMTP configuration columns to users table if not exist
        if "smtp_email" not in columns:
            print("Adding smtp_email column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN smtp_email VARCHAR"))
            conn.commit()
            print("✓ smtp_email column added")

        if "smtp_password" not in columns:
            print("Adding smtp_password column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN smtp_password VARCHAR"))
            conn.commit()
            print("✓ smtp_password column added")

        if "verification_link_validity_minutes" not in columns:
            print("Adding verification_link_validity_minutes column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN verification_link_validity_minutes INTEGER DEFAULT 30"))
            conn.commit()
            print("✓ verification_link_validity_minutes column added")

        # Check if verification_tokens table exists
        result = conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='verification_tokens'"
        ))
        table_exists = result.fetchone() is not None

        if not table_exists:
            print("Creating verification_tokens table...")
            conn.execute(text("""
                CREATE TABLE verification_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token VARCHAR NOT NULL UNIQUE,
                    token_type VARCHAR NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    verified_at TIMESTAMP,
                    is_used BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """))
            conn.commit()
            print("✓ verification_tokens table created")

            # Create indexes
            print("Creating indexes...")
            conn.execute(text("CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id)"))
            conn.execute(text("CREATE INDEX idx_verification_tokens_token ON verification_tokens(token)"))
            conn.commit()
            print("✓ Indexes created")
        else:
            print("✓ verification_tokens table already exists")

    print("\n✅ Migration completed successfully!")
    print("\nVerify migration:")
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(users)"))
        print("\n✓ Updated users table columns:")
        for row in result.fetchall():
            print(f"  - {row[1]} ({row[2]})")

        result = conn.execute(text("PRAGMA table_info(verification_tokens)"))
        print("\n✓ verification_tokens table columns:")
        for row in result.fetchall():
            print(f"  - {row[1]} ({row[2]})")


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        sys.exit(1)
