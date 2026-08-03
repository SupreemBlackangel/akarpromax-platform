import { NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { statDate } from "@/lib/ads/geo";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_ANALYTICS)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = await getRuntimeDb();
  const today = statDate(new Date());

  const [campaigns, daily, placements] = await Promise.all([
    db.prepare(
      `SELECT id, internal_name, advertiser_name, campaign_type, status, approval_status,
              total_impressions, total_unique_impressions, total_clicks, total_unique_clicks,
              total_conversions, spent_amount, budget, daily_budget
       FROM ad_campaigns
       WHERE deleted_at IS NULL
       ORDER BY total_impressions DESC
       LIMIT 200`,
    ).all<Record<string, string | number>>(),
    db.prepare(
      `SELECT campaign_id, stat_date, impressions, unique_impressions, clicks, unique_clicks,
              conversions, spent_amount
       FROM ad_daily_statistics
       WHERE stat_date >= ?1
       ORDER BY stat_date ASC`,
    ).bind(today.slice(0, 8) + "01").all<Record<string, string | number>>(),
    db.prepare(
      `SELECT placement, COUNT(*) AS impressions,
              SUM(CASE WHEN session_id IS NOT NULL THEN 1 ELSE 0 END) AS with_session
       FROM ad_impressions
       GROUP BY placement
       ORDER BY impressions DESC
       LIMIT 60`,
    ).all<Record<string, string | number>>(),
  ]);

  const campaignsList = campaigns.results.map((row) => ({
    id: row.id,
    internalName: row.internal_name,
    advertiserName: row.advertiser_name,
    campaignType: row.campaign_type,
    status: row.status,
    approvalStatus: row.approval_status,
    totalImpressions: Number(row.total_impressions),
    totalUniqueImpressions: Number(row.total_unique_impressions),
    totalClicks: Number(row.total_clicks),
    totalUniqueClicks: Number(row.total_unique_clicks),
    totalConversions: Number(row.total_conversions),
    spentAmount: Number(row.spent_amount),
    budget: Number(row.budget),
    dailyBudget: Number(row.daily_budget),
  }));

  const dailySeries = daily.results.map((row) => ({
    campaignId: row.campaign_id,
    date: row.stat_date,
    impressions: Number(row.impressions),
    uniqueImpressions: Number(row.unique_impressions),
    clicks: Number(row.clicks),
    uniqueClicks: Number(row.unique_clicks),
    conversions: Number(row.conversions),
    spentAmount: Number(row.spent_amount),
  }));

  const placementsList = placements.results.map((row) => ({
    placement: row.placement,
    impressions: Number(row.impressions),
  }));

  return NextResponse.json({ campaigns: campaignsList, daily: dailySeries, placements: placementsList, today }, { headers: { "Cache-Control": "no-store" } });
}
