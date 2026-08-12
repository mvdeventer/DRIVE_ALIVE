"""What gets stored on a booking after the pricing cutover.

``Booking.amount`` changed meaning: it used to be the lesson only, with the
platform fee added on top at every read site. It is now the full price the
student pays, and ``booking_fee`` holds the school's commission instead of the
student's surcharge.

These tests pin the arithmetic that the four booking-creation paths share.
"""

from types import SimpleNamespace

import pytest

from app.services.fees import (
    SOURCE_COMPANY,
    SOURCE_PLATFORM,
    calculate_platform_charge,
    resolve_student_price,
)


def _instructor(rate=350.0, markup_type=None, markup_value=0.0):
    return SimpleNamespace(
        hourly_rate=rate,
        company_markup_type=markup_type,
        company_markup_value=markup_value,
        booking_fee=20.0,
    )


def _book(instructor, duration=60, commission=8.0, source=SOURCE_PLATFORM, is_host=False):
    """The exact sequence every booking-creation path performs."""
    base, markup, total = resolve_student_price(instructor, duration)
    charge = calculate_platform_charge(
        total, commission, booking_source=source, is_platform_host=is_host
    )
    return {
        "amount": total,
        "instructor_base_amount": base,
        "company_markup_amount": markup,
        "booking_fee": charge,
    }


def test_amount_is_the_full_student_price():
    row = _book(_instructor(markup_type="percent", markup_value=20.0))
    assert row["amount"] == 420.0
    assert row["instructor_base_amount"] == 350.0
    assert row["company_markup_amount"] == 70.0


def test_the_stored_split_always_reconstructs_the_amount():
    row = _book(_instructor(markup_type="amount", markup_value=45.0), duration=90)
    assert round(row["instructor_base_amount"] + row["company_markup_amount"], 2) == row["amount"]


def test_booking_fee_now_holds_the_schools_commission_not_a_student_surcharge():
    row = _book(_instructor(markup_type="percent", markup_value=20.0))
    # 8% of the R420 gross, billed to the school.
    assert row["booking_fee"] == 33.60
    # And it is NOT added to what the student pays.
    assert row["amount"] == 420.0


def test_the_student_never_pays_the_commission():
    """The regression the cutover exists to prevent."""
    row = _book(_instructor(markup_type="percent", markup_value=20.0))
    student_pays = row["amount"]
    assert student_pays == row["instructor_base_amount"] + row["company_markup_amount"]
    assert student_pays != row["amount"] + row["booking_fee"]


def test_instructor_is_paid_base_regardless_of_markup():
    """Markup is the school's margin; it must not change instructor earnings."""
    plain = _book(_instructor())
    marked_up = _book(_instructor(markup_type="percent", markup_value=40.0))
    assert plain["instructor_base_amount"] == marked_up["instructor_base_amount"] == 350.0
    assert marked_up["amount"] > plain["amount"]


def test_school_sourced_booking_owes_no_commission():
    row = _book(_instructor(markup_type="percent", markup_value=20.0), source=SOURCE_COMPANY)
    assert row["booking_fee"] == 0.0
    assert row["amount"] == 420.0  # the student pays the same either way


def test_host_company_booking_owes_no_commission():
    row = _book(_instructor(markup_type="percent", markup_value=20.0), is_host=True)
    assert row["booking_fee"] == 0.0


def test_independent_instructor_has_no_markup():
    row = _book(_instructor())
    assert row["company_markup_amount"] == 0.0
    assert row["amount"] == row["instructor_base_amount"] == 350.0


@pytest.mark.parametrize("duration", [30, 60, 90, 120, 180])
def test_split_holds_at_every_supported_duration(duration):
    row = _book(_instructor(markup_type="percent", markup_value=20.0), duration=duration)
    assert round(row["instructor_base_amount"] + row["company_markup_amount"], 2) == row["amount"]
    assert row["booking_fee"] == round(row["amount"] * 0.08, 2)


def test_school_margin_after_commission_is_what_it_should_be():
    """R350 base + R70 markup: school keeps R70 - R33.60 = R36.40."""
    row = _book(_instructor(markup_type="percent", markup_value=20.0))
    school_net = row["company_markup_amount"] - row["booking_fee"]
    assert round(school_net, 2) == 36.40
