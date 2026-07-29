import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";

export const dynamic = "force-dynamic";

const eventTypes = ["impression", "click", "slide_change", "video_start", "video_25", "video_50", "video_75", "video_complete"];

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const campaignId = clean(body.campaignId, 80);
  const eventType = clean(body.eventType, 30);
  const countryCode = clean(body.countryCode, 2).toLowerCase();
  const cityId = clean(body.cityId, 100).toLowerCase() || null;
  const locale = clean(body.locale, 2).toLowerCase();
  const device = clean(body.device, 20).toLowerCase();
  if (
    !campaignId ||
    !eventTypes.includes(eventType) ||
    !/^[a-z]{2}$/.test(countryCode) ||
    !["ar", "en", "tr"].includes(locale) ||
    !["desktop", "mobile"].includes(device)
  ) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const db = await getRuntimeDb();
  const campaign = await db.prepare(
    `SELECT id FROM ad_campaigns
     WHERE id = ?1 AND status = 'active'
       AND (start_at IS NULL OR datetime(start_at) <= datetime('now'))
       AND (end_at IS NULL OR datetime(end_at) >= datetime('now'))
     LIMIT 1`,
  ).bind(campaignId).first<{ id: string }>();
  if (!campaign) return NextResponse.json({ error: "Campaign not active" }, { status: 404 });

  await db.prepare(
    `INSERT INTO ad_events
      (id, campaign_id, event_type, country_code, city_id, locale, device)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  ).bind(crypto.randomUUID(), campaignId, eventType, countryCode, cityId, locale, device).run();
  return new NextResponse(null, { status: 204 });
}
