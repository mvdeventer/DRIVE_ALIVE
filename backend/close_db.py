"""Close all database connections and checkpoint WAL"""

import os
import sqlite3

db_path = "drive_alive.db"

try:
    if os.path.exists(db_path):
        # Open connection and close WAL properly
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        conn.close()
        print("  - Database connections closed")
    else:
        print("  - No database file found")
except Exception as e:
    print(f"  - Error closing database: {e}")
