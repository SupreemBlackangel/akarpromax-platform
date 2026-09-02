import type { ParsedAd } from "@/lib/ads/types";
import type { PlacementSpecificity } from "@/lib/ads/eligibility";

/**
 * Chooses which eligible campaign actually serves.
 *
 * Selection used to be a single additive score with a ±50 "band": everything
 * within 50 points of the best competed together. Two consequences fell out of
 * that arithmetic, and both are fixed here.
 *
 * 1. `priority * 10` sat in the same score as the targeting points, so a
 *    priority gap of 5 (= 50 points) exactly equalled the band and a gap of 6
 *    excluded a campaign outright. Priority behaved as a hard cliff, and
 *    `weight` — the field that is supposed to divide traffic — rarely got to
 *    matter at all. Priority is now a *tier*: the highest priority present
 *    wins outright, and weight divides traffic among that tier.
 *
 * 2. Placement specificity was worth only 50 points, so an untargeted campaign
 *    tied with a page-specific one. Specificity is now the outermost tier, so
 *    a campaign that named this exact placement always beats one that named
 *    the canonical slot, which always beats one that named nothing.
 *
 * Order: specificity tier -> priority tier -> weighted random by `weight`.
 */

export type SelectionCandidate = {
  ad: ParsedAd;
  specificity: PlacementSpecificity;
  relevance: number;
};

/** Injectable so tests can make rotation deterministic. */
export type RandomSource = () => number;

function bestTier<T>(items: T[], rank: (item: T) => number): T[] {
  if (items.length === 0) return [];
  let best = Infinity;
  for (const item of items) {
    const value = rank(item);
    if (value < best) best = value;
  }
  return items.filter((item) => rank(item) === best);
}

/**
 * Weighted random pick. A weight of 0 means "never serve while a weighted
 * sibling exists"; if every candidate is 0 the pick is uniform, so a
 * misconfigured set still serves something rather than nothing.
 */
export function pickWeighted(candidates: SelectionCandidate[], random: RandomSource = Math.random): SelectionCandidate | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const total = candidates.reduce((sum, candidate) => sum + Math.max(0, candidate.ad.weight), 0);
  if (total <= 0) return candidates[Math.floor(random() * candidates.length)] ?? candidates[0];

  let target = random() * total;
  for (const candidate of candidates) {
    target -= Math.max(0, candidate.ad.weight);
    if (target < 0) return candidate;
  }
  return candidates[candidates.length - 1];
}

/**
 * Narrow a pool to the campaigns that genuinely compete for this impression:
 * the most specific placement tier present, then the highest priority within
 * it, then the most relevant. Exposed separately so the admin preview can show
 * *why* a campaign won without duplicating the logic.
 */
export function competingSet(candidates: SelectionCandidate[]): SelectionCandidate[] {
  const bySpecificity = bestTier(candidates, (candidate) => candidate.specificity);
  const byPriority = bestTier(bySpecificity, (candidate) => -candidate.ad.priority);
  return bestTier(byPriority, (candidate) => -candidate.relevance);
}

export function selectCampaign(
  candidates: SelectionCandidate[],
  used: Set<string>,
  random: RandomSource = Math.random,
): SelectionCandidate | null {
  const available = candidates.filter((candidate) => !used.has(candidate.ad.id));
  if (available.length === 0) return null;
  return pickWeighted(competingSet(available), random);
}
