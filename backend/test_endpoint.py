"""Test the instructors endpoint directly"""

import sys
import traceback

from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.routes.instructors import get_instructors


def test_instructors_endpoint():
    db = SessionLocal()
    try:
        print("Testing get_instructors endpoint...")
        # Call the endpoint function directly
        import asyncio

        result = asyncio.run(get_instructors(latitude=None, longitude=None, max_distance_km=None, min_rating=None, available_only=False, db=db))
        print(f"Success! Found {len(result)} instructors")
        if result:
            print(f"First instructor: {result[0].first_name} {result[0].last_name} from {result[0].city}")
    except Exception as e:
        print(f"ERROR: {e}")
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_instructors_endpoint()
