/**
 * Contract tests for the password policy.
 *
 * These assert the behaviour the module's own documentation promises, so a
 * future tweak to the scoring cannot silently tell a user that a dictionary
 * password is "strong".
 */

// Imported explicitly rather than relying on the ambient globals: Cypress is
// also in this project and its chai `expect` shadows Jest's in the TS types,
// which is why the older suites here carry `Property 'toBe' does not exist`
// errors. Importing from @jest/globals gives this file correct types and keeps
// it out of the typecheck baseline.
import { describe, expect, it } from '@jest/globals';

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  checkPassword,
  passwordErrorMessage,
  passwordStrength,
} from '../passwordPolicy';

// Stand-in for the i18n translate function: echoes the key so assertions can
// look for the key rather than depending on en.ts wording.
const t = (key: string, vars?: Record<string, string | number>) =>
  vars ? `${key}(${JSON.stringify(vars)})` : key;

describe('checkPassword — the hard gate', () => {
  it('accepts a password meeting every rule', () => {
    const result = checkPassword('Str0ng&Passphrase');
    expect(result.ok).toBe(true);
    expect(result.failed).toHaveLength(0);
    expect(result.passed).toHaveLength(PASSWORD_RULES.length);
  });

  it('rejects an empty password and reports every rule as failed', () => {
    const result = checkPassword('');
    expect(result.ok).toBe(false);
    expect(result.failed).toHaveLength(PASSWORD_RULES.length);
  });

  it.each([
    ['Sh0rt!a', 'length', PASSWORD_MIN_LENGTH - 1],
    ['alllower1!', 'upper', 10],
    ['ALLUPPER1!', 'lower', 10],
    ['NoDigitsHere!', 'digit', 13],
    ['NoSpecials123', 'special', 13],
  ])('rejects %s for the %s rule', (pw, ruleId, expectedLength) => {
    expect(pw).toHaveLength(expectedLength);
    const result = checkPassword(pw);
    expect(result.ok).toBe(false);
    expect(result.failed.map((r) => r.id)).toContain(ruleId);
  });

  it('enforces exactly PASSWORD_MIN_LENGTH, not one less', () => {
    const atLimit = 'Aa1!' + 'x'.repeat(PASSWORD_MIN_LENGTH - 4);
    const belowLimit = atLimit.slice(0, -1);
    expect(checkPassword(atLimit).failed.map((r) => r.id)).not.toContain('length');
    expect(checkPassword(belowLimit).failed.map((r) => r.id)).toContain('length');
  });
});

describe('passwordErrorMessage', () => {
  it('is empty for a passing password', () => {
    expect(passwordErrorMessage('Str0ng&Passphrase', t)).toBe('');
  });

  it('names the failing rules for a rejected password', () => {
    const message = passwordErrorMessage('alllowercase', t);
    expect(message).toContain('password.mustContain');
    expect(message).toContain('password.rule.upper');
    expect(message).toContain('password.rule.digit');
    expect(message).toContain('password.rule.special');
    // Rules that passed must not be listed as reasons for rejection.
    expect(message).not.toContain('password.rule.lower');
  });
});

describe('passwordStrength — the safety rating', () => {
  it('scores an empty password as zero with no penalties', () => {
    const s = passwordStrength('');
    expect(s).toMatchObject({ score: 0, level: 'veryWeak', bits: 0, penaltyKeys: [] });
  });

  it('rates a long random-ish passphrase as excellent', () => {
    const s = passwordStrength('7Kq#zR2m@Wp5!vXn&Lt8');
    expect(s.score).toBe(4);
    expect(s.level).toBe('excellent');
    expect(s.bits).toBeGreaterThanOrEqual(80);
  });

  it('exposes a labelKey matching its level', () => {
    const s = passwordStrength('7Kq#zR2m@Wp5!vXn&Lt8');
    expect(s.labelKey).toBe(`password.strength.${s.level}`);
  });

  describe('penalties', () => {
    it('flags a common password regardless of its length', () => {
      const s = passwordStrength('password');
      expect(s.penaltyKeys).toContain('password.penalty.common');
      expect(s.score).toBe(0);
    });

    it('flags a common word even when punctuation is mixed in', () => {
      // `stripped` removes non-letters before the dictionary lookup.
      const s = passwordStrength('p-a-s-s-w-o-r-d');
      expect(s.penaltyKeys).toContain('password.penalty.common');
    });

    it('flags repeated characters', () => {
      expect(passwordStrength('Aaaa1234!x').penaltyKeys).toContain('password.penalty.repeats');
    });

    it('flags keyboard and alphabet runs', () => {
      expect(passwordStrength('Qwerty!9xz').penaltyKeys).toContain('password.penalty.sequence');
    });

    it('flags an embedded year', () => {
      expect(passwordStrength('Tr0ub4dour&1998').penaltyKeys).toContain('password.penalty.year');
    });

    it('flags low character variety', () => {
      expect(passwordStrength('Ab!Ab!Ab!Ab!').penaltyKeys).toContain('password.penalty.lowVariety');
    });
  });

  describe('the invariants that matter', () => {
    // The module's stated reason for existing: this shape satisfies every
    // complexity rule but sits near the top of real cracking dictionaries.
    it.each(['Summer2026!', 'Cricket99#', 'Johannes12!'])(
      'never rates the predictable Word+digits+symbol pattern %s above fair',
      (pw) => {
        const s = passwordStrength(pw);
        expect(checkPassword(pw).ok).toBe(true); // it does pass the hard gate
        expect(s.penaltyKeys).toContain('password.penalty.predictablePattern');
        expect(s.score).toBeLessThanOrEqual(2);
      }
    );

    it('never rates a password that fails the hard gate above fair', () => {
      // Long and high-entropy, but no uppercase and no digit — so it is rejected.
      const pw = 'zqx#mvw@ptr!kdb$fjn%hcs^';
      expect(checkPassword(pw).ok).toBe(false);
      expect(passwordStrength(pw).score).toBeLessThanOrEqual(2);
    });

    it('never returns a negative bit count', () => {
      // Stacks several penalties at once.
      expect(passwordStrength('aaaa1234').bits).toBeGreaterThanOrEqual(0);
    });

    it('keeps score and level in step', () => {
      const order = ['veryWeak', 'weak', 'fair', 'strong', 'excellent'];
      for (const pw of ['', 'abc', 'password', 'Summer2026!', 'Aa1!aaaa', '7Kq#zR2m@Wp5!vXn&Lt8']) {
        const s = passwordStrength(pw);
        expect(order[s.score]).toBe(s.level);
      }
    });

    it('is monotonic when the same character class is simply extended', () => {
      const short = passwordStrength('7Kq#zR2m').bits;
      const long = passwordStrength('7Kq#zR2m@Wp5!vXn').bits;
      expect(long).toBeGreaterThan(short);
    });
  });
});
