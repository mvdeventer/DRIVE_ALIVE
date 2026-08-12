"""Lesson pricing and platform revenue.

Guards the money spec:

* the student pays ``instructor_base + company_markup`` as one number;
* the instructor is paid their base — the markup is the school's margin;
* the school pays commission on the gross, only on marketplace-sourced
  bookings, and never if it is the company operating the platform.
"""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.services.fees import (
    DEFAULT_COMMISSION_PERCENT,
    SOURCE_COMPANY,
    SOURCE_PLATFORM,
    break_even_markup_ratio,
    calculate_platform_charge,
    get_platform_commission_percent,
    resolve_student_price,
)


def _instructor(rate=350.0, markup_type=None, markup_value=0.0):
    return SimpleNamespace(
        hourly_rate=rate,
        company_markup_type=markup_type,
        company_markup_value=markup_value,
    )


# ── Student price ──────────────────────────────────────────────────────────


def test_no_markup_means_the_student_pays_the_instructor_rate():
    assert resolve_student_price(_instructor(), 60) == (350.0, 0.0, 350.0)


def test_percent_markup_is_a_share_of_the_base():
    assert resolve_student_price(
        _instructor(markup_type="percent", markup_value=20.0), 60
    ) == (350.0, 70.0, 420.0)


def test_flat_markup_is_per_hour_not_per_lesson():
    """Both markup kinds scale with duration, so break-even is length-independent."""
    one_hour = resolve_student_price(_instructor(markup_type="amount", markup_value=50.0), 60)
    two_hours = resolve_student_price(_instructor(markup_type="amount", markup_value=50.0), 120)
    assert one_hour == (350.0, 50.0, 400.0)
    assert two_hours == (700.0, 100.0, 800.0)


def test_percent_markup_also_scales_with_duration():
    assert resolve_student_price(
        _instructor(markup_type="percent", markup_value=20.0), 120
    ) == (700.0, 140.0, 840.0)


def test_half_hour_lesson_is_priced_pro_rata():
    assert resolve_student_price(
        _instructor(markup_type="percent", markup_value=20.0), 30
    ) == (175.0, 35.0, 210.0)


def test_total_is_always_base_plus_markup():
    base, markup, total = resolve_student_price(
        _instructor(rate=333.0, markup_type="percent", markup_value=12.5), 90
    )
    assert round(base + markup, 2) == total


@pytest.mark.parametrize("bad_type", ["", "flat", "PERCENT", None])
def test_an_unrecognised_markup_type_never_inflates_the_price(bad_type):
    """A bad value must fail safe towards the student, not against them."""
    base, markup, total = resolve_student_price(
        _instructor(markup_type=bad_type, markup_value=99.0), 60
    )
    assert markup == 0.0
    assert total == base


def test_zero_markup_value_is_no_markup():
    assert resolve_student_price(_instructor(markup_type="percent", markup_value=0.0), 60)[1] == 0.0


# ── Platform charge ────────────────────────────────────────────────────────


def test_commission_is_charged_on_the_gross_student_price():
    # R350 base + R70 markup = R420 gross; 8% = R33.60
    assert calculate_platform_charge(420.0, 8.0) == 33.60


def test_no_commission_on_a_booking_the_school_brought_itself():
    assert calculate_platform_charge(420.0, 8.0, booking_source=SOURCE_COMPANY) == 0.0


def test_the_platform_host_never_charges_itself():
    assert (
        calculate_platform_charge(
            420.0, 8.0, booking_source=SOURCE_PLATFORM, is_platform_host=True
        )
        == 0.0
    )


def test_charge_is_rounded_to_cents():
    # 8% of R333 = R26.64
    assert calculate_platform_charge(333.0, 8.0) == 26.64


def test_a_negative_gross_cannot_produce_a_negative_charge():
    assert calculate_platform_charge(-100.0, 8.0) == 0.0


# ── Break-even ─────────────────────────────────────────────────────────────


def test_break_even_ratio_at_eight_percent():
    assert round(break_even_markup_ratio(8.0), 5) == 0.08696


def test_at_break_even_the_school_nets_nothing():
    """The definition, checked against the arithmetic it is derived from."""
    base = 350.0
    markup = base * break_even_markup_ratio(8.0)
    charge = calculate_platform_charge(base + markup, 8.0)
    assert round(markup - charge, 2) == 0.0


def test_below_break_even_the_school_loses_money():
    base = 350.0
    markup = base * 0.05  # 5% — under the ~8.7% threshold
    charge = calculate_platform_charge(base + markup, 8.0)
    assert markup - charge < 0


def test_above_break_even_the_school_profits():
    base = 350.0
    markup = base * 0.40
    charge = calculate_platform_charge(base + markup, 8.0)
    assert markup - charge > 0


def test_zero_commission_means_any_markup_profits():
    assert break_even_markup_ratio(0.0) == 0.0


# ── Commission rate resolution ─────────────────────────────────────────────


def _db(host=None, admin=None):
    """Stub Session: host lookup ends in .first(), admin lookup in .order_by().first()."""
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = host
    db.query.return_value.filter.return_value.order_by.return_value.first.return_value = admin
    return db


def _company(percent):
    return SimpleNamespace(platform_commission_percent=percent)


def test_commission_percent_read_from_host_company():
    db = _db(host=_company(11.0), admin=SimpleNamespace(commission_percent=8.0))
    assert get_platform_commission_percent(db) == 11.0


def test_company_override_beats_the_host_rate():
    db = _db(host=_company(8.0))
    assert get_platform_commission_percent(db, company=_company(5.0)) == 5.0


def test_company_without_an_override_falls_through_to_the_host_rate():
    db = _db(host=_company(8.0))
    assert get_platform_commission_percent(db, company=_company(None)) == 8.0


def test_commission_percent_falls_back_to_first_admin_when_no_host_company():
    admin = SimpleNamespace(commission_percent=12.5)
    assert get_platform_commission_percent(_db(host=None, admin=admin)) == 12.5


def test_host_company_without_a_rate_falls_back_to_first_admin():
    admin = SimpleNamespace(commission_percent=12.5)
    assert get_platform_commission_percent(_db(host=_company(None), admin=admin)) == 12.5


def test_commission_percent_defaults_when_unset():
    admin = SimpleNamespace(commission_percent=None)
    assert get_platform_commission_percent(_db(admin=admin)) == DEFAULT_COMMISSION_PERCENT


def test_commission_percent_defaults_when_no_admin():
    assert get_platform_commission_percent(_db()) == DEFAULT_COMMISSION_PERCENT


def test_an_independent_instructor_is_never_charged_commission():
    """Only schools pay. Charging here would leave a figure on the booking
    that no ledger row backs, because there is nobody to bill."""
    assert calculate_platform_charge(420.0, 8.0, has_company=False) == 0.0
