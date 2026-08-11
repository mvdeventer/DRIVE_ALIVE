"""Give already-registered independent instructors a one-person company.

Instructors who registered before solo companies existed have
``company_id IS NULL``, so ``calculate_platform_charge`` returns zero for
every booking they take and the platform earns nothing on them.

This is deliberately a script and not a boot migration: it changes what real
people owe from the moment it runs. Preview it, tell the affected instructors,
then apply it.

    python backfill_solo_companies.py            # preview, changes nothing
    python backfill_solo_companies.py --apply

Only future bookings are affected — existing rows keep the snapshot they were
written with, so nobody is billed retrospectively.
"""

import argparse
import sys

from app.database import SessionLocal
from app.models.company import Company
from app.models.user import Instructor, User
from app.services.company_service import ensure_solo_company


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="write the changes; omit to preview only",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        independents = (
            db.query(Instructor, User)
            .join(User, Instructor.user_id == User.id)
            .filter(Instructor.company_id.is_(None))
            .order_by(Instructor.id)
            .all()
        )

        if not independents:
            print("No unattached instructors. Nothing to do.")
            return 0

        print(f"{len(independents)} instructor(s) with no company:\n")
        for instructor, user in independents:
            print(
                f"  #{instructor.id:<5} {user.first_name} {user.last_name} "
                f"<{user.email}>  R{instructor.hourly_rate or 0:.2f}/hr"
            )

        if not args.apply:
            print(
                "\nPreview only — nothing written. Re-run with --apply to create "
                "a one-person company for each.\n"
                "After that their platform-sourced bookings accrue commission."
            )
            return 0

        created = 0
        for instructor, user in independents:
            company = ensure_solo_company(db, user, instructor)
            created += 1
            print(f"  -> #{instructor.id} now trades as '{company.name}'")
        db.commit()

        total = db.query(Company).filter(Company.is_solo.is_(True)).count()
        print(f"\nDone. {created} created; {total} solo companies in total.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
