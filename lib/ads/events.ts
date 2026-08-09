import { sha256Hex } from "@/lib/auth/crypto";
import { statDate, frequencyWindowSince, formatDateTime } from "@/lib/ads/geo";
import type { ResolvedAdContext } from "@/lib/ads/types";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export type TrackingPayload = {
  cid: string;
  pl: string;
  sec: string;
  pg: string;
  cr?: string;
  ch?: string;
  ic?: "commercial" | "house";
  ts: number;
};

function getAdSecret(): string {
  return process.env.AD_TRACKING_SECRET || "akar-ad-tracking-v1";
}

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  return atob(padded);
}

export async function signTrackingToken(
  input: { campaignId: string; placement: string; section: string; pageType: string; creativeId?: string | null; channel?: string; inventoryClass?: "commercial" | "house" },
  now = new Date(),
): Promise<string> {
  const payload = base64UrlEncode(
    JSON.stringify({
      cid: input.campaignId,
      pl: input.placement,
      sec: input.section,
      pg: input.pageType,
      cr: input.creativeId ?? undefined,
      ch: input.channel ?? undefined,
      ic: input.inventoryClass ?? undefined,
      ts: now.getTime(),
    }),
  );
  const signature = await sha256Hex(`${payload}.${getAdSecret()}`);
  return `${payload}.${signature}`;
}

export async function verifyTrackingToken(token: string): Promise<TrackingPayload | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = await sha256Hex(`${payload}.${getAdSecret()}`);
  if (expected !== signature) return null;
  try {
    const data = JSON.parse(base64UrlDecode(payload)) as TrackingPayload;
    if (typeof data.cid !== "string" || typeof data.pl !== "string" || typeof data.ts !== "number") return null;
    if (Date.now() - data.ts > TOKEN_TTL_MS) return null;
    if (data.ic !== undefined && data.ic !== "commercial" && data.ic !== "house") return null;
    if (data.ch !== undefined && data.ch !== "website" && data.ch !== "office") return null;
    return data;
  } catch {
    return null;
  }
}

async function upsertDailyStat(db: D1Database, campaignId: string, date: string, delta: { impressions?: number; uniqueImpressions?: number; clicks?: number; uniqueClicks?: number; conversions?: number; spent?: number }) {
  const existing = await db
    .prepare("SELECT campaign_id FROM ad_daily_statistics WHERE campaign_id = ?1 AND stat_date = ?2")
    .bind(campaignId, date)
    .first<{ campaign_id: string }>();
  if (existing) {
    await db
      .prepare(
        `UPDATE ad_daily_statistics SET
           impressions = impressions + ?,
           unique_impressions = unique_impressions + ?,
           clicks = clicks + ?,
           unique_clicks = unique_clicks + ?,
           conversions = conversions + ?,
           spent_amount = spent_amount + ?
         WHERE campaign_id = ? AND stat_date = ?`,
      )
      .bind(delta.impressions ?? 0, delta.uniqueImpressions ?? 0, delta.clicks ?? 0, delta.uniqueClicks ?? 0, delta.conversions ?? 0, delta.spent ?? 0, campaignId, date)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO ad_daily_statistics
           (campaign_id, stat_date, impressions, unique_impressions, clicks, unique_clicks, conversions, spent_amount)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .bind(campaignId, date, delta.impressions ?? 0, delta.uniqueImpressions ?? 0, delta.clicks ?? 0, delta.uniqueClicks ?? 0, delta.conversions ?? 0, delta.spent ?? 0)
      .run();
  }
}

