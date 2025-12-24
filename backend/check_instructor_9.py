import sqlite3

db_path = r"C:\Projects\DRIVE_ALIVE\backend\drive_alive.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("\n" + "=" * 60)
print("🔍 CHECKING INSTRUCTOR ID 9")
print("=" * 60)

# Check which user has instructor_id 9
cursor.execute(
    """
    SELECT u.id as user_id, u.first_name, u.last_name, u.email, i.id as instructor_id
    FROM users u
    JOIN instructors i ON u.id = i.user_id
    WHERE i.id = 9
"""
)
instructor = cursor.fetchone()

if instructor:
    print(f"\n✅ Found instructor with ID 9:")
    print(f"   User ID: {instructor[0]}")
    print(f"   Name: {instructor[1]} {instructor[2]}")
    print(f"   Email: {instructor[3]}")
    print(f"   Instructor ID: {instructor[4]}")
else:
    print("\n❌ No instructor found with ID 9")

# Check schedule for instructor_id 9
print(f"\n📅 Schedule for instructor_id 9:")
cursor.execute(
    """
    SELECT id, day_of_week, start_time, end_time, is_active
    FROM instructor_schedules
    WHERE instructor_id = 9
    ORDER BY
        CASE day_of_week
            WHEN 'monday' THEN 1
            WHEN 'tuesday' THEN 2
            WHEN 'wednesday' THEN 3
            WHEN 'thursday' THEN 4
            WHEN 'friday' THEN 5
            WHEN 'saturday' THEN 6
            WHEN 'sunday' THEN 7
        END
"""
)
schedules = cursor.fetchall()

if schedules:
    print(f"   Found {len(schedules)} schedule records:")
    for schedule in schedules:
        status = "Active" if schedule[4] else "Inactive"
        print(f"   - {schedule[1]}: {schedule[2]} - {schedule[3]} ({status})")
else:
    print("   No schedule records found")

# Also check Gary specifically
print(f"\n" + "=" * 60)
print("🔍 CHECKING GARY VAN DEVENTER")
print("=" * 60)

cursor.execute(
    """
    SELECT u.id as user_id, u.first_name, u.last_name, u.email, i.id as instructor_id
    FROM users u
    JOIN instructors i ON u.id = i.user_id
    WHERE u.email LIKE '%mvdeventer%'
"""
)
gary = cursor.fetchone()

if gary:
    print(f"\n✅ Found Gary:")
    print(f"   User ID: {gary[0]}")
    print(f"   Name: {gary[1]} {gary[2]}")
    print(f"   Email: {gary[3]}")
    print(f"   Instructor ID: {gary[4]}")

    # Check Gary's schedule
    print(f"\n📅 Gary's schedule (instructor_id {gary[3]}):")
    cursor.execute(
        """
        SELECT id, day_of_week, start_time, end_time, is_active
        FROM instructor_schedules
        WHERE instructor_id = ?
        ORDER BY
            CASE day_of_week
                WHEN 'monday' THEN 1
                WHEN 'tuesday' THEN 2
                WHEN 'wednesday' THEN 3
                WHEN 'thursday' THEN 4
                WHEN 'friday' THEN 5
                WHEN 'saturday' THEN 6
                WHEN 'sunday' THEN 7
            END
    """,
        (gary[3],),
    )
    gary_schedules = cursor.fetchall()

    if gary_schedules:
        print(f"   Found {len(gary_schedules)} schedule records:")
        for schedule in gary_schedules:
            status = "Active" if schedule[4] else "Inactive"
            print(f"   - {schedule[1]}: {schedule[2]} - {schedule[3]} ({status})")
    else:
        print("   No schedule records found")
else:
    print("\n❌ Gary not found")

conn.close()
print("\n" + "=" * 60)
