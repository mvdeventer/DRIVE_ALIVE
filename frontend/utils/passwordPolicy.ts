/**
 * Single source of truth for password rules and strength scoring.
 *
 * Before this existed the policy was copy-pasted into 9 screens and had drifted
 * badly: the first-admin Setup screen demanded 12 chars + 4 character classes
 * while its own hint text said "at least 8", and Create Admin accepted 6 with
 * no complexity at all — for the same privilege level. Student and instructor
 * registration had no backend minimum whatsoever.
 *
 * Strength scoring is a transparent entropy estimate with pattern penalties,
 * NOT zxcvbn. It is deliberately dependency-free, and it is a guide for the
 * user rather than a security control — the hard gate is `checkPassword`.
 */

/**
 * Minimum length, applied uniformly to every password field in the app.
 * Backend schemas are pinned to the same number (admin.py, user.py).
 */
export const PASSWORD_MIN_LENGTH = 8;

const SPECIALS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export interface PasswordRule {
  id: string;
  /** i18n key under `password.rule.` */
  labelKey: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', labelKey: 'password.rule.length', test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { id: 'upper', labelKey: 'password.rule.upper', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', labelKey: 'password.rule.lower', test: (p) => /[a-z]/.test(p) },
  { id: 'digit', labelKey: 'password.rule.digit', test: (p) => /\d/.test(p) },
  { id: 'special', labelKey: 'password.rule.special', test: (p) => SPECIALS.test(p) },
];

export interface PasswordCheck {
  ok: boolean;
  failed: PasswordRule[];
  passed: PasswordRule[];
}

/** The hard gate. Every password field should use this, not its own regexes. */
export function checkPassword(pw: string): PasswordCheck {
  const failed = PASSWORD_RULES.filter((r) => !r.test(pw));
  return { ok: failed.length === 0, failed, passed: PASSWORD_RULES.filter((r) => r.test(pw)) };
}

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * The single user-facing rejection message, so all 9 password screens word it
 * identically. Returns '' when the password passes.
 */
export function passwordErrorMessage(pw: string, t: Translate): string {
  const { ok, failed } = checkPassword(pw);
  if (ok) return '';
  return t('password.mustContain', { rules: failed.map((r) => t(r.labelKey)).join(', ') });
}

// ── Strength scoring ───────────────────────────────────────────

/** Passwords so common that length and character classes are irrelevant. */
const COMMON = new Set([
  'password', 'passw0rd', 'password1', 'qwerty', 'letmein', 'welcome', 'admin',
  'iloveyou', 'monkey', 'dragon', 'football', 'baseball', 'sunshine', 'princess',
  'abc123', '123456', '1234567890', 'qwertyuiop', 'zaq12wsx', 'trustno1',
  // locally plausible
  'southafrica', 'roadready', 'drivealive', 'johannesburg', 'capetown',
]);

const KEYBOARD_RUNS = [
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', 'abcdefghijklmnopqrstuvwxyz',
];

function poolSize(pw: string): number {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (SPECIALS.test(pw)) pool += 32;
  if (/\s/.test(pw)) pool += 1;
  // anything outside the above (accented, emoji) — treat conservatively
  if (/[^\x20-\x7E]/.test(pw)) pool += 100;
  return pool || 1;
}

/** Longest run of characters that appear consecutively on a keyboard/alphabet. */
function longestSequence(lower: string): number {
  let best = 0;
  for (const run of KEYBOARD_RUNS) {
    for (let i = 0; i < lower.length; i++) {
      for (let len = 3; i + len <= lower.length; len++) {
        const chunk = lower.slice(i, i + len);
        const rev = chunk.split('').reverse().join('');
        if (run.includes(chunk) || run.includes(rev)) best = Math.max(best, len);
        else break;
      }
    }
  }
  return best;
}

export type StrengthLevel = 'veryWeak' | 'weak' | 'fair' | 'strong' | 'excellent';

export interface PasswordStrength {
  /** 0–4, aligned to StrengthLevel order. */
  score: 0 | 1 | 2 | 3 | 4;
  level: StrengthLevel;
  /** i18n key under `password.strength.` */
  labelKey: string;
  /** Estimated entropy in bits AFTER pattern penalties. */
  bits: number;
  /** i18n keys for the main things dragging the score down. */
  penaltyKeys: string[];
}

const LEVELS: StrengthLevel[] = ['veryWeak', 'weak', 'fair', 'strong', 'excellent'];

/**
 * Estimate strength as effective entropy bits.
 *
 * Bands (bits, post-penalty): <28 very weak · <40 weak · <60 fair · <80 strong · >=80 excellent.
 * These follow the usual NIST-derived rules of thumb; treat them as guidance.
 */
export function passwordStrength(pw: string): PasswordStrength {
  if (!pw) {
    return { score: 0, level: 'veryWeak', labelKey: 'password.strength.veryWeak', bits: 0, penaltyKeys: [] };
  }

  const lower = pw.toLowerCase();
  const penaltyKeys: string[] = [];
  let bits = pw.length * Math.log2(poolSize(pw));

  // Common password (or common password + trivial suffix like "1!" / "2026")
  const stripped = lower.replace(/[^a-z]/g, '');
  if (COMMON.has(lower) || COMMON.has(stripped)) {
    bits = Math.min(bits, 12);
    penaltyKeys.push('password.penalty.common');
  }

  // Repeated characters ("aaaa", "!!!!")
  if (/(.)\1{2,}/.test(pw)) {
    bits -= 10;
    penaltyKeys.push('password.penalty.repeats');
  }

  // Keyboard or alphabet runs ("abcd", "qwerty", "4321")
  const seq = longestSequence(lower);
  if (seq >= 4) {
    bits -= seq * 3;
    penaltyKeys.push('password.penalty.sequence');
  }

  // A 4-digit year is a very common, very guessable component
  if (/(19|20)\d{2}/.test(pw)) {
    bits -= 8;
    penaltyKeys.push('password.penalty.year');
  }

  // The single most common human pattern: one capitalised word, some digits,
  // maybe one trailing symbol ("Summer2026!", "Cricket99#"). It satisfies every
  // complexity rule while being near the top of any real cracking dictionary,
  // so it must not be allowed to read as "strong".
  if (/^[A-Z][a-z]+\d{1,4}[^a-zA-Z0-9]?$/.test(pw)) {
    bits -= 22;
    penaltyKeys.push('password.penalty.predictablePattern');
  }

  // Low variety relative to length ("abababab")
  const unique = new Set(pw).size;
  if (pw.length >= 8 && unique <= pw.length / 3) {
    bits -= 12;
    penaltyKeys.push('password.penalty.lowVariety');
  }

  bits = Math.max(0, Math.round(bits));

  // A password that fails the hard rules can never read above "fair", so the
  // meter never tells someone their rejected password is "strong".
  const gate = checkPassword(pw);
  let score: PasswordStrength['score'] =
    bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
  if (!gate.ok && score > 2) score = 2;

  return { score, level: LEVELS[score], labelKey: `password.strength.${LEVELS[score]}`, bits, penaltyKeys };
}
