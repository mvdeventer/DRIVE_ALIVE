"""
Run password reset migration
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import Base, engine
from app.models.password_reset import PasswordResetToken
from app.models.user import User


def run_migration():
    """Create password_reset_tokens table"""
    print("🔄 Creating password_reset_tokens table...")

    try:
        # Create all tables (will only create missing ones)
        Base.metadata.create_all(bind=engine)
        print("✅ Migration completed successfully!")
        print("📋 Table: password_reset_tokens")
        print("   - id (primary key)")
        print("   - user_id (foreign key)")
        print("   - token (unique)")
        print("   - expires_at")
        print("   - created_at")
        print("   - used_at")
        return True
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
