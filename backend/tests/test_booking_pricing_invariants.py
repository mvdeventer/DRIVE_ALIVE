"""Every booking must carry the breakdown of what it charged.

``amount`` is the single number the learner pays. The three columns beside
it say where it came from — the instructor's base, the school's markup, the
school it belongs to — and ``booking_source`` says whether the marketplace
produced the booking and so whether commission is owed.

They are easy to forget, because a booking inserts perfectly well without
them: the row simply claims R432 with a base of zero, no school, and a
default source. That is what happened at the instructor-reschedule path,
which for a while created bookings no statement could reconcile and no
commission was ever charged on.

Reading the source is unusual for a test. The alternative was integration
coverage for five endpoints, several of which need a payment gateway; this
catches the same mistake at the point it is made, and it caught a real one.
"""

import ast
import io
from pathlib import Path

import pytest

# Set on the Booking row so the money reconciles. Every construction site
# must supply all of them, whether computed fresh or carried from the
# booking being replaced.
REQUIRED_PRICING_FIELDS = {
    "instructor_base_amount",
    "company_markup_amount",
    "company_id",
    "booking_source",
}

ROUTES = Path(__file__).resolve().parent.parent / "app" / "routes"


def _booking_constructions():
    """Every ``Booking(...)`` call in the route layer, with its keywords."""
    for path in sorted(ROUTES.glob("*.py")):
        tree = ast.parse(io.open(path, encoding="utf-8").read(), filename=str(path))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            func = node.func
            name = getattr(func, "id", None) or getattr(func, "attr", None)
            if name != "Booking":
                continue
            keywords = {kw.arg for kw in node.keywords if kw.arg is not None}
            # Booking(**payload) — the keys live in the dict, checked below.
            splatted = any(kw.arg is None for kw in node.keywords)
            yield path.name, node.lineno, keywords, splatted


def _dict_literal_keys_near(path_name: str, lineno: int) -> set:
    """Keys of dict literals in the same function as a splatted call.

    ``create_bulk_bookings`` builds a dict and expands it. Rather than trace
    the variable, collect the string keys of every dict literal in that
    function — enough to tell whether the pricing fields were populated.
    """
    path = ROUTES / path_name
    tree = ast.parse(io.open(path, encoding="utf-8").read(), filename=str(path))
    keys: set = set()
    for func in ast.walk(tree):
        if not isinstance(func, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        start = func.lineno
        end = max(
            (getattr(n, "lineno", start) for n in ast.walk(func)), default=start
        )
        if not (start <= lineno <= end):
            continue
        for node in ast.walk(func):
            if isinstance(node, ast.Dict):
                keys.update(
                    k.value
                    for k in node.keys
                    if isinstance(k, ast.Constant) and isinstance(k.value, str)
                )
    return keys


def test_there_are_booking_constructions_to_check():
    """Guard against the parser silently finding nothing and passing."""
    assert list(_booking_constructions())


@pytest.mark.parametrize(
    "site", list(_booking_constructions()), ids=lambda s: f"{s[0]}:{s[1]}"
)
def test_every_booking_records_what_it_charged(site):
    filename, lineno, keywords, splatted = site

    supplied = set(keywords)
    if splatted:
        supplied |= _dict_literal_keys_near(filename, lineno)

    missing = sorted(REQUIRED_PRICING_FIELDS - supplied)
    assert not missing, (
        f"{filename}:{lineno} creates a Booking without {missing}. "
        "Without these the amount cannot be reconciled and the booking is "
        "not attributed to a school, so no commission is charged on it."
    )
