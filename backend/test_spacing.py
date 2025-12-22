"""Test 15min spacing between 60min slots"""

from datetime import date, datetime, timedelta

from app.database import get_db
from app.routes.availability import get_available_slots_for_date

db = next(get_db())

try:
    target_date = date(2025, 12, 22)  # Sunday
    duration = 60
    instructor_id = 1

    print(f"\n{'='*70}")
    print(f"Testing 60min slots with 15min spacing for instructor {instructor_id}")
    print(f"Date: {target_date}")
    print(f"{'='*70}\n")

    slots = get_available_slots_for_date(instructor_id, target_date, duration, db)

    print(f"✅ Found {len(slots)} slots\n")

    if len(slots) > 0:
        print("Slot Schedule (showing time spacing):\n")

        for i, slot in enumerate(slots[:10], 1):  # Show first 10 slots
            start = datetime.fromisoformat(slot.start_time)
            end = datetime.fromisoformat(slot.end_time)

            # Calculate lesson duration
            lesson_duration = (end - start).total_seconds() / 60

            print(f"{i:2}. {start.strftime('%H:%M')} - {end.strftime('%H:%M')} ({int(lesson_duration)}min lesson)")

            # Show gap to next slot
            if i < len(slots) and i < 10:
                next_start = datetime.fromisoformat(slots[i].start_time)
                gap = (next_start - end).total_seconds() / 60
                if gap > 0:
                    print(f"    └─ {int(gap)}min gap until next slot\n")
                else:
                    print(f"    └─ No gap (slots overlap or back-to-back)\n")

        if len(slots) > 10:
            print(f"... and {len(slots) - 10} more slots")

        print(f"\n{'='*70}")
        print("✨ Expected pattern: 60min lesson + 15min gap = 75min between slot starts")
        print(f"{'='*70}\n")

except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback

    traceback.print_exc()
finally:
    db.close()
