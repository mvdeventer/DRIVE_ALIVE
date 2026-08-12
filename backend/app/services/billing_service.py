"""Accruing and reporting what schools owe the platform."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models.company import Company
from ..models.company_charge import (
    ChargeStatus,
    CompanyPlatformCharge,
    CompanySubscriptionCharge,
    period_key_for,
)
from ..models.user import Instructor


def record_platform_charge(
    db: Session,
    *,
    company_id: Optional[int],
    booking_id: int,
    basis_amount: float,
    commission_percent: float,
    charge_amount: float,
) -> Optional[CompanyPlatformCharge]:
    """Accrue commission for one booking. Does not commit.

    Returns ``None`` when there is nothing to bill — an independent
    instructor, a school-sourced booking, or the platform's own school. A
    zero-value row would only add noise to statements.

    Safe to call twice for the same booking: the unique constraint on
    ``booking_id`` makes the second attempt a no-op rather than a double bill.
    """
    if company_id is None or charge_amount <= 0:
        return None

    existing = (
        db.query(CompanyPlatformCharge)
        .filter(CompanyPlatformCharge.booking_id == booking_id)
        .first()
    )
    if existing is not None:
        return existing

    charge = CompanyPlatformCharge(
        company_id=company_id,
        booking_id=booking_id,
        basis_amount=round(basis_amount, 2),
        commission_percent=commission_percent,
        charge_amount=round(charge_amount, 2),
        status=ChargeStatus.ACCRUED.value,
        period_key=period_key_for(),
    )
    db.add(charge)
    try:
        db.flush()
    except IntegrityError:
        # Lost a race with a concurrent write of the same booking; theirs
        # stands. Only this insert is rolled back, not the caller's work.
        db.rollback()
        return (
            db.query(CompanyPlatformCharge)
            .filter(CompanyPlatformCharge.booking_id == booking_id)
            .first()
        )
    return charge


def accrue_subscription(
    db: Session,
    company: Company,
    *,
    period: Optional[str] = None,
) -> Optional[CompanySubscriptionCharge]:
    """Bill a school for this month's instructor seats. Commits.

    Idempotent per school per month: re-running it updates the existing line
    rather than adding a second one, so a mid-month change in headcount is
    reflected without double billing.
    """
    if company.is_platform_host:
        return None

    price = company.subscription_price_per_instructor
    if not price:
        return None

    period = period or period_key_for()
    count = (
        db.query(func.count(Instructor.id))
        .filter(Instructor.company_id == company.id)
        .scalar()
    ) or 0

    charge = (
        db.query(CompanySubscriptionCharge)
        .filter(
            CompanySubscriptionCharge.company_id == company.id,
            CompanySubscriptionCharge.period_key == period,
        )
        .first()
    )
    amount = round(count * float(price), 2)

    if charge is None:
        charge = CompanySubscriptionCharge(
            company_id=company.id,
            period_key=period,
            instructor_count=count,
            price_per_instructor=float(price),
            charge_amount=amount,
            status=ChargeStatus.ACCRUED.value,
        )
        db.add(charge)
    elif charge.status == ChargeStatus.ACCRUED.value:
        # Still open, so keep it in step with the current headcount. A line
        # already invoiced or settled is history and is left alone.
        charge.instructor_count = count
        charge.price_per_instructor = float(price)
        charge.charge_amount = amount

    db.commit()
    db.refresh(charge)
    return charge


def void_platform_charge(
    db: Session,
    *,
    booking_id: int,
    reason: str,
) -> Optional[CompanyPlatformCharge]:
    """Withdraw the commission on a booking that is not going to happen.

    Commission is a share of what a lesson earned. A cancelled lesson earns
    nothing, so charging for it bills a school for business it never did —
    and because cancelling issues the learner a credit rather than a refund,
    the rebooking accrues a second charge. Without this the school pays twice
    for one lesson, and pays at all when its own instructor called off.

    Reversed, not deleted: the row is the evidence that a charge was raised
    and withdrawn. Does not commit — the caller owns the cancellation
    transaction, so the reversal cannot survive a cancellation that fails.

    Returns the charge if one was reversed, None if there was nothing to
    reverse (no commission, or already reversed).
    """
    charge = (
        db.query(CompanyPlatformCharge)
        .filter(CompanyPlatformCharge.booking_id == booking_id)
        .first()
    )
    if charge is None or charge.status == ChargeStatus.REVERSED.value:
        return None

    already_collected = charge.status == ChargeStatus.SETTLED.value

    charge.status = ChargeStatus.REVERSED.value
    charge.reversed_at = datetime.now(timezone.utc)
    charge.reversal_reason = (
        # Flagged in the text rather than silently: the platform has the money
        # and owes it back, which no automatic process here can do.
        f"{reason} (already settled — credit owed)" if already_collected else reason
    )[:200]
    return charge


def company_statement(db: Session, company: Company, *, period: Optional[str] = None) -> dict:
    """What one school owes for a period, and where it came from."""
    period = period or period_key_for()

    commission_rows = (
        db.query(CompanyPlatformCharge)
        .filter(
            CompanyPlatformCharge.company_id == company.id,
            CompanyPlatformCharge.period_key == period,
            # A withdrawn charge is not owed. It stays in the table as a
            # record; it must not stay in the total.
            CompanyPlatformCharge.status != ChargeStatus.REVERSED.value,
        )
        .all()
    )
    subscription = (
        db.query(CompanySubscriptionCharge)
        .filter(
            CompanySubscriptionCharge.company_id == company.id,
            CompanySubscriptionCharge.period_key == period,
        )
        .first()
    )

    commission_total = round(sum(row.charge_amount for row in commission_rows), 2)
    subscription_total = round(subscription.charge_amount if subscription else 0.0, 2)

    return {
        "company_id": company.id,
        "company_name": company.name,
        "period": period,
        "commission": {
            "booking_count": len(commission_rows),
            "gross_billed_on": round(sum(row.basis_amount for row in commission_rows), 2),
            "total": commission_total,
        },
        "subscription": {
            "instructor_count": subscription.instructor_count if subscription else 0,
            "price_per_instructor": (
                subscription.price_per_instructor if subscription else 0.0
            ),
            "total": subscription_total,
        },
        "total_due": round(commission_total + subscription_total, 2),
        "currency": "ZAR",
    }


def platform_revenue(db: Session, *, period: Optional[str] = None) -> dict:
    """What the platform earned in a period, broken down by school.

    This is actual platform revenue — commission plus subscriptions — not the
    gross lesson volume that the admin revenue screens have historically
    reported.
    """
    period = period or period_key_for()

    commission_by_company = dict(
        db.query(
            CompanyPlatformCharge.company_id,
            func.coalesce(func.sum(CompanyPlatformCharge.charge_amount), 0.0),
        )
        .filter(
            CompanyPlatformCharge.period_key == period,
            CompanyPlatformCharge.status != ChargeStatus.REVERSED.value,
        )
        .group_by(CompanyPlatformCharge.company_id)
        .all()
    )
    subscription_by_company = dict(
        db.query(
            CompanySubscriptionCharge.company_id,
            func.coalesce(func.sum(CompanySubscriptionCharge.charge_amount), 0.0),
        )
        .filter(CompanySubscriptionCharge.period_key == period)
        .group_by(CompanySubscriptionCharge.company_id)
        .all()
    )

    rows = []
    for company_id in set(commission_by_company) | set(subscription_by_company):
        company = db.query(Company).filter(Company.id == company_id).first()
        commission = round(float(commission_by_company.get(company_id, 0.0)), 2)
        subscription = round(float(subscription_by_company.get(company_id, 0.0)), 2)
        rows.append(
            {
                "company_id": company_id,
                "company_name": company.name if company else None,
                "commission": commission,
                "subscription": subscription,
                "total": round(commission + subscription, 2),
            }
        )
    rows.sort(key=lambda row: row["total"], reverse=True)

    return {
        "period": period,
        "commission_total": round(sum(row["commission"] for row in rows), 2),
        "subscription_total": round(sum(row["subscription"] for row in rows), 2),
        "total": round(sum(row["total"] for row in rows), 2),
        "currency": "ZAR",
        "companies": rows,
    }


def mark_settled(
    db: Session,
    charge: CompanyPlatformCharge | CompanySubscriptionCharge,
    reference: str,
) -> None:
    """Record that a charge has been paid. Does not commit."""
    charge.status = ChargeStatus.SETTLED.value
    charge.settled_at = datetime.now(timezone.utc)
    charge.settlement_reference = reference
