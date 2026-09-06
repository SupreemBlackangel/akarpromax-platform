import type { MatchProviderRow, MatchScoreResult } from "@services/match-score";

/**
 * Who a published request reaches, and how many times a requester may ask for
 * someone else.
 *
 * The rule, in the owner's words: a request goes to the three nearest
 * craftsmen in the trade. Each contacts the requester and quotes. If none of
 * them is agreed with, the requester may ask for three others — and may do
 * that twice, so nine craftsmen at most. A requester who exhausts all nine
 * without accepting anyone is not shopping, and is barred from opening a new
 * request for a while.
 *
 * The pure parts live here so they can be tested without a database: choosing
 * a wave, deciding whether one may be renewed, and what happens when the
 * renewals run out. lib/services/matching.ts does the reading and writing.
 */

/** How the requester wants the three chosen. "nearest" is the rule as stated. */
export type ProviderSort = "nearest" | "rating" | "trust";

export const PROVIDER_SORTS: ProviderSort[] = ["nearest", "rating", "trust"];

export const DEFAULT_PROVIDER_SORT: ProviderSort = "nearest";

export function isProviderSort(value: unknown): value is ProviderSort {
  return typeof value === "string" && (PROVIDER_SORTS as string[]).includes(value);
}

/** The knobs an admin edits per country; these are the owner's numbers. */
export type WaveSettings = {
  /** Craftsmen notified per wave. */
  waveSize: number;
  /** How many times a requester may ask for others. Three waves in total. */
  maxRenewals: number;
  /** How long a requester is barred after exhausting every wave. */
  blockDays: number;
  /** After this long with no answer, an offer is treated as expired. */
  offerValidityHours: number;
};

export const DEFAULT_WAVE_SETTINGS: WaveSettings = {
  waveSize: 3,
  maxRenewals: 2,
  blockDays: 30,
  offerValidityHours: 48,
};

/** A candidate, with the score already computed for it. */
export type ScoredCandidate = {
  provider: MatchProviderRow;
  result: MatchScoreResult;
};

/**
 * The next wave: the closest `waveSize` candidates that no earlier wave has
 * already reached.
 *
 * `nearest` is the rule and the default. The other two orderings exist because
 * a requester may care more about who is good than who is close; each still
 * breaks its ties on distance, so "nearest" never stops being the fallback
 * answer. A candidate with no distance (one side has no coordinates) sorts
 * last rather than first — an unknown distance is not a short one.
 */
export function selectWave(
  candidates: ScoredCandidate[],
  options: { sort?: ProviderSort; waveSize: number; alreadyNotified?: ReadonlySet<string> },
): ScoredCandidate[] {
  const skip = options.alreadyNotified ?? new Set<string>();
  const pool = candidates.filter((candidate) => !skip.has(candidate.provider.id));
  const sort = options.sort ?? DEFAULT_PROVIDER_SORT;

  const distance = (candidate: ScoredCandidate) =>
    candidate.result.distanceKm == null ? Number.POSITIVE_INFINITY : candidate.result.distanceKm;
  const rating = (candidate: ScoredCandidate) => Number(candidate.provider.rating_avg ?? 0);
  const ratings = (candidate: ScoredCandidate) => Number(candidate.provider.rating_count ?? 0);
  /** Trust is what the provider has actually delivered, not what they say. */
  const trust = (candidate: ScoredCandidate) =>
    Number(candidate.provider.completion_rate ?? 0) + Number(candidate.provider.response_rate ?? 0);

  const ordered = [...pool].sort((a, b) => {
    if (sort === "rating") {
      const byRating = rating(b) - rating(a);
      if (byRating !== 0) return byRating;
      const byCount = ratings(b) - ratings(a);
      if (byCount !== 0) return byCount;
    } else if (sort === "trust") {
      const byTrust = trust(b) - trust(a);
      if (byTrust !== 0) return byTrust;
      const byRating = rating(b) - rating(a);
      if (byRating !== 0) return byRating;
    }
    const byDistance = distance(a) - distance(b);
    if (byDistance !== 0) return byDistance;
    // A stable last resort, so the same request picks the same three twice.
    return a.provider.id < b.provider.id ? -1 : a.provider.id > b.provider.id ? 1 : 0;
  });

  return ordered.slice(0, Math.max(1, options.waveSize));
}

/** What one provider did with the request they were sent. */
export type WaveMemberState = "waiting" | "declined" | "offered" | "expired";

export type RenewalDecision =
  | { ok: true; nextWave: number }
  | { ok: false; reason: "WAVE_STILL_OPEN" | "OFFER_ON_TABLE" | "RENEWALS_EXHAUSTED"; blockDays?: number };

/**
 * May this request reach three others?
 *
 * Only when the current three are finished with it — every one of them has
 * declined, or their offer has gone stale. A wave is not replaced while
 * someone is still deciding, and it is never replaced while an offer is
 * sitting on the table: the answer to an offer you dislike is to decline it,
 * not to quietly ask for more people while the craftsman waits.
 */
export function canRenew(
  members: WaveMemberState[],
  renewalCount: number,
  settings: WaveSettings = DEFAULT_WAVE_SETTINGS,
): RenewalDecision {
  if (members.some((state) => state === "offered")) {
    return { ok: false, reason: "OFFER_ON_TABLE" };
  }
  if (members.some((state) => state === "waiting")) {
    return { ok: false, reason: "WAVE_STILL_OPEN" };
  }
  if (renewalCount >= settings.maxRenewals) {
    return { ok: false, reason: "RENEWALS_EXHAUSTED", blockDays: settings.blockDays };
  }
  return { ok: true, nextWave: renewalCount + 2 };
}

/** When a block that starts now should end. */
export function blockedUntil(from: Date, settings: WaveSettings = DEFAULT_WAVE_SETTINGS): Date {
  const until = new Date(from.getTime());
  until.setUTCDate(until.getUTCDate() + Math.max(1, settings.blockDays));
  return until;
}

/** Whether a block row still bites. A block that has run out is simply over. */
export function isBlockActive(blockedUntilValue: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!blockedUntilValue) return false;
  const until = blockedUntilValue instanceof Date ? blockedUntilValue : new Date(String(blockedUntilValue).replace(" ", "T") + "Z");
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() > now.getTime();
}

/** How many craftsmen this request may still reach in total. */
export function totalReach(settings: WaveSettings = DEFAULT_WAVE_SETTINGS): number {
  return settings.waveSize * (settings.maxRenewals + 1);
}
