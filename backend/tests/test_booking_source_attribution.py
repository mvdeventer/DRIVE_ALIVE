"""Which bookings the platform earns commission on.

Commission is a finder's fee. A learner the marketplace introduced earns it;
a learner the school signed up itself does not. The rule has to be decided by
something a school cannot set for itself after the fact, which is why it hangs
off where the learner came from rather than off who created the booking.
"""

import pytest

from app.models.company import Company
from app.models.user import Instructor, Student
from app.services.fees import (
    SOURCE_COMPANY,
    SOURCE_PLATFORM,
    calculate_platform_charge,
    resolve_booking_source,
)


def _company(company_id=1, **kwargs):
    company = Company(name="Alpha Driving", slug="alpha", **kwargs)
    company.id = company_id
    return company


def _student(origin_company_id=None):
    return Student(origin_company_id=origin_company_id)


def test_a_learner_who_found_us_themselves_is_platform_sourced():
    assert (
        resolve_booking_source(_student(origin_company_id=None), _company())
        == SOURCE_PLATFORM
    )


def test_a_learner_the_school_signed_up_is_company_sourced():
    school = _company(company_id=7)
    assert (
        resolve_booking_source(_student(origin_company_id=7), school) == SOURCE_COMPANY
    )


def test_a_rival_schools_learner_is_platform_sourced_to_us():
    """From this school's side, the marketplace did the introducing."""
    assert (
        resolve_booking_source(_student(origin_company_id=99), _company(company_id=7))
        == SOURCE_PLATFORM
    )


def test_an_instructor_with_no_company_is_platform_sourced():
    assert resolve_booking_source(_student(), None) == SOURCE_PLATFORM


def test_the_school_pays_nothing_on_a_learner_it_brought():
    charge = calculate_platform_charge(
        1000.0, 8.0, booking_source=SOURCE_COMPANY, has_company=True
    )
    assert charge == 0.0


def test_the_school_pays_commission_on_a_learner_we_brought():
    charge = calculate_platform_charge(
        1000.0, 8.0, booking_source=SOURCE_PLATFORM, has_company=True
    )
    assert charge == 80.0


def test_the_host_company_never_pays_itself():
    charge = calculate_platform_charge(
        1000.0,
        8.0,
        booking_source=SOURCE_PLATFORM,
        is_platform_host=True,
        has_company=True,
    )
    assert charge == 0.0


@pytest.mark.parametrize("origin", [None, 0])
def test_an_unset_origin_never_reads_as_a_match(origin):
    """A falsy company id must not be mistaken for 'belongs to company 0'."""
    school = _company(company_id=1)
    assert resolve_booking_source(_student(origin), school) == SOURCE_PLATFORM