async function hasSeenBefore(db: D1Database, campaignId: string, ctx: ResolvedAdContext, since: string): Promise<boolean> {
  if (!ctx.sessionId && !ctx.userId) return false;
  const conditions = ["campaign_id = ?", "tracked_at >= ?"];
  const params: unknown[] = [campaignId, since];
  if (ctx.sessionId) {
    conditions.push("session_id = ?");
    params.push(ctx.sessionId);
  }
  if (ctx.userId) {
    conditions.push("user_id = ?");
    params.push(ctx.userId);
  }
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM ad_impressions WHERE ${conditions.join(" AND ")}`)
    .bind(...(params as [unknown, ...unknown[]]))
    .first<{ n: number }>();
  return Number(row?.n ?? 0) > 0;
}

export async function recordImpression(
  db: D1Database,
  campaignId: string,
  ctx: ResolvedAdContext,
  now = new Date(),
  extra: { creativeId?: string | null; inventoryClass?: "commercial" | "house" } = {},
) {
  const unique = !(await hasSeenBefore(db, campaignId, ctx, frequencyWindowSince("day", now)));
  const inventoryClass = extra.inventoryClass ?? "commercial";
  await db
    .prepare(
      `INSERT INTO ad_impressions
         (id, campaign_id, placement, section, page_type, entity_type, entity_id,
          country_code, region_id, city_id, district_id, locale, device,
          session_id, user_id, creative_id, channel, inventory_class)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)`,
    )
    .bind(
      crypto.randomUUID(),
      campaignId,
      ctx.placement,
      ctx.section,
      ctx.pageType,
      ctx.entityType ?? null,
      ctx.entityId != null ? String(ctx.entityId) : null,
      ctx.countryCode?.toLowerCase() ?? null,
      ctx.regionId != null ? String(ctx.regionId) : null,
      ctx.cityId != null ? String(ctx.cityId) : null,
      ctx.districtId != null ? String(ctx.districtId) : null,
      ctx.language,
      ctx.deviceType,
      ctx.sessionId ?? null,
      ctx.userId ?? null,
      extra.creativeId ?? null,
      ctx.channel ?? "website",
      inventoryClass,
    )
    .run();

  await upsertDailyStat(db, campaignId, statDate(now), { impressions: 1, uniqueImpressions: unique ? 1 : 0 });
  await db
    .prepare(
      `UPDATE ad_campaigns SET
         total_impressions = total_impressions + 1,
         total_unique_impressions = total_unique_impressions + ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(unique ? 1 : 0, campaignId)
    .run();
}

export async function recordClick(
  db: D1Database,
  campaignId: string,
  ctx: ResolvedAdContext,
  now = new Date(),
  extra: { creativeId?: string | null; inventoryClass?: "commercial" | "house" } = {},
) {
  const inventoryClass = extra.inventoryClass ?? "commercial";
  await db
    .prepare(
      `INSERT INTO ad_clicks
         (id, campaign_id, placement, section, page_type, entity_type, entity_id,
          country_code, region_id, city_id, district_id, locale, device,
          session_id, user_id, creative_id, channel, inventory_class)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)`,
    )
    .bind(
      crypto.randomUUID(),
      campaignId,
      ctx.placement,
      ctx.section,
      ctx.pageType,
      ctx.entityType ?? null,
      ctx.entityId != null ? String(ctx.entityId) : null,
      ctx.countryCode?.toLowerCase() ?? null,
      ctx.regionId != null ? String(ctx.regionId) : null,
      ctx.cityId != null ? String(ctx.cityId) : null,
      ctx.districtId != null ? String(ctx.districtId) : null,
      ctx.language,
      ctx.deviceType,
      ctx.sessionId ?? null,
      ctx.userId ?? null,
      extra.creativeId ?? null,
      ctx.channel ?? "website",
      inventoryClass,
    )
    .run();

  await upsertDailyStat(db, campaignId, statDate(now), { clicks: 1 });
  await db
    .prepare(
      `UPDATE ad_campaigns SET
         total_clicks = total_clicks + 1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(campaignId)
    .run();
}

export async function recordConversion(
  db: D1Database,
  campaignId: string,
  ctx: ResolvedAdContext,
  conversionType = "click",
  value = 0,
  now = new Date(),
) {
  await db
    .prepare(
      `INSERT INTO ad_conversions
         (id, campaign_id, conversion_type, value, session_id, user_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(crypto.randomUUID(), campaignId, conversionType, value, ctx.sessionId ?? null, ctx.userId ?? null)
    .run();
  await upsertDailyStat(db, campaignId, statDate(now), { conversions: 1, spent: value });
  await db
    .prepare(
      `UPDATE ad_campaigns SET
         total_conversions = total_conversions + 1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(campaignId)
    .run();
}

export function trackingNow(): string {
  return formatDateTime(new Date());
}
