/**
 * Canonical email identity normalization (L1B).
 *
 * AkarProMax has ONE canonical human identity, and the email address is its
 * primary handle. `User@Example.com` and `user@example.com` are the SAME
 * human. Every identity-bearing path (register, login, verification resend,
 * forgot-password, OAuth linking) must normalize through this single helper —
 * never through ad-hoc `.toLowerCase()` calls scattered per route.
 *
 * POLICY (deliberately conservative):
 *  - trim surrounding whitespace
 *  - lowercase the whole address
 *  - nothing else. No provider-specific tricks: Gmail dots are NOT stripped,
 *    plus-aliases are NOT collapsed. `a.b+c@gmail.com` stays exactly that.
 *
 * The database enforces the same rule race-safely via a unique index on
 * lower(email) (forward migration 0001) — the application check is a
 * convenience, the index is the truth.
 *
 * Note: lib/security/rate-limit.ts has its own normalizeEmail() used for
 * RATE-LIMIT KEYS. That one stays where it is (limiter keys are not identity),
 * but both apply the same trim+lowercase so keys and identity agree.
 */

const MAX_EMAIL_LENGTH = 255;

/**
 * Normalizes an email address to its canonical identity form.
 * Returns "" for non-strings and blank input — callers treat "" as absent.
 */
export function normalizeEmailIdentity(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_EMAIL_LENGTH).toLowerCase();
}

/** True when two inputs address the same canonical email identity. */
export function isSameEmailIdentity(a: unknown, b: unknown): boolean {
  const left = normalizeEmailIdentity(a);
  const right = normalizeEmailIdentity(b);
  return left !== "" && left === right;
}
