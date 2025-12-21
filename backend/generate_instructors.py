"""
Script to generate 100 diverse instructors for testing
Uses realistic South African data from various locations
"""

import random
import sys
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models.user import Instructor, User

# South African location data
LOCATIONS = [
    # Gauteng - Johannesburg
    {"city": "Johannesburg", "suburb": "Sandton", "province": "Gauteng"},
    {"city": "Johannesburg", "suburb": "Rosebank", "province": "Gauteng"},
    {"city": "Johannesburg", "suburb": "Fourways", "province": "Gauteng"},
    {"city": "Johannesburg", "suburb": "Randburg", "province": "Gauteng"},
    {"city": "Johannesburg", "suburb": "Bedfordview", "province": "Gauteng"},
    {"city": "Johannesburg", "suburb": "Midrand", "province": "Gauteng"},
    {"city": "Johannesburg", "suburb": "Soweto", "province": "Gauteng"},
    {"city": "Johannesburg", "suburb": "Roodepoort", "province": "Gauteng"},
    {"city": "Johannesburg", "suburb": "Melville", "province": "Gauteng"},
    {"city": "Johannesburg", "suburb": "Parktown", "province": "Gauteng"},
    # Gauteng - Pretoria
    {"city": "Pretoria", "suburb": "Centurion", "province": "Gauteng"},
    {"city": "Pretoria", "suburb": "Hatfield", "province": "Gauteng"},
    {"city": "Pretoria", "suburb": "Menlyn", "province": "Gauteng"},
    {"city": "Pretoria", "suburb": "Brooklyn", "province": "Gauteng"},
    {"city": "Pretoria", "suburb": "Waterkloof", "province": "Gauteng"},
    {"city": "Pretoria", "suburb": "Silverlakes", "province": "Gauteng"},
    {"city": "Pretoria", "suburb": "Montana", "province": "Gauteng"},
    # Western Cape - Cape Town
    {"city": "Cape Town", "suburb": "Sea Point", "province": "Western Cape"},
    {"city": "Cape Town", "suburb": "Camps Bay", "province": "Western Cape"},
    {"city": "Cape Town", "suburb": "Gardens", "province": "Western Cape"},
    {"city": "Cape Town", "suburb": "Claremont", "province": "Western Cape"},
    {"city": "Cape Town", "suburb": "Constantia", "province": "Western Cape"},
    {"city": "Cape Town", "suburb": "Bellville", "province": "Western Cape"},
    {"city": "Cape Town", "suburb": "Century City", "province": "Western Cape"},
    {"city": "Cape Town", "suburb": "Durbanville", "province": "Western Cape"},
    {"city": "Cape Town", "suburb": "Fish Hoek", "province": "Western Cape"},
    {"city": "Cape Town", "suburb": "Table View", "province": "Western Cape"},
    # Western Cape - Other Cities
    {"city": "Stellenbosch", "suburb": "Central Stellenbosch", "province": "Western Cape"},
    {"city": "Paarl", "suburb": "Paarl Central", "province": "Western Cape"},
    {"city": "Somerset West", "suburb": "Helderberg", "province": "Western Cape"},
    {"city": "George", "suburb": "Heatherlands", "province": "Western Cape"},
    # KwaZulu-Natal - Durban
    {"city": "Durban", "suburb": "Umhlanga", "province": "KwaZulu-Natal"},
    {"city": "Durban", "suburb": "Morningside", "province": "KwaZulu-Natal"},
    {"city": "Durban", "suburb": "Westville", "province": "KwaZulu-Natal"},
    {"city": "Durban", "suburb": "Durban North", "province": "KwaZulu-Natal"},
    {"city": "Durban", "suburb": "Glenwood", "province": "KwaZulu-Natal"},
    {"city": "Durban", "suburb": "Berea", "province": "KwaZulu-Natal"},
    # Eastern Cape
    {"city": "Port Elizabeth", "suburb": "Summerstrand", "province": "Eastern Cape"},
    {"city": "Port Elizabeth", "suburb": "Walmer", "province": "Eastern Cape"},
    {"city": "East London", "suburb": "Nahoon", "province": "Eastern Cape"},
    # Free State
    {"city": "Bloemfontein", "suburb": "Westdene", "province": "Free State"},
    {"city": "Bloemfontein", "suburb": "Langenhovenpark", "province": "Free State"},
]

