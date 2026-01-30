"""
Clear all users from database to reset to fresh state
"""

import sqlite3
import os


def clear_database():
    """Clear all data from the database"""
    print("\n" + "=" * 80)
    print("  DATABASE RESET - CLEAR ALL USERS")
    print("=" * 80 + "\n")

    # Find database file
    db_path = "drive_alive.db"
    if not os.path.exists(db_path):
        print(f"❌ Database file not found: {db_path}")
        print("   Current directory:", os.getcwd())
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Count users before
        cursor.execute("SELECT COUNT(*) FROM users")
        count_before = cursor.fetchone()[0]

        print(f"Users before: {count_before}")

        if count_before == 0:
            print("✅ Database already empty\n")
            conn.close()
            return

        # Ask for confirmation
        print("\n⚠️  This will delete ALL users from the database!")
        response = input("Are you sure? Type 'yes' to confirm: ")

        if response.lower() != 'yes':
            print("❌ Operation cancelled\n")
            conn.close()
            return

        # Delete all verification tokens first (foreign key constraint)
        cursor.execute("DELETE FROM verification_tokens")
        tokens_deleted = cursor.rowcount
        print(f"✅ Deleted {tokens_deleted} verification tokens")

        # Delete all reviews
        try:
            cursor.execute("DELETE FROM reviews")
            reviews_deleted = cursor.rowcount
            print(f"✅ Deleted {reviews_deleted} reviews")
        except sqlite3.OperationalError:
            print("⚠️  Reviews table doesn't exist (skipping)")

        # Delete all bookings
        try:
            cursor.execute("DELETE FROM bookings")
            bookings_deleted = cursor.rowcount
            print(f"✅ Deleted {bookings_deleted} bookings")
        except sqlite3.OperationalError:
            print("⚠️  Bookings table doesn't exist (skipping)")

        # Delete all availability
        try:
            cursor.execute("DELETE FROM instructor_availability")
            avail_deleted = cursor.rowcount
            print(f"✅ Deleted {avail_deleted} availability records")
        except sqlite3.OperationalError:
            print("⚠️  Availability table doesn't exist (skipping)")

        # Delete all students
        try:
            cursor.execute("DELETE FROM students")
            students_deleted = cursor.rowcount
            print(f"✅ Deleted {students_deleted} students")
        except sqlite3.OperationalError:
            print("⚠️  Students table doesn't exist (skipping)")

        # Delete all instructors
        try:
            cursor.execute("DELETE FROM instructors")
            instructors_deleted = cursor.rowcount
            print(f"✅ Deleted {instructors_deleted} instructors")
        except sqlite3.OperationalError:
            print("⚠️  Instructors table doesn't exist (skipping)")

        # Delete all users
        cursor.execute("DELETE FROM users")
        users_deleted = cursor.rowcount
        print(f"✅ Deleted {users_deleted} users")

        # Commit changes
        conn.commit()

        # Verify
        cursor.execute("SELECT COUNT(*) FROM users")
        count_after = cursor.fetchone()[0]

        print(f"\nUsers after: {count_after}")

        if count_after == 0:
            print("\n✅ DATABASE SUCCESSFULLY CLEARED!\n")
            print("Next steps:")
            print("  1. Restart backend (if running)")
            print("  2. Refresh frontend")
            print("  3. SetupScreen should appear")
            print("  4. Create admin account\n")
        else:
            print("\n❌ Some users remain (unexpected)\n")

        conn.close()

    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {str(e)}\n")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    clear_database()
