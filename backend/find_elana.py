import sqlite3

conn = sqlite3.connect('drive_alive.db')
cursor = conn.cursor()

# Search for Elana by first name or last name
cursor.execute("""
    SELECT id, first_name, last_name, email, role 
    FROM users 
    WHERE first_name LIKE '%lana%' OR last_name LIKE '%eventer%'
""")

results = cursor.fetchall()
print(f"Search results: {len(results)} user(s) found\n")

for row in results:
    user_id, first_name, last_name, email, role = row
    print(f"ID: {user_id}")
    print(f"  Name: {first_name} {last_name}")
    print(f"  Email: {email}")
    print(f"  Role: {role}")
    
    # Check instructor profile
    cursor.execute("SELECT id, booking_fee FROM instructors WHERE user_id = ?", (user_id,))
    instructor = cursor.fetchone()
    if instructor:
        print(f"  ✅ Instructor Profile: ID {instructor[0]}, Fee: R{instructor[1]}")
    else:
        print(f"  ❌ No Instructor Profile")
    print()

# Show all instructors
print("\nAll users with instructor role:")
cursor.execute("""
    SELECT u.id, u.first_name, u.last_name, u.email, i.id as instructor_id
    FROM users u
    LEFT JOIN instructors i ON u.id = i.user_id
    WHERE u.role = 'instructor'
""")

for row in cursor.fetchall():
    user_id, first_name, last_name, email, instructor_id = row
    print(f"  {first_name} {last_name} ({email}) - Instructor ID: {instructor_id}")

conn.close()
