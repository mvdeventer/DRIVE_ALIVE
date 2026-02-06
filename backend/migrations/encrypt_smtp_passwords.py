"""
Migration: Encrypt existing SMTP passwords in database
Run this once to migrate from plain text to encrypted passwords

Usage:
    cd backend
    python migrations/encrypt_smtp_passwords.py
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.utils.encryption import EncryptionService


def encrypt_smtp_passwords():
    """
    Encrypt all plain text SMTP passwords in the database
    """
    db: Session = SessionLocal()
    
    try:
        print("🔐 Starting SMTP password encryption migration...")
        
        # Get all users with SMTP passwords
        users_with_smtp = db.query(User).filter(User.smtp_password.isnot(None)).all()
        
        if not users_with_smtp:
            print("✅ No SMTP passwords found in database")
            return
        
        print(f"📧 Found {len(users_with_smtp)} users with SMTP passwords")
        
        encrypted_count = 0
        skipped_count = 0
        
        for user in users_with_smtp:
            current_password = user.smtp_password
            
            # Skip if already encrypted
            if EncryptionService.is_encrypted(current_password):
                print(f"⏭️  User {user.email}: Already encrypted, skipping")
                skipped_count += 1
                continue
            
            # Encrypt the password
            try:
                encrypted = EncryptionService.encrypt(current_password)
                user.smtp_password = encrypted
                encrypted_count += 1
                print(f"🔒 User {user.email}: Encrypted SMTP password")
            except Exception as e:
                print(f"❌ User {user.email}: Encryption failed - {str(e)}")
                continue
        
        # Commit all changes
        if encrypted_count > 0:
            db.commit()
            print(f"\n✅ Migration complete!")
            print(f"   - Encrypted: {encrypted_count} passwords")
            print(f"   - Skipped: {skipped_count} passwords (already encrypted)")
        else:
            print(f"\n ℹ️  No changes needed - all passwords already encrypted")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("SMTP Password Encryption Migration")
    print("=" * 60)
    print()
    
    # Check for encryption key
    import os
    if not os.getenv("ENCRYPTION_KEY"):
        print("\n⚠️  WARNING: ENCRYPTION_KEY environment variable not set!")
        print("   Using default development key.")
        print("   For production, set ENCRYPTION_KEY in .env file.")
        print()
        response = input("Continue with default key? (yes/no): ")
        if response.lower() != "yes":
            print("❌ Migration cancelled")
            sys.exit(0)
    
    print()
    encrypt_smtp_passwords()
    print()
    print("=" * 60)
