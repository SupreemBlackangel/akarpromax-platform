import { NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { statDate } from "@/lib/ads/geo";
import { loadActiveAds, computeInventoryHealth } from "@/lib/ads/engine";
import { buildContext } from "@/lib/ads/context";
import { AD_PLACEMENTS } from "@/src/constants/advertising";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_ANALYTICS)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = await getRuntimeDb();
  const today = statDate(new Date());

  const [campaigns, daily, placements, classSplit, healthAds] = await Promise.all([
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
      `SELECT placement, channel, inventory_class, COUNT(*) AS impressions
       FROM ad_impressions
       GROUP BY placement, channel, inventory_class
       ORDER BY impressions DESC
       LIMIT 120`,
    ).all<Record<string, string | number>>(),
    db.prepare(
      `SELECT inventory_class, COUNT(*) AS impressions,
              SUM(CASE WHEN session_id IS NOT NULL THEN 1 ELSE 0 END) AS with_session
       FROM ad_impressions
       GROUP BY inventory_class`,
    ).all<Record<string, string | number>>(),
    loadActiveAds(db),
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
    channel: row.channel,
    inventoryClass: row.inventory_class,
    impressions: Number(row.impressions),
  }));

  const split = {
    commercial: 0,
    house: 0,
  };
  for (const row of classSplit.results) {
    if (row.inventory_class === "house") split.house += Number(row.impressions);
    else split.commercial += Number(row.impressions);
  }

  const placementKeys = new Set<string>();
  for (const row of placements.results) placementKeys.add(String(row.placement));
  for (const key of Object.keys(AD_PLACEMENTS)) placementKeys.add(key);

  const inventory = [...placementKeys].slice(0, 120).map((placement) => {
    const meta = AD_PLACEMENTS[placement];
    const section = meta?.sections?.[0] ?? "home";
    const channel = section === "office" ? "office" : "website";
    const ctx = buildContext({ placement, section, channel });
    const health = computeInventoryHealth(healthAds, ctx);
    const placementRows = placements.results.filter((row) => row.placement === placement);
    let commercial = 0;
    let house = 0;
    for (const row of placementRows) {
      if (row.inventory_class === "house") house += Number(row.impressions);
      else commercial += Number(row.impressions);
    }
    const total = commercial + house;
    return {
      placement,
      status: health.status,
      eligibleCommercial: health.eligibleCommercial,
      fallbackActive: health.fallbackActive,
      fallbackTurns: health.fallbackTurns,
      commercialImpressions: commercial,
      houseImpressions: house,
      commercialFillRate: total > 0 ? commercial / total : 0,
    };
  });

  return NextResponse.json(
    { campaigns: campaignsList, daily: dailySeries, placements: placementsList, split, inventory, today },
    { headers: { "Cache-Control": "no-store" } },
  );
}
