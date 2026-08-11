"""
Repair bookings whose ``amount`` double-counts the platform booking fee.

Background
----------
``routes/payments.py`` (the post-Stripe booking creation path) used to set
``amount = lesson_amount + booking_fee`` while ``routes/bookings.py`` and the
mock-gateway path set ``amount = lesson_amount`` only. Every downstream reader
does ``amount + booking_fee``, so bookings created through Stripe were
over-stated by exactly one fee in earnings reports, revenue analytics,
cancellation refunds and the WhatsApp confirmations sent to students.

Unlike the older ``fix_booking_amounts.py`` (which blindly subtracts
``booking_fee`` from every row and corrupts the data if run twice), this script
classifies each booking by recomputing the expected lesson amount from the
instructor's rate, and only touches rows it can prove are over-stated.

Usage
-----
    python fix_stripe_booking_amounts.py            # dry run, changes nothing
    python fix_stripe_booking_amounts.py --apply    # commit the fixes

Safe to run repeatedly: a second run finds nothing to fix.
"""

import argparse
import sys

from app.database import SessionLocal
from app.models.booking import Booking
from app.models.user import Instructor

# Rounding slack. calculate_booking_fee() rounds to 2dp and hourly_rate is a
# float, so exact equality is not reliable.
TOLERANCE = 0.02

CORRECT = "correct"
OVERSTATED = "overstated"
AMBIGUOUS = "ambiguous"


def classify(booking, instructor):
    """Return (verdict, expected_lesson_amount).

    A booking is only ever repaired when its stored amount matches
    ``lesson + fee`` and does NOT match ``lesson`` — i.e. when the
    over-statement is unambiguous.
    """
    if instructor is None or instructor.hourly_rate is None:
        return AMBIGUOUS, None

    expected_lesson = instructor.hourly_rate * ((booking.duration_minutes or 60) / 60)
    fee = booking.booking_fee or 0.0
    amount = booking.amount or 0.0

    matches_lesson = abs(amount - expected_lesson) <= TOLERANCE
    matches_lesson_plus_fee = abs(amount - (expected_lesson + fee)) <= TOLERANCE

    if matches_lesson:
        # Already correct. Note a zero fee makes both branches true, which is
        # why this is checked first — nothing to subtract in that case anyway.
        return CORRECT, expected_lesson
    if matches_lesson_plus_fee:
        return OVERSTATED, expected_lesson
    # The instructor most likely changed their hourly_rate after this booking
    # was made, so neither figure reconciles. Never guess — report it.
    return AMBIGUOUS, expected_lesson


def main(apply_changes: bool) -> int:
    db = SessionLocal()
    try:
        bookings = db.query(Booking).order_by(Booking.id.asc()).all()
        instructors = {i.id: i for i in db.query(Instructor).all()}

        buckets = {CORRECT: [], OVERSTATED: [], AMBIGUOUS: []}

        for booking in bookings:
            verdict, expected = classify(booking, instructors.get(booking.instructor_id))
            buckets[verdict].append((booking, expected))

        print(f"Scanned {len(bookings)} bookings")
        print(f"  already correct : {len(buckets[CORRECT])}")
        print(f"  over-stated     : {len(buckets[OVERSTATED])}")
        print(f"  ambiguous       : {len(buckets[AMBIGUOUS])}")

        if buckets[AMBIGUOUS]:
            print(
                "\nAmbiguous rows (instructor rate probably changed since booking) "
                "— NOT touched, review by hand:"
            )
            for booking, expected in buckets[AMBIGUOUS]:
                expected_str = f"{expected:.2f}" if expected is not None else "unknown"
                print(
                    f"  #{booking.id} {booking.booking_reference} "
                    f"amount=R{booking.amount:.2f} fee=R{(booking.booking_fee or 0):.2f} "
                    f"expected_lesson=R{expected_str} method={booking.payment_method}"
                )

        if not buckets[OVERSTATED]:
            print("\nNothing to repair.")
            return 0

        print("\nOver-stated rows:")
        for booking, expected in buckets[OVERSTATED]:
            print(
                f"  #{booking.id} {booking.booking_reference} "
                f"R{booking.amount:.2f} -> R{expected:.2f} "
                f"(fee R{(booking.booking_fee or 0):.2f} stays separate) "
                f"method={booking.payment_method}"
            )

        if not apply_changes:
            print(
                f"\nDRY RUN — nothing written. "
                f"Re-run with --apply to fix {len(buckets[OVERSTATED])} bookings."
            )
            return 0

        for booking, expected in buckets[OVERSTATED]:
            booking.amount = round(expected, 2)
        db.commit()
        print(f"\nRepaired {len(buckets[OVERSTATED])} bookings.")
        return 0

    except Exception as exc:
        db.rollback()
        print(f"\nFailed, rolled back: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Commit the repairs. Without this the script only reports.",
    )
    args = parser.parse_args()
    sys.exit(main(args.apply))