# Vehicle makes and models
VEHICLES = [
    {"make": "Toyota", "model": "Corolla", "year": 2020},
    {"make": "Toyota", "model": "Yaris", "year": 2021},
    {"make": "Volkswagen", "model": "Polo", "year": 2019},
    {"make": "Volkswagen", "model": "Golf", "year": 2020},
    {"make": "Hyundai", "model": "i20", "year": 2021},
    {"make": "Ford", "model": "Figo", "year": 2020},
    {"make": "Nissan", "model": "Micra", "year": 2019},
    {"make": "Kia", "model": "Picanto", "year": 2021},
    {"make": "Renault", "model": "Sandero", "year": 2020},
    {"make": "Suzuki", "model": "Swift", "year": 2020},
    {"make": "Mazda", "model": "2", "year": 2019},
    {"make": "Honda", "model": "Ballade", "year": 2021},
]

# Common South African names
FIRST_NAMES = [
    "Thabo",
    "Sipho",
    "Mandla",
    "Zanele",
    "Nomsa",
    "Lerato",
    "Kagiso",
    "Palesa",
    "Johan",
    "Pieter",
    "Hendrik",
    "Anneke",
    "Elsa",
    "Marius",
    "Riaan",
    "Elmarie",
    "Rashid",
    "Fatima",
    "Ahmed",
    "Ayesha",
    "Yusuf",
    "Zainab",
    "David",
    "Sarah",
    "Michael",
    "Jessica",
    "John",
    "Emma",
    "William",
    "Olivia",
    "Bongani",
    "Nandi",
    "Sizwe",
    "Thandiwe",
    "Musa",
    "Lindiwe",
    "Jabulani",
    "Nokuthula",
    "Andre",
    "Marietjie",
    "Francois",
    "Lizelle",
    "Gerhard",
    "Annelize",
    "Werner",
    "Marinda",
    "Trevor",
    "Michelle",
    "Gary",
    "Nicole",
    "Craig",
    "Candice",
    "Ryan",
    "Natalie",
]

LAST_NAMES = [
    "Nkosi",
    "Dlamini",
    "Mbatha",
    "Khumalo",
    "Mthembu",
    "Ndlovu",
    "Ngcobo",
    "Zulu",
    "Van der Merwe",
    "Botha",
    "Pretorius",
    "Nel",
    "Van Wyk",
    "Venter",
    "De Villiers",
    "Du Plessis",
    "Patel",
    "Khan",
    "Mohamed",
    "Ebrahim",
    "Amod",
    "Ismail",
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Miller",
    "Davis",
    "Wilson",
    "Makhanya",
    "Cele",
    "Buthelezi",
    "Sithole",
    "Shabalala",
    "Hlongwane",
    "Mdluli",
    "Gumede",
    "Fourie",
    "Swanepoel",
    "Steyn",
    "Kotze",
    "Erasmus",
    "Kruger",
    "Coetzee",
    "Barnard",
    "Adams",
    "Benjamin",
    "September",
    "October",
    "Samuels",
    "Jacobs",
    "Daniels",
    "Martin",
]

# License types
LICENSE_TYPES = ["Code 08 (Manual)", "Code 08 (Automatic)", "Code 10", "Code 14"]

# Transmission types
TRANSMISSIONS = ["Manual", "Automatic"]

# Years of experience range
EXPERIENCE_RANGE = list(range(2, 25))

# Hourly rates (R150 - R350 per hour)
RATE_RANGE = list(range(150, 360, 10))


def generate_phone_number():
    """Generate realistic South African phone number"""
    prefixes = [
        "060",
        "061",
        "062",
        "063",
        "064",
        "065",
        "066",
        "067",
        "068",
        "069",
        "070",
        "071",
        "072",
        "073",
        "074",
        "076",
        "078",
        "079",
        "081",
        "082",
        "083",
        "084",
    ]
    prefix = random.choice(prefixes)
    number = "".join([str(random.randint(0, 9)) for _ in range(7)])
    return f"{prefix}{number}"


