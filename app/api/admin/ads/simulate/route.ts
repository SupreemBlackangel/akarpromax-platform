import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { simulateMatch, loadActiveAds } from "@/lib/ads/engine";
import { buildContext, isValidPlacement, type MatchRequest } from "@/lib/ads/context";
import { INELIGIBLE_REASON_LABELS } from "@/lib/ads/eligibility";
import { detectCampaignConflicts } from "@/lib/ads/conflicts";

export const dynamic = "force-dynamic";

/**
 * The ad preview simulator, and the conflict report that sits beside it.
 *
 * Both run the production engines -- `simulateMatch` calls the same
 * `evaluateEligibility` and `competingSet` that serve real traffic. A simulator
 * with its own copy of the matching rules tells an operator what a second
 * implementation would have done, which is worse than useless: it is confidently
 * wrong exactly when the two drift apart.
 *
 * The one thing intentionally not reproduced is the weighted random draw. A
 * preview has to be reproducible, so instead of sampling one winner the response
 * reports every competing campaign with its share of the traffic.
 */
export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_ANALYTICS)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as (MatchRequest & { at?: string }) | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // The simulator asks "what would happen for a visitor like this", so the
  // context comes from the operator's chosen values, not from the admin's own
  // browser. This is the one place client-supplied targeting is the point.
  const ctx = buildContext(body);
  if (!isValidPlacement(ctx.placement)) {
    return NextResponse.json({ error: "Unknown placement" }, { status: 400 });
  }

  // An operator previewing a future date needs the schedule checks to run
  // against that date, which is why `now` is part of the request.
  const at = body.at ? new Date(body.at) : new Date();
  const now = Number.isNaN(at.getTime()) ? new Date() : at;

  try {
    const db = await getRuntimeDb();
    const result = await simulateMatch(db, ctx, { now });
    return NextResponse.json({
      ...result,
      campaigns: result.campaigns.map((campaign) => ({
        ...campaign,
        reasonLabel: campaign.reason ? INELIGIBLE_REASON_LABELS[campaign.reason] : null,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}

/** Campaign conflicts across every placement, from the live campaign set. */
export async function GET() {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_ANALYTICS)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const db = await getRuntimeDb();
    const ads = await loadActiveAds(db);
    return NextResponse.json({ conflicts: detectCampaignConflicts(ads) });
  } catch {
    return NextResponse.json({ error: "Conflict scan failed" }, { status: 500 });
  }
}
