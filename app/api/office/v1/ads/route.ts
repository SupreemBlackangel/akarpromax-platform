import { NextRequest, NextResponse } from "next/server";
import { authenticateOfficeRequest, requireScope } from "@/lib/integration/office-auth";
import { listOfficeAds, recordAdEvent } from "@/lib/integration/ads";
import { OFFICE_AD_PLACEMENTS, type OfficeAdPlacement } from "@/lib/integration/constants";
import { logSecurityEvent } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.ads.read");
  if (blocked) return blocked;

  const url = new URL(req.url);
  const countryCode = (url.searchParams.get("country") ?? "om").toLowerCase().slice(0, 2);
  const placement = (url.searchParams.get("placement") ?? OFFICE_AD_PLACEMENTS[0]) as OfficeAdPlacement;
  if (!(OFFICE_AD_PLACEMENTS as readonly string[]).includes(placement)) {
    return NextResponse.json({ error: "Unsupported placement" }, { status: 400 });
  }
  const limit = Math.max(1, Math.min(20, Number(url.searchParams.get("limit") ?? 5)));

  const ads = await listOfficeAds({
    countryCode,
    placement,
    limit,
    device: (url.searchParams.get("device") ?? "desktop") as "desktop" | "mobile" | "tablet",
  });

  return NextResponse.json({ ads, placement });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.ads.read");
  if (blocked) return blocked;

  const body = (await req.json()) as Record<string, unknown>;
  const campaignId = String(body.campaignId ?? "").slice(0, 80);
  const eventType = body.eventType === "click" ? "click" : "impression";
  const placement = String(body.placement ?? "office_dashboard_hero").slice(0, 40);
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const result = await recordAdEvent({
    campaignId,
    eventType,
    countryCode: String(body.country ?? "om"),
    device: String(body.device ?? "desktop").slice(0, 16),
    placement,
    officeDeviceId: auth.device.deviceId,
    dedupKey: String(body.dedupKey ?? "").slice(0, 100) || undefined,
  });

  if (eventType === "impression") {
    await logSecurityEvent("OFFICE_AD_IMPRESSION", { campaignId, deviceId: auth.device.deviceId, recorded: result.recorded });
  }

  return NextResponse.json(result);
}
