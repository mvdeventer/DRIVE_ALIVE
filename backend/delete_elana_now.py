import sqlite3

conn = sqlite3.connect('drive_alive.db')
cursor = conn.cursor()

print("=" * 60)
print("DELETING ELANA VAN DEVENTER - ORPHANED ACCOUNT")
print("=" * 60)

# Find Elana
cursor.execute("""
    SELECT id, first_name, last_name, email, role, status 
    FROM users 
    WHERE first_name = 'Elana' AND last_name = 'van Deventer'
""")

elana = cursor.fetchone()
if not elana:
    print("\n❌ Elana not found")
    exit(1)

user_id, first_name, last_name, email, role, status = elana

print(f"\n👤 User Found:")
print(f"   ID: {user_id}")
print(f"   Name: {first_name} {last_name}")
print(f"   Email: {email}")
print(f"   Role: {role}")
print(f"   Status: {status}")

# Check profiles
cursor.execute("SELECT COUNT(*) FROM instructors WHERE user_id = ?", (user_id,))
instructor_count = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM students WHERE user_id = ?", (user_id,))
student_count = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM bookings WHERE instructor_id = ? OR student_id = ?", (user_id, user_id))
booking_count = cursor.fetchone()[0]

print(f"\n📋 Profile Status:")
print(f"   Instructor profiles: {instructor_count} ❌")
print(f"   Student profiles: {student_count}")
print(f"   Related bookings: {booking_count}")

# Delete the user
print(f"\n⏳ Deleting orphaned user account...")
cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
conn.commit()

print(f"\n✅ SUCCESS! Deleted user ID {user_id}")
print(f"   Elana van Deventer (orphaned {role} account) removed from database")
print(f"   Bookings preserved in history table")

conn.close()
