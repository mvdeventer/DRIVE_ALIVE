"""Clean up all non-admin users from the database"""
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.verification_token import VerificationToken
from sqlalchemy import text

db = SessionLocal()

# Show tables
tables = db.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
print(f"Tables: {[t[0] for t in tables]}")

# Show current users
users = db.query(User).all()
print(f"\nCurrent users ({len(users)}):")
for u in users:
    print(f"  id={u.id} email={u.email} role={u.role} status={u.status}")

# Get non-admin user IDs
non_admin_ids = [u.id for u in users if u.role != UserRole.ADMIN]
print(f"\nNon-admin IDs to delete: {non_admin_ids}")

if non_admin_ids:
    # Delete related records first
    for uid in non_admin_ids:
        db.query(VerificationToken).filter(VerificationToken.user_id == uid).delete()
    
    # Delete from students table
    db.execute(text(f"DELETE FROM students WHERE user_id IN ({','.join(str(i) for i in non_admin_ids)})"))
    
    # Delete from instructors table
    db.execute(text(f"DELETE FROM instructors WHERE user_id IN ({','.join(str(i) for i in non_admin_ids)})"))
    
    # Delete from bookings
    db.execute(text(f"DELETE FROM bookings WHERE student_id IN (SELECT id FROM students WHERE user_id IN ({','.join(str(i) for i in non_admin_ids)})) OR instructor_id IN (SELECT id FROM instructors WHERE user_id IN ({','.join(str(i) for i in non_admin_ids)}))"))
    
    # Delete non-admin users
    db.query(User).filter(User.role != UserRole.ADMIN).delete()
    
    # Also clean up old admin verification tokens
    admin_ids = [u.id for u in users if u.role == UserRole.ADMIN]
    for aid in admin_ids:
        db.query(VerificationToken).filter(VerificationToken.user_id == aid).delete()
    
    db.commit()
    print("\nCleanup complete!")
else:
    # Still clean up old admin tokens
    admin_ids = [u.id for u in users if u.role == UserRole.ADMIN]
    for aid in admin_ids:
        db.query(VerificationToken).filter(VerificationToken.user_id == aid).delete()
    db.commit()
    print("\nNo non-admin users to delete. Cleaned up old admin tokens.")

# Verify
remaining = db.query(User).all()
tokens = db.query(VerificationToken).all()
print(f"\nRemaining users ({len(remaining)}):")
for u in remaining:
    print(f"  id={u.id} email={u.email} role={u.role} status={u.status}")
print(f"Remaining tokens: {len(tokens)}")

db.close()
