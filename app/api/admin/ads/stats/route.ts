import { NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { statDate } from "@/lib/ads/geo";
import { loadActiveAds, computeInventoryHealth } from "@/lib/ads/engine";
import { buildContext } from "@/lib/ads/context";
import { AD_PLACEMENTS, visibleAdminPlacements } from "@/src/constants/advertising";
import { getPlatformSettings } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_ANALYTICS)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = await getRuntimeDb();
  const today = statDate(new Date());

  // Per-campaign performance: ?id=<campaignId>&days=N returns that campaign's
  // totals plus its daily series for the requested window.
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("id");
  if (campaignId) {
    const days = Math.max(7, Math.min(90, Number(url.searchParams.get("days")) || 30));
    const since = new Date(Date.now() - days * 86_400_000);
    const sinceKey = statDate(since);
    const [campaign, daily, pricingSettings] = await Promise.all([
      db.prepare(
        `SELECT id, internal_name, advertiser_name, status, approval_status, pricing_model, placements,
                total_impressions, total_clicks, total_conversions, created_at
         FROM ad_campaigns WHERE id = ?1 LIMIT 1`,
      ).bind(campaignId).first<Record<string, string | number>>(),
      db.prepare(
        `SELECT stat_date, impressions, clicks, conversions
         FROM ad_daily_statistics
         WHERE campaign_id = ?1 AND stat_date >= ?2
         ORDER BY stat_date ASC`,
      ).bind(campaignId, sinceKey).all<Record<string, string | number>>(),
      getPlatformSettings(),
    ]);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    // Estimated cost from the admin-set pricing: CPC campaigns bill clicks;
    // everything else bills the fixed monthly price of its first placement.
    let placements: string[] = [];
    try { placements = JSON.parse(String(campaign.placements || "[]")); } catch { placements = []; }
    const pricing = pricingSettings.adPricing;
    const model = String(campaign.pricing_model || "fixed");
    const firstPlacement = placements[0] ?? "";
    const monthlyRate = pricing.monthly[firstPlacement] ?? 0;
    const clicks = Number(campaign.total_clicks);
    const estimatedCost = model === "cpc" ? clicks * pricing.cpc : monthlyRate;

    return NextResponse.json({
      pricing: { model, currency: pricing.currency, cpc: pricing.cpc, monthlyRate, estimatedCost },
      campaign: {
        id: campaign.id,
        internalName: campaign.internal_name,
        advertiserName: campaign.advertiser_name,
        totalImpressions: Number(campaign.total_impressions),
        totalClicks: Number(campaign.total_clicks),
        totalConversions: Number(campaign.total_conversions),
      },
      daily: daily.results.map((row) => ({
        date: String(row.stat_date),
        impressions: Number(row.impressions),
        clicks: Number(row.clicks),
        conversions: Number(row.conversions),
      })),
      days,
    });
  }

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
  };
  for (const row of classSplit.results) {
    split.commercial += Number(row.impressions);
  }

  const placementKeys = new Set<string>();
  for (const row of placements.results) placementKeys.add(String(row.placement));
  for (const meta of visibleAdminPlacements()) placementKeys.add(meta.key);

  const inventory = [...placementKeys].slice(0, 120).map((placement) => {
    const meta = AD_PLACEMENTS[placement];
    const section = meta?.sections?.[0] ?? "home";
    const channel = meta?.channel ?? (section === "office" ? "office" : "website");
    const ctx = buildContext({ placement, section, channel });
    const health = computeInventoryHealth(healthAds, ctx);
    const placementRows = placements.results.filter((row) => row.placement === placement);
    let commercial = 0;
    for (const row of placementRows) {
      commercial += Number(row.impressions);
    }
    return {
      placement,
      status: health.status,
      eligibleAds: health.eligibleAds,
      commercialImpressions: commercial,
      fillRate: health.fillRate,
    };
  });

  return NextResponse.json(
    { campaigns: campaignsList, daily: dailySeries, placements: placementsList, split, inventory, today },
    { headers: { "Cache-Control": "no-store" } },
  );
}
