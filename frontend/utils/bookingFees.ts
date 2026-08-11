/**
 * Student-facing lesson pricing.
 *
 * The server sends one number — `display_hourly_rate` — already inclusive of
 * the instructor's school markup. The client only scales it by duration.
 *
 * This file used to mirror the backend's fee formula so a price could be shown
 * before checkout. That is gone deliberately: reproducing it here meant the
 * API had to hand every student `booking_fee` and `platform_commission_percent`,
 * which let anyone reconstruct the school's margin and the platform's cut.
 * Pricing now lives only in backend/app/services/fees.py.
 */

export interface StudentPriceSource {
  /** Server-computed price per hour, markup included. */
  display_hourly_rate?: number;
  /** The instructor's own rate. Fallback only — schools may add a markup. */
  hourly_rate?: number;
}

/** Price per hour to show a student. */
export function studentHourlyRate(instructor: StudentPriceSource): number {
  return instructor.display_hourly_rate ?? instructor.hourly_rate ?? 0;
}

/** Price of a lesson of `durationMinutes`, as the student will be charged. */
export function studentLessonPrice(
  instructor: StudentPriceSource,
  durationMinutes: number
): number {
  const price = studentHourlyRate(instructor) * ((durationMinutes || 0) / 60);
  return Math.round(price * 100) / 100;
}
