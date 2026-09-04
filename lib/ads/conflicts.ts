import type { ParsedAd } from "@/lib/ads/types";

/**
 * Campaign conflict detection.
 *
 * Selection resolves by tiers -- placement specificity first, then priority,
 * then weight within the winning tier. That is correct, but it has a quiet
 * failure mode for whoever configures the campaigns: a campaign can be active,
 * approved, funded and correctly targeted, appear perfectly healthy in the
 * list, and still never be seen, because another campaign outranks it on every
 * impression it could have won. Nothing in the UI said so.
 *
 * These checks read the campaign set the way the selection engine does and
 * report the cases an operator can act on. They are warnings, never automatic
 * changes: which campaign should win is a commercial decision, not a technical
 * one.
 */

export type ConflictSeverity = "blocked" | "warning";

export type CampaignConflict = {
  type: "starved_by_priority" | "duplicate_targeting" | "zero_weight" | "unreachable_placement";
  severity: ConflictSeverity;
  placement: string;
  campaignIds: string[];
  message: { ar: string; en: string };
};

function placementsOf(ad: ParsedAd): string[] {
  return ad.placements.length > 0 ? ad.placements : ["*"];
}

function label(ad: ParsedAd): string {
  return ad.internalName || ad.advertiserName || ad.id;
}

/**
 * Does `winner` serve everywhere `loser` could?
 *
 * Grouping by placement alone was wrong in two directions, and seeding the
 * location catalogue for 22 countries made both of them common:
 *
 *   - A Cairo campaign and a Riyadh campaign on the same placement were
 *     reported as "Cairo will never appear", at severity "blocked". They never
 *     compete for a single impression. A panel full of false alarms teaches an
 *     operator to stop reading it, and the genuine case then hides among them.
 *
 *   - A Saudi-wide campaign outranked by a Jeddah campaign was reported as
 *     starved. It is not: it serves everywhere in Saudi Arabia except Jeddah.
 *
 * A campaign is genuinely starved only when every context it could match is
 * also matched by something that outranks it -- that is, when its targeting is
 * a SUBSET of the winner's. Targeting nothing on a dimension means everything,
 * so an empty list (or the matching "target all" flag) covers any list.
 */
function covers(winner: ParsedAd, loser: ParsedAd): boolean {
  const dimension = (winnerList: string[], loserList: string[], winnerAll: boolean): boolean => {
    if (winnerAll || winnerList.length === 0) return true;
    if (loserList.length === 0) return false; // the loser is broader, so it escapes
    const set = new Set(winnerList.map((item) => item.toLowerCase()));
    return loserList.every((item) => set.has(item.toLowerCase()));
  };

  return (
    dimension(winner.countries, loser.countries, winner.targetAllCountries) &&
    dimension(winner.regionIds, loser.regionIds, winner.targetAllRegions) &&
    dimension(winner.cities, loser.cities, winner.targetAllCities) &&
    dimension(winner.districtIds, loser.districtIds, winner.targetAllDistricts) &&
    dimension(winner.languages, loser.languages, false) &&
    dimension(winner.devices, loser.devices, false) &&
    dimension(winner.channels, loser.channels, false) &&
    dimension(winner.pageTypes, loser.pageTypes, false) &&
    dimension(winner.sectionScopes, loser.sectionScopes, false) &&
    coversInTime(winner, loser)
  );
}

/** A campaign that has already ended cannot starve one that runs after it. */
function coversInTime(winner: ParsedAd, loser: ParsedAd): boolean {
  const winnerEnd = winner.endAt ? Date.parse(winner.endAt) : Infinity;
  const loserEnd = loser.endAt ? Date.parse(loser.endAt) : Infinity;
  const winnerStart = winner.startAt ? Date.parse(winner.startAt) : -Infinity;
  const loserStart = loser.startAt ? Date.parse(loser.startAt) : -Infinity;
  if (Number.isNaN(winnerEnd) || Number.isNaN(loserEnd) || Number.isNaN(winnerStart) || Number.isNaN(loserStart)) {
    return true; // an unparseable date is not evidence of anything
  }
  return winnerStart <= loserStart && winnerEnd >= loserEnd;
}

