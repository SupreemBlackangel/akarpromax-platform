import { NextRequest, NextResponse } from "next/server";
import { authenticateOfficeRequest, requireScope } from "@/lib/integration/office-auth";
import { recordAdEvent } from "@/lib/integration/ads";
import { OFFICE_AD_PLACEMENTS } from "@/lib/integration/constants";
import { logSecurityEvent } from "@/lib/security/audit";
import { getRuntimeDb } from "@/lib/runtime-db";
import { matchAds } from "@/lib/ads/engine";
import { buildContext, isValidPlacement } from "@/lib/ads/context";
import { recordImpression, recordClick, verifyTrackingToken } from "@/lib/ads/events";

export const dynamic = "force-dynamic";

const OFFICE_SECTION = "office";

export async function GET(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.ads.read");
  if (blocked) return blocked;

  const url = new URL(req.url);
  const countryCode = (url.searchParams.get("country") ?? "om").toLowerCase().slice(0, 2);
  const placement = url.searchParams.get("placement") ?? OFFICE_AD_PLACEMENTS[0];
  if (!(OFFICE_AD_PLACEMENTS as readonly string[]).includes(placement) || !isValidPlacement(placement)) {
    return NextResponse.json({ error: "Unsupported placement" }, { status: 400 });
  }
  const device = (url.searchParams.get("device") ?? "desktop") as "desktop" | "mobile" | "tablet";
  const language = (url.searchParams.get("locale") ?? "ar") as "ar" | "en" | "tr";
  const limit = Math.max(1, Math.min(20, Number(url.searchParams.get("limit") ?? 3)));
  const regionId = url.searchParams.get("region") ?? undefined;
  const cityId = url.searchParams.get("city") ?? undefined;

  try {
    const db = await getRuntimeDb();
    const ctx = buildContext({
      placement,
      section: OFFICE_SECTION,
      channel: "office",
      countryCode,
      regionId,
      cityId,
      language,
      deviceType: device,
      sessionId: auth.device.deviceId,
    });
    const ads = await matchAds(db, ctx, { count: limit });
    return NextResponse.json({ ads, placement, channel: "office" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load office ads" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.ads.read");
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const campaignId = String(body.campaignId ?? "").slice(0, 80);
  const eventType = body.eventType === "click" ? "click" : "impression";
  const placement = String(body.placement ?? "office_dashboard_hero").slice(0, 40);
  const token = typeof body.token === "string" ? body.token.slice(0, 500) : "";
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  if (!(OFFICE_AD_PLACEMENTS as readonly string[]).includes(placement) || !isValidPlacement(placement)) {
    return NextResponse.json({ error: "Unsupported placement" }, { status: 400 });
  }

  try {
    const db = await getRuntimeDb();
    const campaign = await db
      .prepare("SELECT is_fallback, channels FROM ad_campaigns WHERE id = ?1 AND deleted_at IS NULL LIMIT 1")
      .bind(campaignId)
      .first<{ is_fallback: number; channels: string | null }>();
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    let channels: string[] = ["website"];
    try {
      const parsed = JSON.parse(campaign.channels ?? "[]");
      if (Array.isArray(parsed)) channels = parsed.filter((item): item is string => item === "website" || item === "office");
    } catch {
      // default to website
    }
    if (!channels.includes("office")) {
      return NextResponse.json({ error: "Campaign is not eligible for the office channel" }, { status: 403 });
    }

    const countryCode = String(body.country ?? "om").slice(0, 8).toLowerCase();
    const device = String(body.device ?? "desktop").slice(0, 16) as "desktop" | "mobile" | "tablet";
    const language = (String(body.locale ?? "ar") as "ar" | "en" | "tr");
    const ctx = buildContext({
      placement,
      section: OFFICE_SECTION,
      channel: "office",
      countryCode,
      language,
      deviceType: device,
      sessionId: auth.device.deviceId,
    });

    let recorded = true;
    if (token) {
      const verified = await verifyTrackingToken(token);
      if (verified?.cid !== campaignId) {
        return NextResponse.json({ error: "Tracking token mismatch" }, { status: 400 });
      }
      const inventoryClass = verified.ic ?? (Number(campaign.is_fallback) === 1 ? "house" : "commercial");
      if (eventType === "click") {
        await recordClick(db, campaignId, ctx, new Date(), { creativeId: verified.cr ?? null, inventoryClass });
      } else {
        await recordImpression(db, campaignId, ctx, new Date(), { creativeId: verified.cr ?? null, inventoryClass });
      }
    } else {
      recorded = (
        await recordAdEvent({
          campaignId,
          eventType,
          countryCode,
          device,
          placement,
          officeDeviceId: auth.device.deviceId,
          dedupKey: String(body.dedupKey ?? "").slice(0, 100) || undefined,
        })
      ).recorded;
    }

    if (eventType === "impression") {
      await logSecurityEvent("OFFICE_AD_IMPRESSION", { campaignId, deviceId: auth.device.deviceId, recorded });
    }

    return NextResponse.json({ recorded });
  } catch {
    return NextResponse.json({ error: "Failed to record office ad event" }, { status: 500 });
  }
}
