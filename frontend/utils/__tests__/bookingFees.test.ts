/**
 * Hybrid commission fee helper — must mirror backend/app/services/fees.py
 */
import {
  DEFAULT_BOOKING_FEE,
  calculateBookingFee,
  lessonTotalWithFee,
} from '../bookingFees';

describe('calculateBookingFee', () => {
  it('uses the flat fee for cheap lessons', () => {
    // R250 at 8% = R20 commission, ties with flat R20
    expect(calculateBookingFee({ booking_fee: 20, platform_commission_percent: 8 }, 250)).toBe(20);
    expect(calculateBookingFee({ booking_fee: 20, platform_commission_percent: 8 }, 100)).toBe(20);
  });

  it('uses the commission for expensive lessons', () => {
    expect(calculateBookingFee({ booking_fee: 20, platform_commission_percent: 8 }, 500)).toBe(40);
    expect(calculateBookingFee({ booking_fee: 20, platform_commission_percent: 8 }, 700)).toBe(56);
  });

  it('falls back to defaults when fields are missing', () => {
    // No flat fee, no percent: max(R20 default, 8% of 100 = R8) = R20
    expect(calculateBookingFee({}, 100)).toBe(DEFAULT_BOOKING_FEE);
  });

  it('respects a higher admin-set flat fee', () => {
    expect(calculateBookingFee({ booking_fee: 50, platform_commission_percent: 8 }, 450)).toBe(50);
  });

  it('rounds to cents', () => {
    expect(calculateBookingFee({ booking_fee: 20, platform_commission_percent: 8 }, 333)).toBe(26.64);
  });
});

describe('lessonTotalWithFee', () => {
  it('adds lesson price and fee for the duration', () => {
    const instructor = { hourly_rate: 400, booking_fee: 20, platform_commission_percent: 8 };
    // 60 min: lesson R400, fee max(20, 32) = 32
    expect(lessonTotalWithFee(instructor, 60)).toBe(432);
    // 30 min: lesson R200, fee max(20, 16) = 20
    expect(lessonTotalWithFee(instructor, 30)).toBe(220);
  });
});
