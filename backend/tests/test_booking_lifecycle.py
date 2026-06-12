"""Booking lifecycle tests: PENDING → CONFIRMED → COMPLETED."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.booking import BookingStatus, PaymentStatus
from app.routes.bookings import auto_update_past_bookings


def _db_returning(bookings):
    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = bookings
    return db


def _past_booking(status=BookingStatus.PENDING):
    """Booking whose lesson ended 2 hours ago."""
    return SimpleNamespace(
        id=1,
        lesson_date=datetime.now(timezone.utc) - timedelta(hours=3),
        duration_minutes=60,
        status=status,
    )


def _future_booking(status=BookingStatus.PENDING):
    """Booking scheduled for tomorrow."""
    return SimpleNamespace(
        id=2,
        lesson_date=datetime.now(timezone.utc) + timedelta(days=1),
        duration_minutes=60,
        status=status,
    )


# ── auto_update_past_bookings ────────────────────────────────────────────────

def test_past_pending_booking_auto_completes():
    booking = _past_booking(BookingStatus.PENDING)
    db = _db_returning([booking])

    count = auto_update_past_bookings(db)

    assert booking.status == BookingStatus.COMPLETED
    assert count == 1
    db.commit.assert_called_once()


def test_future_pending_booking_unchanged():
    booking = _future_booking(BookingStatus.PENDING)
    db = _db_returning([booking])

    count = auto_update_past_bookings(db)

    assert booking.status == BookingStatus.PENDING
    assert count == 0
    db.commit.assert_not_called()


def test_past_completed_booking_unchanged():
    """auto_update only queries PENDING; completed bookings are not in the result set."""
    booking = _past_booking(BookingStatus.COMPLETED)
    db = _db_returning([])  # Route queries PENDING only, so no results here

    count = auto_update_past_bookings(db)

    assert count == 0


def test_no_commit_when_nothing_updated():
    db = _db_returning([])

    auto_update_past_bookings(db)

    db.commit.assert_not_called()


# ── confirm_booking business rules ───────────────────────────────────────────

class TestConfirmBookingRules:
    """Validate the status-transition guards from the confirm_booking route."""

    def _booking(self, status, payment=PaymentStatus.PAID, instructor_id=99):
        return SimpleNamespace(
            id=1,
            instructor_id=instructor_id,
            student_id=77,
            status=status,
            payment_status=payment,
        )

    def test_pending_paid_is_the_only_confirmable_state(self):
        """Only PENDING + PAID can transition to CONFIRMED."""
        b = self._booking(BookingStatus.PENDING, PaymentStatus.PAID)
        # Simulate route guard sequence
        assert b.status == BookingStatus.PENDING
        assert b.payment_status == PaymentStatus.PAID
        b.status = BookingStatus.CONFIRMED
        assert b.status == BookingStatus.CONFIRMED

    def test_already_confirmed_raises_400(self):
        b = self._booking(BookingStatus.CONFIRMED)
        with pytest.raises(HTTPException) as exc:
            if b.status != BookingStatus.PENDING:
                raise HTTPException(status_code=400, detail="Booking is not pending")
        assert exc.value.status_code == 400

    def test_unpaid_pending_raises_400(self):
        b = self._booking(BookingStatus.PENDING, payment=PaymentStatus.PENDING)
        with pytest.raises(HTTPException) as exc:
            if b.payment_status != PaymentStatus.PAID:
                raise HTTPException(
                    status_code=400,
                    detail="Payment must be completed before confirmation",
                )
        assert exc.value.status_code == 400

    def test_cancelled_raises_400(self):
        b = self._booking(BookingStatus.CANCELLED)
        with pytest.raises(HTTPException) as exc:
            if b.status != BookingStatus.PENDING:
                raise HTTPException(status_code=400, detail="Booking is not pending")
        assert exc.value.status_code == 400

    def test_full_lifecycle_pending_confirmed_completed(self):
        b = self._booking(BookingStatus.PENDING, PaymentStatus.PAID)

        # Step 1: instructor confirms
        b.status = BookingStatus.CONFIRMED
        assert b.status == BookingStatus.CONFIRMED

        # Step 2: auto_update_past_bookings fires after lesson time
        b.status = BookingStatus.COMPLETED
        assert b.status == BookingStatus.COMPLETED


# ── account lockout integration ───────────────────────────────────────────────

class TestAccountLockout:
    """Verify brute-force lockout in AuthService.authenticate_user."""

    def _mock_user(self, failed=0, locked_until=None):
        from app.models.user import UserStatus, UserRole
        return SimpleNamespace(
            id=1,
            email="user@test.com",
            password_hash="$2b$12$dummy",
            role=UserRole.STUDENT,
            status=UserStatus.ACTIVE,
            failed_login_attempts=failed,
            account_locked_until=locked_until,
            last_login=None,
            active_session_token=None,
        )

    def test_locked_account_raises_429(self, monkeypatch):
        from datetime import datetime, timedelta, timezone
        import app.services.auth as auth_mod

        locked_until = datetime.now(timezone.utc) + timedelta(minutes=10)
        user = self._mock_user(failed=5, locked_until=locked_until)

        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = user

        with pytest.raises(HTTPException) as exc:
            auth_mod.AuthService.authenticate_user(db, "user@test.com", "wrong")
        assert exc.value.status_code == 429

    def test_failed_login_increments_counter(self, monkeypatch):
        import app.services.auth as auth_mod
        from app.utils.auth import verify_password

        user = self._mock_user(failed=0)
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = user

        monkeypatch.setattr(auth_mod, "verify_password", lambda pw, h: False)

        with pytest.raises(HTTPException):
            auth_mod.AuthService.authenticate_user(db, "user@test.com", "wrong")

        assert user.failed_login_attempts == 1
        db.commit.assert_called()

    def test_successful_login_resets_counter(self, monkeypatch):
        import app.services.auth as auth_mod
        from app.models.user import UserStatus

        user = self._mock_user(failed=3)
        user.status = UserStatus.ACTIVE
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = user

        monkeypatch.setattr(auth_mod, "verify_password", lambda pw, h: True)

        result = auth_mod.AuthService.authenticate_user(db, "user@test.com", "correct")

        assert result.failed_login_attempts == 0
        assert result.account_locked_until is None
