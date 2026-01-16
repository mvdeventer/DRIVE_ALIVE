"""
Remove unique constraint from phone column in users table
"""

from sqlalchemy import create_engine, text

from app.config import settings

# Create engine
engine = create_engine(settings.DATABASE_URL)

print("Removing unique constraint from phone column...")

try:
    with engine.connect() as conn:
        # Start a transaction
        trans = conn.begin()

        try:
            # Drop the unique constraint on phone column
            # SQLite doesn't support ALTER TABLE DROP CONSTRAINT directly,
            # so we need to recreate the table

            # Check if we're using SQLite
            if "sqlite" in str(conn.dialect.name):
                print(
                    "SQLite detected - recreating table without phone unique constraint..."
                )

                # Create a new table without the unique constraint
                conn.execute(
                    text(
                        """
                    CREATE TABLE users_new (
                        id INTEGER PRIMARY KEY,
                        email VARCHAR UNIQUE NOT NULL,
                        phone VARCHAR NOT NULL,
                        password_hash VARCHAR NOT NULL,
                        first_name VARCHAR NOT NULL,
                        last_name VARCHAR NOT NULL,
                        role VARCHAR NOT NULL,
                        status VARCHAR DEFAULT 'active',
                        firebase_uid VARCHAR UNIQUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP,
                        last_login TIMESTAMP
                    )
                """
                    )
                )

                # Copy data from old table
                conn.execute(
                    text(
                        """
                    INSERT INTO users_new (id, email, phone, password_hash, first_name, last_name,
                                          role, status, firebase_uid, created_at, updated_at, last_login)
                    SELECT id, email, phone, password_hash, first_name, last_name,
                           role, status, firebase_uid, created_at, updated_at, last_login
                    FROM users
                """
                    )
                )

                # Drop old table
                conn.execute(text("DROP TABLE users"))

                # Rename new table
                conn.execute(text("ALTER TABLE users_new RENAME TO users"))

                # Recreate indexes
                conn.execute(
                    text("CREATE UNIQUE INDEX ix_users_email ON users (email)")
                )
                conn.execute(text("CREATE INDEX ix_users_phone ON users (phone)"))
                conn.execute(
                    text(
                        "CREATE UNIQUE INDEX ix_users_firebase_uid ON users (firebase_uid)"
                    )
                )
                conn.execute(text("CREATE INDEX ix_users_id ON users (id)"))

            else:
                # For PostgreSQL/MySQL
                print("PostgreSQL/MySQL detected - dropping unique constraint...")
                conn.execute(
                    text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key")
                )
                conn.execute(
                    text("ALTER TABLE users DROP INDEX IF EXISTS ix_users_phone")
                )
                conn.execute(text("CREATE INDEX ix_users_phone ON users (phone)"))

            trans.commit()
            print("✅ Successfully removed unique constraint from phone column")

        except Exception as e:
            trans.rollback()
            print(f"❌ Error: {e}")
            raise

except Exception as e:
    print(f"❌ Failed to remove unique constraint: {e}")
    print(
        "\nNote: If using SQLite, you may need to clear the database and recreate it."
    )
    print("Run: python clear_database.py")
