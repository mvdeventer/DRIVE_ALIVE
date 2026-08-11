"""Tests for the over-stated booking-amount classifier.

The repair script must never guess. It may only rewrite a booking when the
stored amount provably equals ``lesson + fee`` and provably does not equal
``lesson`` on its own.
"""

from types import SimpleNamespace

from fix_stripe_booking_amounts import AMBIGUOUS, CORRECT, OVERSTATED, classify


def _booking(amount, fee=20.0, duration=60):
    return SimpleNamespace(
        id=1,
        booking_reference="BKTEST001",
        amount=amount,
        booking_fee=fee,
        duration_minutes=duration,
        instructor_id=1,
        payment_method="stripe",
    )


def _instructor(hourly_rate=350.0):
    return SimpleNamespace(id=1, hourly_rate=hourly_rate)


def test_lesson_only_amount_is_already_correct():
    # R350/hr, 60 min -> lesson R350, fee stored separately
    verdict, expected = classify(_booking(350.0), _instructor())
    assert verdict == CORRECT
    assert expected == 350.0


def test_lesson_plus_fee_amount_is_overstated():
    # The Stripe path wrote 350 + 28 = 378 into `amount`
    verdict, expected = classify(_booking(378.0, fee=28.0), _instructor())
    assert verdict == OVERSTATED
    assert expected == 350.0


def test_rate_changed_since_booking_is_ambiguous_not_guessed():
    # Booking stored R400 but the instructor now charges R500/hr — neither
    # R500 nor R520 reconciles, so the row must be left alone.
    verdict, _ = classify(_booking(400.0), _instructor(hourly_rate=500.0))
    assert verdict == AMBIGUOUS


def test_missing_instructor_is_ambiguous():
    assert classify(_booking(378.0), None)[0] == AMBIGUOUS


def test_missing_hourly_rate_is_ambiguous():
    assert classify(_booking(378.0), _instructor(hourly_rate=None))[0] == AMBIGUOUS


def test_zero_fee_booking_is_correct_never_overstated():
    # Both branches match when the fee is zero; there is nothing to subtract,
    # so it must classify as correct rather than overstated.
    verdict, _ = classify(_booking(350.0, fee=0.0), _instructor())
    assert verdict == CORRECT


def test_two_hour_lesson_uses_duration():
    # R350/hr for 120 min -> lesson R700, over-stated by a R56 fee
    verdict, expected = classify(
        _booking(756.0, fee=56.0, duration=120), _instructor()
    )
    assert verdict == OVERSTATED
    assert expected == 700.0


def test_rounding_slack_is_tolerated():
    # calculate_booking_fee rounds to cents, so a cent of drift must not
    # push a correct row into the ambiguous bucket.
    verdict, _ = classify(_booking(350.01), _instructor())
    assert verdict == CORRECT


def test_repair_is_idempotent():
    # Applying the fix once yields a row that classifies as correct, so a
    # second run finds nothing to do.
    booking = _booking(378.0, fee=28.0)
    verdict, expected = classify(booking, _instructor())
    assert verdict == OVERSTATED

    booking.amount = expected
    assert classify(booking, _instructor())[0] == CORRECT
