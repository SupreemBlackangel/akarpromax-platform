import { canonicalPlacementFor } from "@/src/constants/advertising";
import type { ParsedAd, ResolvedAdContext } from "@/lib/ads/types";

/**
 * How specifically a campaign asked for the placement it is being considered
 * for. This is the fix for cross-page campaign bleed.
 *
 * Placements are already per page ("web_home_hero" vs "web_properties_hero"),
 * but eligibility treated three very different intents as interchangeable:
 * an exact page placement scored 365, the canonical "HERO" scored 360, and a
 * campaign with no placement targeting at all scored 315 — and the selector
 * kept everything within 50 points of the best. All three therefore competed
 * as equals, so an untargeted campaign could take the hero of every page. That
 * is the "global hero" symptom.
 *
 * Selection now considers only the most specific tier that has any candidate,
 * which is the standard ad-server rule: the most specific line item wins.
 * Broader campaigns are not discarded — they remain backfill for placements
 * nothing specific asked for.
 */
export const PlacementSpecificity = {
  /** Named this exact page's placement, e.g. "web_properties_hero". */
  Exact: 0,
  /** Named the canonical slot, e.g. "HERO" — every page's hero. */
  Canonical: 1,
  /** Named no placement — anywhere at all. */
  Any: 2,
} as const;

export type PlacementSpecificity = (typeof PlacementSpecificity)[keyof typeof PlacementSpecificity];

export function placementSpecificity(ad: ParsedAd, ctx: ResolvedAdContext): PlacementSpecificity | null {
  if (ad.placements.length === 0) return PlacementSpecificity.Any;
  if (ad.placements.includes(ctx.placement)) return PlacementSpecificity.Exact;
  const canonical = canonicalPlacementFor(ctx.placement);
  if (canonical && ad.placements.includes(canonical)) return PlacementSpecificity.Canonical;
  return null;
}

/** Why a campaign was not eligible. Surfaced by the admin preview simulator. */
export type IneligibleReason =
  | "inactive"
  | "not_approved"
  | "channel"
  | "schedule"
  | "operating_system"
  | "budget"
  | "section"
  | "placement"
  | "domain"
  | "page_type"
  | "device"
  | "language"
  | "geo"
  | "entity"
  | "category";

export const INELIGIBLE_REASON_LABELS: Record<IneligibleReason, { ar: string; en: string }> = {
  inactive: { ar: "الحملة غير مفعّلة", en: "Campaign is not active" },
  not_approved: { ar: "لم تُعتمد بعد", en: "Not approved" },
  channel: { ar: "قناة مختلفة", en: "Different channel" },
  schedule: { ar: "خارج الجدول الزمني", en: "Outside its schedule" },
  operating_system: { ar: "نظام تشغيل غير مستهدَف", en: "Operating system not targeted" },
  budget: { ar: "استُنفدت الميزانية أو السقف", en: "Budget or cap exhausted" },
  section: { ar: "قسم غير مستهدَف", en: "Section not targeted" },
  placement: { ar: "موضع غير مستهدَف", en: "Placement not targeted" },
  domain: { ar: "نطاق غير مستهدَف", en: "Domain not targeted" },
  page_type: { ar: "نوع صفحة غير مستهدَف", en: "Page type not targeted" },
  device: { ar: "جهاز غير مستهدَف", en: "Device not targeted" },
  language: { ar: "لغة غير مستهدَفة", en: "Language not targeted" },
  geo: { ar: "خارج النطاق الجغرافي", en: "Outside the targeted geography" },
  entity: { ar: "كيان غير مستهدَف", en: "Entity not targeted" },
  category: { ar: "تصنيف غير مستهدَف", en: "Category not targeted" },
};

export type EligibilityVerdict =
  | { eligible: true; specificity: PlacementSpecificity; relevance: number }
  | { eligible: false; reason: IneligibleReason };

/** The per-dimension predicates the engine already owns, injected so this
 *  module stays free of query and scoring concerns. */
export type EligibilityChecks = {
  isActive(ad: ParsedAd): boolean;
  isApproved(ad: ParsedAd): boolean;
  channel(ad: ParsedAd, ctx: ResolvedAdContext): boolean;
  schedule(ad: ParsedAd, now: Date, ctx: ResolvedAdContext): boolean;
  operatingSystem(ad: ParsedAd, ctx: ResolvedAdContext): boolean;
  budget(ad: ParsedAd): boolean;
  section(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number };
  domain(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number };
  pageType(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number };
  device(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number };
  language(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number };
  geo(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number };
  entity(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number };
  category(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number };
};

/**
 * Decide whether one campaign may serve here — and nothing more. It does not
 * choose a winner; that is the selection engine's job. `relevance` is only a
 * tie-break hint for selection within the same specificity and priority tier.
 *
 * Order matters: the cheapest and most decisive checks run first so the common
 * rejection paths cost the least, and the reason reported is the most
 * meaningful one for an operator reading the preview simulator.
 */
export function evaluateEligibility(
  ad: ParsedAd,
  ctx: ResolvedAdContext,
  now: Date,
  checks: EligibilityChecks,
): EligibilityVerdict {
  if (!checks.isActive(ad)) return { eligible: false, reason: "inactive" };
  if (!checks.isApproved(ad)) return { eligible: false, reason: "not_approved" };
  if (!checks.channel(ad, ctx)) return { eligible: false, reason: "channel" };
  if (!checks.schedule(ad, now, ctx)) return { eligible: false, reason: "schedule" };
  if (!checks.operatingSystem(ad, ctx)) return { eligible: false, reason: "operating_system" };
  if (!checks.budget(ad)) return { eligible: false, reason: "budget" };

  const specificity = placementSpecificity(ad, ctx);
  if (specificity === null) return { eligible: false, reason: "placement" };

  const section = checks.section(ad, ctx);
  if (!section.ok) return { eligible: false, reason: "section" };
  const domain = checks.domain(ad, ctx);
  if (!domain.ok) return { eligible: false, reason: "domain" };
  const pageType = checks.pageType(ad, ctx);
  if (!pageType.ok) return { eligible: false, reason: "page_type" };
  const device = checks.device(ad, ctx);
  if (!device.ok) return { eligible: false, reason: "device" };
  const language = checks.language(ad, ctx);
  if (!language.ok) return { eligible: false, reason: "language" };
  const geo = checks.geo(ad, ctx);
  if (!geo.ok) return { eligible: false, reason: "geo" };
  const entity = checks.entity(ad, ctx);
  if (!entity.ok) return { eligible: false, reason: "entity" };
  const category = checks.category(ad, ctx);
  if (!category.ok) return { eligible: false, reason: "category" };

  const relevance =
    section.score + domain.score + pageType.score + device.score +
    language.score + geo.score + entity.score + category.score +
    (ad.isFeatured ? 10 : 0);

  return { eligible: true, specificity, relevance };
}
