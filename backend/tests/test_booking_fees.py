"""Tests for the hybrid commission booking-fee calculation."""

from types import SimpleNamespace
from unittest.mock import MagicMock

from app.services.fees import (
    DEFAULT_BOOKING_FEE,
    DEFAULT_COMMISSION_PERCENT,
    calculate_booking_fee,
    get_platform_commission_percent,
)


def _instructor(booking_fee=20.0):
    return SimpleNamespace(booking_fee=booking_fee)


def test_flat_fee_wins_for_cheap_lessons():
    # R250 lesson at 8% = R20 commission, flat R20 fee — tie goes to flat
    assert calculate_booking_fee(_instructor(20.0), 250.0, 8.0) == 20.0
    # R100 lesson at 8% = R8 < flat R20
    assert calculate_booking_fee(_instructor(20.0), 100.0, 8.0) == 20.0


def test_commission_wins_for_expensive_lessons():
    # R500 lesson at 8% = R40 > flat R20
    assert calculate_booking_fee(_instructor(20.0), 500.0, 8.0) == 40.0
    # R700 two-hour lesson at 8% = R56
    assert calculate_booking_fee(_instructor(20.0), 700.0, 8.0) == 56.0


def test_missing_flat_fee_falls_back_to_default():
    assert calculate_booking_fee(_instructor(None), 100.0, 8.0) == DEFAULT_BOOKING_FEE


def test_zero_commission_percent_keeps_flat_fee():
    assert calculate_booking_fee(_instructor(25.0), 1000.0, 0.0) == 25.0


def test_fee_is_rounded_to_cents():
    # R333 at 8% = 26.64
    assert calculate_booking_fee(_instructor(20.0), 333.0, 8.0) == 26.64


def test_higher_flat_fee_respected():
    # Admin set R50 flat fee for this instructor; 8% of R450 = R36 < R50
    assert calculate_booking_fee(_instructor(50.0), 450.0, 8.0) == 50.0


def _db_returning_admin(admin):
    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.first.return_value = admin
    return db


def test_commission_percent_read_from_first_admin():
    admin = SimpleNamespace(commission_percent=12.5)
    assert get_platform_commission_percent(_db_returning_admin(admin)) == 12.5


def test_commission_percent_defaults_when_unset():
    admin = SimpleNamespace(commission_percent=None)
    assert (
        get_platform_commission_percent(_db_returning_admin(admin))
        == DEFAULT_COMMISSION_PERCENT
    )


def test_commission_percent_defaults_when_no_admin():
    assert (
        get_platform_commission_percent(_db_returning_admin(None))
        == DEFAULT_COMMISSION_PERCENT
    )
