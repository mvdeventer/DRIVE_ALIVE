#!/usr/bin/env python3
"""Populate instructor locations with default South African data"""

from app.database import SessionLocal
from app.models.user import Instructor

def main():
    db = SessionLocal()
    try:
        instructors = db.query(Instructor).all()
        
        # Default SA locations for testing
        locations = [
            {"city": "Cape Town", "suburb": "Bellville", "province": "Western Cape", "lat": -33.8953, "long": 18.6336},
            {"city": "Cape Town", "suburb": "Goodwood", "province": "Western Cape", "lat": -33.8945, "long": 18.6494},
            {"city": "Cape Town", "suburb": "Tyger Valley", "province": "Western Cape", "lat": -33.9249, "long": 18.4241},
        ]
        
        for i, instructor in enumerate(instructors):
            loc = locations[i % len(locations)]
            instructor.city = loc["city"]
            instructor.suburb = loc["suburb"]
            instructor.province = loc["province"]
            instructor.current_latitude = loc["lat"]
            instructor.current_longitude = loc["long"]
            print(f"Updated instructor {instructor.id}: {instructor.suburb}, {instructor.city}")
        
        db.commit()
        print(f"\n✅ Updated {len(instructors)} instructors with locations")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
