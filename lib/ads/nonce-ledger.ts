/**
 * Single-use ledger for tracking tokens.
 *
 * A tracking token was replayable for its whole 24-hour life. Anyone who
 * loaded a page held a validly signed token and could POST /api/ads/impression
 * with it in a loop; each accepted call inserts an impression row, increments
 * total_impressions and accrues CPM spend, so a script could exhaust a rival's
 * daily budget in seconds or manufacture an invoice against an advertiser. The
 * signature proved the token was *minted* by us; nothing proved it had not
 * already been spent.
 *
 * Every token now carries a random nonce, and a nonce may be spent once per
 * event kind — the same token legitimately backs one impression and one click,
 * so the ledger is keyed by "<kind>:<nonce>" rather than by nonce alone.
 *
 * This also closes the phantom-event hole from the audit: a React remount,
 * StrictMode's double effect, a hydration replay or a retried request all send
 * the *same* nonce, so only the first is counted. Deduplication no longer
 * depends on the client behaving.
 *
 * Storage is per-process and in-memory, matching the auth rate limiter. That
 * is sufficient for the single pm2 instance this runs on: a restart forgets
 * spent nonces, which at worst re-admits tokens minted before the restart, and
 * multiple instances would each keep their own view. Promoting this to a
 * unique index on the tracking tables is a database migration and belongs with
 * the rest of them.
 */

const TTL_MS = 24 * 60 * 60 * 1000;
// Bounded so a flood cannot grow the heap without limit. At the cap the oldest
// entries are dropped first, which is also the safest thing to lose: an old
// nonce's token is close to expiry anyway.
const MAX_ENTRIES = 200_000;

export type TrackedEvent = "impression" | "click" | "conversion";

// Insertion-ordered, so the first keys are the oldest.
const spent = new Map<string, number>();

function sweep(now: number) {
  for (const [key, expiresAt] of spent) {
    if (expiresAt > now) break; // insertion order: everything after is newer
    spent.delete(key);
  }
  while (spent.size > MAX_ENTRIES) {
    const oldest = spent.keys().next();
    if (oldest.done) break;
    spent.delete(oldest.value);
  }
}

/**
 * Claim a nonce for one event. Returns false if it was already spent, in which
 * case the caller must not record anything.
 *
 * A token with no nonce (minted before this existed, still inside its 24h life)
 * is admitted rather than rejected, so deploying this does not blank tracking
 * for every page already open in a browser.
 */
export function claimNonce(kind: TrackedEvent, nonce: string | undefined, now = Date.now()): boolean {
  if (!nonce) return true;
  sweep(now);
  const key = `${kind}:${nonce}`;
  if (spent.has(key)) return false;
  spent.set(key, now + TTL_MS);
  return true;
}

export function resetNonceLedgerForTests(): void {
  spent.clear();
}

export function nonceLedgerSize(): number {
  return spent.size;
}
