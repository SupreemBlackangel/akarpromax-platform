import { NextResponse } from "next/server";
import { getSessionIdentity, hasPermission } from "@/lib/identity-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

type DailyRow = { day: string; impressions: number; clicks: number };
type TopAdvertiserRow = { id: string; name_ar: string; country_code: string; impressions: number; clicks: number };
type TopCampaignRow = { id: string; internal_name: string; advertiser_name: string; status: string; impressions: number; clicks: number };

function dayKey(offset: number): string {
  const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const identity = await getSessionIdentity();
  if (!hasPermission(identity, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getRuntimeDb();
  const days = Array.from({ length: 14 }, (_, index) => dayKey(13 - index));
  const startOfWindow = days[0];

  const [advertiserDaily, adDaily, topAdvertisers, topCampaigns] = await Promise.all([
    db.prepare(
      `SELECT date(occurred_at) AS day,
              COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0) AS impressions,
              COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) AS clicks
       FROM sponsor_events
       WHERE date(occurred_at) >= ?1
       GROUP BY date(occurred_at)`,
    ).bind(startOfWindow).all<DailyRow>(),
    db.prepare(
      `SELECT date(occurred_at) AS day,
              COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0) AS impressions,
              COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) AS clicks
       FROM ad_events
       WHERE date(occurred_at) >= ?1
       GROUP BY date(occurred_at)`,
    ).bind(startOfWindow).all<DailyRow>(),
    db.prepare(
      `SELECT s.id, s.name_ar, s.country_code,
              COALESCE(SUM(CASE WHEN e.event_type = 'impression' THEN 1 ELSE 0 END), 0) AS impressions,
              COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0) AS clicks
       FROM sponsors s
       LEFT JOIN sponsor_events e ON e.sponsor_id = s.id
       GROUP BY s.id
       ORDER BY impressions DESC
       LIMIT 10`,
    ).all<TopAdvertiserRow>(),
    db.prepare(
      `SELECT a.id, a.internal_name, a.advertiser_name, a.status,
              COALESCE(SUM(CASE WHEN e.event_type = 'impression' THEN 1 ELSE 0 END), 0) AS impressions,
              COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0) AS clicks
       FROM ad_campaigns a
       LEFT JOIN ad_events e ON e.campaign_id = a.id
       GROUP BY a.id
       ORDER BY impressions DESC
       LIMIT 10`,
    ).all<TopCampaignRow>(),
  ]);

  const advertiserByDay = new Map(advertiserDaily.results.map((row) => [row.day, row]));
  const adByDay = new Map(adDaily.results.map((row) => [row.day, row]));

  const timeline = days.map((day) => {
    const advertiser = advertiserByDay.get(day);
    const ad = adByDay.get(day);
    return {
      day,
      advertiserImpressions: Number(advertiser?.impressions ?? 0),
      advertiserClicks: Number(advertiser?.clicks ?? 0),
      adImpressions: Number(ad?.impressions ?? 0),
      adClicks: Number(ad?.clicks ?? 0),
    };
  });

  return NextResponse.json({
    identity,
    timeline,
    topAdvertisers: topAdvertisers.results.map((row) => ({
      id: row.id,
      nameAr: row.name_ar,
      countryCode: row.country_code,
      impressions: Number(row.impressions),
      clicks: Number(row.clicks),
    })),
    topCampaigns: topCampaigns.results.map((row) => ({
      id: row.id,
      internalName: row.internal_name,
      advertiserName: row.advertiser_name,
      status: row.status,
      impressions: Number(row.impressions),
      clicks: Number(row.clicks),
    })),
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
