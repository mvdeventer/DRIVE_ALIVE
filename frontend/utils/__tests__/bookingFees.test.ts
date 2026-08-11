/**
 * Student-facing pricing.
 *
 * The client no longer reproduces the backend's fee formula. It renders the
 * one server-computed price, so these tests are mostly about not leaking a
 * split and not inventing a number when the field is missing.
 */
import { studentHourlyRate, studentLessonPrice } from '../bookingFees';

describe('studentHourlyRate', () => {
  it('uses the server-computed price, which already includes any school markup', () => {
    expect(studentHourlyRate({ display_hourly_rate: 420, hourly_rate: 350 })).toBe(420);
  });

  it('falls back to the instructor rate when the server sent no display price', () => {
    expect(studentHourlyRate({ hourly_rate: 350 })).toBe(350);
  });

  it('is zero rather than NaN when neither field is present', () => {
    expect(studentHourlyRate({})).toBe(0);
  });
});

describe('studentLessonPrice', () => {
  it('scales the display price by duration', () => {
    const instructor = { display_hourly_rate: 420, hourly_rate: 350 };
    expect(studentLessonPrice(instructor, 60)).toBe(420);
    expect(studentLessonPrice(instructor, 120)).toBe(840);
    expect(studentLessonPrice(instructor, 30)).toBe(210);
  });

  it('never adds a fee on top of the displayed price', () => {
    // The regression this file exists to prevent: the student sees exactly
    // what the server said, with no client-side surcharge.
    const instructor = { display_hourly_rate: 420 };
    expect(studentLessonPrice(instructor, 60)).toBe(420);
  });

  it('rounds to cents', () => {
    expect(studentLessonPrice({ display_hourly_rate: 333.333 }, 60)).toBe(333.33);
  });

  it('handles a missing duration without producing NaN', () => {
    expect(studentLessonPrice({ display_hourly_rate: 420 }, 0)).toBe(0);
  });
});
