"""
Migration: Add instructor_verification_tokens table

This migration creates the instructor_verification_tokens table for handling
instructor verification via email/WhatsApp links sent to admins.

Run with: python migrations/add_instructor_verification_tokens.py
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, create_engine
from sqlalchemy.orm import Session
from app.database import Base, engine, SessionLocal
from app.models.instructor_verification import InstructorVerificationToken


def run_migration():
    """Create instructor_verification_tokens table"""
    print("🔄 Starting migration: Add instructor_verification_tokens table...")
    
    try:
        # Create all tables (only missing ones will be created)
        Base.metadata.create_all(bind=engine)
        print("✅ Migration completed successfully!")
        print("   - instructor_verification_tokens table created")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        raise


if __name__ == "__main__":
    run_migration()
