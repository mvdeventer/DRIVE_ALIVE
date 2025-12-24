"""
Check Gary van Deventer's schedule in the database
"""

import sqlite3

db_path = r"C:\Projects\DRIVE_ALIVE\backend\drive_alive.db"

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Find Gary
    cursor.execute(
        """
        SELECT id, first_name, last_name, email, role
        FROM users
        WHERE first_name LIKE '%gary%' AND last_name LIKE '%deventer%'
    """
    )

    user = cursor.fetchone()

    if not user:
        print("❌ Gary van Deventer not found")
        conn.close()
        exit()

    user_id, first_name, last_name, email, role = user
    print(f"✅ Found user: {first_name} {last_name}")
    print(f"   User ID: {user_id}")
    print(f"   Email: {email}")
    print(f"   Role: {role}")

    # Find instructor record
    cursor.execute("SELECT id, is_verified FROM instructors WHERE user_id = ?", (user_id,))
    instructor = cursor.fetchone()

    if not instructor:
        print("\n❌ No instructor record found")
        conn.close()
        exit()

    instructor_id, is_verified = instructor
    print(f"\n✅ Found instructor record")
    print(f"   Instructor ID: {instructor_id}")
    print(f"   Verified: {is_verified}")

    # Find schedule records
    cursor.execute(
        """
        SELECT id, day_of_week, start_time, end_time, is_active
        FROM instructor_schedules
        WHERE instructor_id = ?
    """,
        (instructor_id,),
    )

    schedules = cursor.fetchall()

    print(f"\n📅 Weekly Schedule Records: {len(schedules)}")

    if schedules:
        for schedule in schedules:
            sched_id, day, start, end, active = schedule
            print(f"\n   Schedule ID: {sched_id}")
            print(f"   Day: {day}")
            print(f"   Start: {start}")
            print(f"   End: {end}")
            print(f"   Active: {active}")
    else:
        print("   ❌ No schedule records found in database")
        print("   This means the schedule was never saved to the database.")

    conn.close()

except Exception as e:
    print(f"Error: {e}")
