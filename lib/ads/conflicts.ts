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
    const starved = group.filter((ad) => ad.priority < highest);

    if (starved.length > 0) {
      conflicts.push({
        type: "starved_by_priority",
        severity: "blocked",
        placement,
        campaignIds: starved.map((ad) => ad.id),
        message: {
          ar: `${starved.map(label).join("، ")} لن تظهر إطلاقاً في «${placement}»: ${winners.map(label).join("، ")} تفوقها في الأولوية (${highest}) وتأخذ كل الظهور.`,
          en: `${starved.map(label).join(", ")} will never appear in "${placement}": ${winners.map(label).join(", ")} outranks it on priority (${highest}) and takes every impression.`,
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
