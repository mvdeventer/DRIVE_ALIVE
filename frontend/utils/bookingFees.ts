/**
 * Platform booking-fee calculation (hybrid commission model).
 *
 * Mirrors backend/app/services/fees.py — the backend is the source of truth
 * at payment time; this helper exists so prices shown before checkout match
 * what the server will charge.
 *
 * Effective fee per booking = max(instructor flat fee, lesson amount * commission%)
 */

export const DEFAULT_BOOKING_FEE = 20.0; // ZAR
export const DEFAULT_COMMISSION_PERCENT = 8.0; // % of lesson amount

export interface FeeSource {
  booking_fee?: number;
  platform_commission_percent?: number;
}

/** Effective platform fee for a single booking. */
export function calculateBookingFee(instructor: FeeSource, lessonAmount: number): number {
  const flatFee = instructor.booking_fee ?? DEFAULT_BOOKING_FEE;
  const percent = instructor.platform_commission_percent ?? DEFAULT_COMMISSION_PERCENT;
  const commission = lessonAmount * (percent / 100);
  return Math.round(Math.max(flatFee, commission) * 100) / 100;
}

/** Lesson price + platform fee for a lesson of `durationMinutes` at `hourlyRate`. */
export function lessonTotalWithFee(
  instructor: FeeSource & { hourly_rate: number },
  durationMinutes: number
): number {
  const lessonAmount = (instructor.hourly_rate || 0) * (durationMinutes / 60);
  return lessonAmount + calculateBookingFee(instructor, lessonAmount);
}