def generate_id_number(base_year=1970):
    """Generate realistic South African ID number"""
    year = random.randint(base_year, 2000)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    sequence = random.randint(0, 9999)
    citizenship = random.choice([0, 1])
    race = 8  # Not used anymore but still part of format

    id_start = f"{year % 100:02d}{month:02d}{day:02d}{sequence:04d}{citizenship}{race}"

    # Calculate checksum digit
    digits = [int(d) for d in id_start]
    odd_sum = sum(digits[::2])
    even_concat = int("".join([str(d) for d in digits[1::2]]))
    even_sum = sum([int(d) for d in str(even_concat * 2)])
    checksum = (10 - ((odd_sum + even_sum) % 10)) % 10

    return id_start + str(checksum)


def generate_instructor(index: int, db: Session):
    """Generate a single instructor with realistic data"""
    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    location = random.choice(LOCATIONS)
    vehicle = random.choice(VEHICLES)

    # Generate unique email
    email = f"{first_name.lower()}.{last_name.lower()}{index}@drivealive.test"
    phone = generate_phone_number()
    id_number = generate_id_number()

    # Randomly select experience and license types
    years_experience = random.choice(EXPERIENCE_RANGE)
    num_licenses = random.randint(1, 3)
    license_types = random.sample(LICENSE_TYPES, num_licenses)
    license_types_str = ", ".join(license_types)

    transmission = random.choice(TRANSMISSIONS)
    hourly_rate = random.choice(RATE_RANGE)

    # Random availability (70% available)
    is_available = random.random() < 0.7

    # Random profile completeness
    bio = None
    if random.random() < 0.6:
        bio = f"Experienced driving instructor with {years_experience} years in {location['city']}. Specializing in {license_types_str}. Patient and professional approach to teaching."

    # Create user first
    from app.models.user import UserRole, UserStatus

    user = User(
        email=email,
        phone=phone,
        password_hash="$2b$12$dummyhashedpasswordfordev123456789012345678901",  # Dummy hash
        first_name=first_name,
        last_name=last_name,
        role=UserRole.INSTRUCTOR,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()  # Get user.id

    # Create instructor
    instructor = Instructor(
        user_id=user.id,
        id_number=id_number,
        license_number=f"LIC{random.randint(100000, 999999)}",
        license_types=license_types_str,
        city=location["city"],
        suburb=location["suburb"],
        province=location["province"],
        vehicle_make=vehicle["make"],
        vehicle_model=vehicle["model"],
        vehicle_year=vehicle["year"],
        vehicle_registration=f"{random.choice(['CA', 'GP', 'WC', 'KZN', 'EC'])}{random.randint(10000, 99999)}",
        hourly_rate=hourly_rate,
        bio=bio,
        is_available=is_available,
        is_verified=True,  # Auto-verify all for testing
        verified_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
    )
    db.add(instructor)

    return instructor


def main():
    """Generate 100 instructors"""
    print("🚗 Generating 100 Instructors for Drive Alive")
    print("=" * 60)

    db = SessionLocal()
    try:
        # Get current instructor count
        current_count = db.query(Instructor).count()
        print(f"\n📊 Current instructors in database: {current_count}")

        print(f"\n🔄 Generating 100 new instructors...")

        created = 0
        errors = 0

        for i in range(1, 101):
            try:
                instructor = generate_instructor(i, db)

                if i % 10 == 0:
                    db.commit()
                    print(f"   ✓ Generated {i}/100 instructors...")

                created += 1

            except Exception as e:
                errors += 1
                print(f"   ✗ Error generating instructor {i}: {str(e)}")
                db.rollback()
                continue

        # Final commit
        db.commit()

        # Verify final count
        final_count = db.query(Instructor).count()
        new_count = final_count - current_count

        print("\n" + "=" * 60)
        print(f"✅ Generation Complete!")
        print(f"   • Instructors created: {created}")
        print(f"   • Errors encountered: {errors}")
        print(f"   • Previous total: {current_count}")
        print(f"   • New total: {final_count}")
        print(f"   • Added: {new_count}")
        print("=" * 60)

        # Show location distribution
        print("\n📍 Location Distribution:")
        locations = db.query(Instructor.city, Instructor.province).group_by(Instructor.city, Instructor.province).all()

        for city, province in sorted(set(locations)):
            count = db.query(Instructor).filter(Instructor.city == city, Instructor.province == province).count()
            print(f"   • {city}, {province}: {count} instructors")

        print("\n✨ All instructors are verified and ready for booking!")

    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
