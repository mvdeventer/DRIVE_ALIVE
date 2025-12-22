"""Test the availability slots endpoint"""

from datetime import date

from app.database import get_db
from app.routes.availability import get_available_slots_for_date

db = next(get_db())

try:
    target_date = date(2025, 12, 22)
    duration = 60
    instructor_id = 1

    print(f"Testing slots for instructor {instructor_id} on {target_date}")
    slots = get_available_slots_for_date(instructor_id, target_date, duration, db)
    print(f"Found {len(slots)} slots")
    for slot in slots[:5]:  # Show first 5
        print(f"  {slot.start_time} - {slot.end_time}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback

    traceback.print_exc()
