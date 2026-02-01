#!/usr/bin/env python3
"""
Direct SQL deletion of Elana's instructor profile
"""

import sqlite3
import os

# Database path
db_path = os.path.join(os.path.dirname(__file__), 'drive_alive.db')

if not os.path.exists(db_path):
    print(f"❌ Database not found at {db_path}")
    print("\nSearching for database file...")
    for root, dirs, files in os.walk(os.path.dirname(__file__)):
        for file in files:
            if file.endswith('.db'):
                print(f"  Found: {os.path.join(root, file)}")
    exit(1)

print(f"📂 Using database: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Find Elana in users table
    cursor.execute("""
        SELECT id, full_name, email, role FROM users 
        WHERE full_name LIKE '%Elana%' AND full_name LIKE '%van Deventer%'
    """)
    
    user = cursor.fetchone()
    if not user:
        print("❌ Elana van Deventer not found in database")
        conn.close()
        exit(1)
    
    user_id, full_name, email, role = user
    print(f"✅ Found user: {full_name}")
    print(f"   Email: {email}")
    print(f"   Role: {role}")
    print(f"   User ID: {user_id}")
    
    # Find instructor profile
    cursor.execute("SELECT id FROM instructors WHERE user_id = ?", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor:
        print("❌ No instructor profile found for Elana")
        conn.close()
        exit(1)
    
    instructor_id = instructor[0]
    print(f"✅ Found instructor profile (ID: {instructor_id})")
    
    # Delete instructor profile
    cursor.execute("DELETE FROM instructors WHERE user_id = ?", (user_id,))
    conn.commit()
    
    print(f"\n✅ Deleted instructor profile!")
    print(f"   Rows affected: {cursor.rowcount}")
    
    # Check if user still has other profiles
    cursor.execute("SELECT COUNT(*) FROM students WHERE user_id = ?", (user_id,))
    student_count = cursor.fetchone()[0]
    
    print(f"\n📊 Profile status:")
    print(f"   Student profiles: {student_count}")
    print(f"   Instructor profiles: 0 (just deleted)")
    
    if student_count == 0 and role != 'admin':
        print(f"\n💡 User has no remaining profiles and is not admin")
        print(f"   The user account will be auto-deleted by the backend when accessed")
    
    conn.close()
    print(f"\n✅ Success! Elana's instructor profile has been deleted from the database.")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
    exit(1)
