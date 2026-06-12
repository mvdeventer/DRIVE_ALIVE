"""
Seed scale test data for companies, instructors, and students.

Usage examples:
  python seed_scale_data.py --companies 30 --instructors 300 --students 120
  python seed_scale_data.py --companies 70 --instructors 700 --students 280
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from random import Random

from app.database import SessionLocal
from app.models.company import Company
from app.models.user import (
    Instructor,
    InstructorVerificationStatus,
    Student,
    User,
    UserRole,
    UserStatus,
)
from app.services.company_service import create_company
from app.utils.auth import get_password_hash


DEFAULT_PASSWORD = "ScalePass123!"

FIRST_NAMES = [
    "Thabo",
    "Sipho",
    "Lerato",
    "Ayesha",
    "John",
    "Emma",
    "Nandi",
    "Pieter",
    "Sarah",
    "Musa",
]

LAST_NAMES = [
    "Nkosi",
    "Dlamini",
    "Van der Merwe",
    "Patel",
    "Smith",
    "Johnson",
    "Cele",
    "Botha",
    "Adams",
    "Martin",
]

VEHICLES = [
    ("Toyota", "Corolla", 2021),
    ("Volkswagen", "Polo", 2020),
    ("Hyundai", "i20", 2022),
    ("Suzuki", "Swift", 2023),
    ("Nissan", "Micra", 2019),
]

PROVINCES = [
    ("Gauteng", "Johannesburg", "Sandton"),
    ("Western Cape", "Cape Town", "Claremont"),
    ("KwaZulu-Natal", "Durban", "Umhlanga"),
    ("Eastern Cape", "Gqeberha", "Summerstrand"),
    ("Free State", "Bloemfontein", "Westdene"),
]


def _fmt_phone(seed_num: int) -> str:
    # +27 followed by 9 digits
    return f"+27{seed_num:09d}"[-12:]


def _fmt_id(seed_num: int) -> str:
    # Deterministic 13-digit-ish ID-like value for test data
    return f"99{seed_num:011d}"[:13]


def _pick_identity(rng: Random) -> tuple[str, str]:
    return rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)


def _pick_vehicle(rng: Random) -> tuple[str, str, int]:
    return rng.choice(VEHICLES)


def _pick_location(rng: Random) -> tuple[str, str, str]:
    return rng.choice(PROVINCES)


def _create_instructor_user(
    db,
    *,
    email: str,
    phone: str,
    hashed_password: str,
    first_name: str,
    last_name: str,
    id_number: str,
) -> User:
    user = User(
        email=email,
        phone=phone,
        password_hash=hashed_password,
        first_name=first_name,
        last_name=last_name,
        role=UserRole.INSTRUCTOR,
        status=UserStatus.ACTIVE,
        id_number=id_number,
        terms_accepted_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    return user


def _create_owner_instructor(
    db,
    rng: Random,
    n: int,
    hashed_password: str,
    company: Company,
) -> None:
    first, last = _pick_identity(rng)
    make, model, year = _pick_vehicle(rng)
    province, city, suburb = _pick_location(rng)

    user = User(
        email=f"owner{n}@scale.test",
        phone=_fmt_phone(600000000 + n),
        password_hash=hashed_password,
        first_name=first,
        last_name=last,
        role=UserRole.INSTRUCTOR,
        status=UserStatus.ACTIVE,
        id_number=_fmt_id(40000000000 + n),
        terms_accepted_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()

    instructor = Instructor(
        user_id=user.id,
        license_number=f"OWN{n}",
        license_types="CODE8,CODE10",
        id_number=_fmt_id(50000000000 + n),
        vehicle_registration=f"OWN{n % 100000:05d}",
        vehicle_make=make,
        vehicle_model=model,
        vehicle_year=year,
        province=province,
        city=city,
        suburb=suburb,
        hourly_rate=260.0,
        service_radius_km=20.0,
        max_travel_distance_km=50.0,
        rate_per_km_beyond_radius=5.0,
        bio="Scale test company owner instructor",
        is_available=True,
        is_verified=True,
        verification_status=InstructorVerificationStatus.VERIFIED.value,
        is_company_owner=True,
    )
    db.add(instructor)
    db.flush()

    company.owner_instructor_id = instructor.id
    instructor.company_id = company.id


def _create_regular_instructor(
    db,
    rng: Random,
    n: int,
    hashed_password: str,
    created_companies: list[Company],
    company_link_ratio: float,
) -> bool:
    first, last = _pick_identity(rng)
    make, model, year = _pick_vehicle(rng)
    province, city, suburb = _pick_location(rng)

    user = _create_instructor_user(
        db,
        email=f"instructor{n}@scale.test",
        phone=_fmt_phone(700000000 + n),
        hashed_password=hashed_password,
        first_name=first,
        last_name=last,
        id_number=_fmt_id(60000000000 + n),
    )

    assigned_company_id = (
        rng.choice(created_companies).id
        if created_companies and (rng.random() < company_link_ratio)
        else None
    )

    instructor = Instructor(
        user_id=user.id,
        license_number=f"INS{n}",
        license_types="CODE8",
        id_number=_fmt_id(70000000000 + n),
        vehicle_registration=f"INS{n % 100000:05d}",
        vehicle_make=make,
        vehicle_model=model,
        vehicle_year=year,
        province=province,
        city=city,
        suburb=suburb,
        hourly_rate=240.0,
        service_radius_km=20.0,
        max_travel_distance_km=50.0,
        rate_per_km_beyond_radius=5.0,
        bio="Scale test instructor",
        is_available=True,
        is_verified=True,
        verification_status=InstructorVerificationStatus.VERIFIED.value,
        company_id=assigned_company_id,
        is_company_owner=False,
    )
    db.add(instructor)
    return assigned_company_id is not None


def _create_student(
    db,
    rng: Random,
    n: int,
    sidx: int,
    hashed_password: str,
) -> None:
    first, last = _pick_identity(rng)
    province, city, suburb = _pick_location(rng)

    user = User(
        email=f"student{n}@scale.test",
        phone=_fmt_phone(800000000 + n),
        password_hash=hashed_password,
        first_name=first,
        last_name=last,
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
        id_number=_fmt_id(80000000000 + n),
        terms_accepted_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()

    student = Student(
        user_id=user.id,
        id_number=_fmt_id(90000000000 + n),
        learners_permit_number=f"LP{sidx:06d}",
        emergency_contact_name="Emergency Contact",
        emergency_contact_phone=_fmt_phone(900000000 + n),
        address_line1=f"{sidx} Test Street",
        address_line2="",
        province=province,
        city=city,
        suburb=suburb,
        postal_code=f"{7500 + (sidx % 200):04d}",
    )
    db.add(student)


def _count_entities(db) -> dict[str, int]:
    return {
        "companies": db.query(Company).count(),
        "instructors": db.query(Instructor).count(),
        "students": db.query(Student).count(),
    }


def _create_companies(db, companies_to_add: int, company_start: int) -> list[Company]:
    created_companies: list[Company] = []
    for i in range(companies_to_add):
        idx = company_start + i
        created_companies.append(create_company(db, f"Scale Driving School {idx}"))
    db.flush()
    return created_companies


def _seed_instructors(
    db,
    rng: Random,
    user_offset: int,
    instructors_to_add: int,
    created_companies: list[Company],
    company_link_ratio: float,
    hashed_password: str,
) -> dict[str, int]:
    instructors_created = 0
    company_linked = 0
    independent = 0
    owners = 0

    owner_count = min(len(created_companies), instructors_to_add)
    for i in range(owner_count):
        n = user_offset + i
        _create_owner_instructor(
            db=db,
            rng=rng,
            n=n,
            hashed_password=hashed_password,
            company=created_companies[i],
        )
        instructors_created += 1
        company_linked += 1
        owners += 1

    for i in range(max(instructors_to_add - owner_count, 0)):
        n = user_offset + owner_count + i
        linked_to_company = _create_regular_instructor(
            db=db,
            rng=rng,
            n=n,
            hashed_password=hashed_password,
            created_companies=created_companies,
            company_link_ratio=company_link_ratio,
        )
        if linked_to_company:
            company_linked += 1
        else:
            independent += 1
        instructors_created += 1

    return {
        "instructors_created": instructors_created,
        "company_linked": company_linked,
        "independent": independent,
        "owners": owners,
    }


def _seed_students(
    db,
    rng: Random,
    students_to_add: int,
    user_offset: int,
    instructors_to_add: int,
    hashed_password: str,
) -> int:
    student_offset = db.query(Student).count() + 1
    for i in range(students_to_add):
        n = user_offset + instructors_to_add + i
        sidx = student_offset + i
        _create_student(
            db=db,
            rng=rng,
            n=n,
            sidx=sidx,
            hashed_password=hashed_password,
        )
    return students_to_add


def _print_seed_result(before: dict[str, int], after: dict[str, int], summary: dict[str, int]) -> None:
    print("SEED_RESULT", {
        "created_companies": after["companies"] - before["companies"],
        "created_instructors": after["instructors"] - before["instructors"],
        "created_students": after["students"] - before["students"],
        "company_owners": summary["owners"],
        "company_linked_instructors": summary["company_linked"],
        "independent_instructors": summary["independent"],
        "default_password": DEFAULT_PASSWORD,
        "before": before,
        "after": after,
    })


def seed(
    companies_to_add: int,
    instructors_to_add: int,
    students_to_add: int,
    company_link_ratio: float,
    rng_seed: int,
) -> None:
    rng = Random(rng_seed)
    db = SessionLocal()

    try:
        before = _count_entities(db)
        created_companies = _create_companies(db, companies_to_add, before["companies"] + 1)
        user_offset = db.query(User).count() + 1
        hashed_password = get_password_hash(DEFAULT_PASSWORD)
        summary = _seed_instructors(
            db=db,
            rng=rng,
            user_offset=user_offset,
            instructors_to_add=instructors_to_add,
            created_companies=created_companies,
            company_link_ratio=company_link_ratio,
            hashed_password=hashed_password,
        )
        _seed_students(
            db=db,
            rng=rng,
            students_to_add=students_to_add,
            user_offset=user_offset,
            instructors_to_add=instructors_to_add,
            hashed_password=hashed_password,
        )

        db.commit()
        after = _count_entities(db)
        _print_seed_result(before, after, summary)

    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed scale test data")
    parser.add_argument("--companies", type=int, default=30)
    parser.add_argument("--instructors", type=int, default=300)
    parser.add_argument("--students", type=int, default=120)
    parser.add_argument("--company-link-ratio", type=float, default=0.65)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    seed(
        companies_to_add=args.companies,
        instructors_to_add=args.instructors,
        students_to_add=args.students,
        company_link_ratio=args.company_link_ratio,
        rng_seed=args.seed,
    )


if __name__ == "__main__":
    main()
