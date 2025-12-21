"""Helper script to check database users"""

import sys

from app.database import SessionLocal
from app.models.user import User

try:
    db = SessionLocal()
    users = db.query(User).all()
    user_count = len(users)
    user_list = [(u.email, u.role.value) for u in users]
    db.close()

    # Print after closing database to avoid keeping connection open
    print(f"  - Users found: {user_count}")
    for email, role in user_list:
        print(f"    * {email} ({role})")
except Exception as e:
    print(f"  - Error querying database: {e}")
    sys.exit(1)