export function detectCampaignConflicts(ads: ParsedAd[]): CampaignConflict[] {
  const conflicts: CampaignConflict[] = [];
  const servable = ads.filter((ad) => ad.isActive && ad.approvalStatus === "approved");

  // Group by the placement each campaign actually named. Campaigns that named
  // nothing ("*") compete everywhere but always lose to anything specific, so
  // they are grouped separately rather than compared against every placement.
  const byPlacement = new Map<string, ParsedAd[]>();
  for (const ad of servable) {
    for (const placement of placementsOf(ad)) {
      const group = byPlacement.get(placement) ?? [];
      group.push(ad);
      byPlacement.set(placement, group);
    }
  }

  for (const [placement, group] of byPlacement) {
    if (group.length < 2) continue;

    const highest = Math.max(...group.map((ad) => ad.priority));
    const winners = group.filter((ad) => ad.priority === highest);

    // Starved means every impression it could win is taken by something that
    // outranks it -- not merely that a higher priority exists somewhere in the
    // placement. A campaign whose targeting reaches beyond its rival's still
    // serves there, and one that never overlaps at all was never in the race.
    for (const ad of group) {
      const suppressors = group.filter(
        (rival) => rival.id !== ad.id && rival.priority > ad.priority && covers(rival, ad),
      );
      if (suppressors.length === 0) continue;

      conflicts.push({
        type: "starved_by_priority",
        severity: "blocked",
        placement,
        campaignIds: [ad.id],
        message: {
          ar: `${label(ad)} لن تظهر إطلاقاً في «${placement}»: ${suppressors.map(label).join("، ")} تغطي كامل استهدافها وتتفوق عليها في الأولوية، فتأخذ كل الظهور.`,
          en: `${label(ad)} will never appear in "${placement}": ${suppressors.map(label).join(", ")} covers all of its targeting and outranks it, taking every impression.`,
        },
      });
    }

    // Within the winning tier, weight divides the traffic -- so a zero weight
    // beside a weighted sibling is also a campaign that never serves.
    const weighted = winners.filter((ad) => ad.weight > 0);
    const zeroWeight = winners.filter((ad) => ad.weight <= 0);
    if (zeroWeight.length > 0 && weighted.length > 0) {
      conflicts.push({
        type: "zero_weight",
        severity: "blocked",
        placement,
        campaignIds: zeroWeight.map((ad) => ad.id),
        message: {
          ar: `${zeroWeight.map(label).join("، ")} وزنها صفر في «${placement}»، فلن تأخذ أي نسبة من الظهور بينما توجد حملات موزونة.`,
          en: `${zeroWeight.map(label).join(", ")} has zero weight in "${placement}", so it takes no share of the traffic while weighted campaigns exist.`,
        },
      });
    }

    if (winners.length > 1 && weighted.length > 1) {
      conflicts.push({
        type: "duplicate_targeting",
        severity: "warning",
        placement,
        campaignIds: winners.map((ad) => ad.id),
        message: {
          ar: `${winners.length} حملات تتنافس على «${placement}» بنفس الأولوية (${highest})، والظهور يُقسَّم بينها بالوزن.`,
          en: `${winners.length} campaigns compete for "${placement}" at the same priority (${highest}); impressions are split between them by weight.`,
        },
      });
    }
  }

  return conflicts;
}

/**
 * A campaign that names a placement no page renders is configured, funded and
 * invisible. The registry of real placements is passed in so this module stays
 * independent of how that registry is built.
 */
export function detectUnreachablePlacements(ads: ParsedAd[], knownPlacements: Set<string>): CampaignConflict[] {
  const conflicts: CampaignConflict[] = [];
  for (const ad of ads) {
    for (const placement of ad.placements) {
      if (knownPlacements.has(placement)) continue;
      conflicts.push({
        type: "unreachable_placement",
        severity: "blocked",
        placement,
        campaignIds: [ad.id],
        message: {
          ar: `${label(ad)} تستهدف «${placement}» وهو موضع غير موجود في المنصة، فلن تُعرض أبداً.`,
          en: `${label(ad)} targets "${placement}", which no page renders, so it can never be served.`,
        },
      });
    }
  }
  return conflicts;
}
