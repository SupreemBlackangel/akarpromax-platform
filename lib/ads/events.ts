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
  ic?: "commercial";
  /**
   * Where the match decided the visitor was, after the location registry
   * corrected the claim. Optional because tokens minted before this field
   * existed are still in flight and must keep working until they expire.
   */
  co?: string;
  rg?: string;
  ci?: string;
  di?: string;
  /** Single-use nonce. See lib/ads/nonce-ledger.ts. */
  n?: string;
  ts: number;
};

/**
 * Key for impression/click tracking tokens.
 *
 * This used to fall back to a constant that lives in the repository, which
 * silently turned every environment that forgot the variable into one where
 * anyone could mint a token for any campaign and POST it in a loop — and each
 * accepted call increments spent_amount. Production does set it, but a default
 * that never fails is exactly how such a gap reaches production unnoticed, so
 * it now fails loudly there and only falls back for local/test runs.
 */
function getAdSecret(): string {
  const secret = process.env.AD_TRACKING_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AD_TRACKING_SECRET is required in production: ad tracking tokens cannot be signed with a public default.");
  }
  return "akar-ad-tracking-dev-only";
}

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  return atob(padded);
}

export async function signTrackingToken(
  input: {
    campaignId: string; placement: string; section: string; pageType: string;
    creativeId?: string | null; channel?: string; inventoryClass?: "commercial";
    // Where the MATCH decided the visitor was, after the location registry had
    // its say. Sealed in here for the same reason placement and channel are:
    // the tracking body is the visitor's, and an impression is what an
    // advertiser pays for.
    countryCode?: string; regionId?: string; cityId?: string; districtId?: string;
  },
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
      co: input.countryCode || undefined,
      rg: input.regionId || undefined,
      ci: input.cityId || undefined,
      di: input.districtId || undefined,
      // Random per mint, so two viewers of the same creative hold different
      // tokens and neither can spend the other's.
      n: crypto.randomUUID(),
      ts: now.getTime(),
    }),
  );
  const signature = await sha256Hex(`${payload}.${getAdSecret()}`);
  return `${payload}.${signature}`;
}

export type VerifiedToken = { payload: TrackingPayload; expired: boolean };

/**
 * Verify a token's signature and shape, reporting expiry separately.
 *
 * The two outcomes need different handling. A bad signature means the token was
 * not minted here at all: reject it. An expired token was genuinely ours, so a
 * click on a page that sat open overnight should still take the visitor to the
 * advertiser -- it just must not be billed. Collapsing both into `null` sent
 * those visitors to the homepage instead of the ad they clicked.
 */
export async function verifyTrackingTokenDetailed(token: string): Promise<VerifiedToken | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = await sha256Hex(`${payload}.${getAdSecret()}`);
  if (expected !== signature) return null;
  try {
    const data = JSON.parse(base64UrlDecode(payload)) as TrackingPayload;
    if (typeof data.cid !== "string" || typeof data.pl !== "string" || typeof data.ts !== "number") return null;
    if (data.ic !== undefined && data.ic !== "commercial") return null;
    if (data.ch !== undefined && data.ch !== "website" && data.ch !== "office") return null;
    if (data.n !== undefined && typeof data.n !== "string") return null;
    return { payload: data, expired: Date.now() - data.ts > TOKEN_TTL_MS };
  } catch {
    return null;
  }
}

export async function verifyTrackingToken(token: string): Promise<TrackingPayload | null> {
  const verified = await verifyTrackingTokenDetailed(token);
  if (!verified || verified.expired) return null;
  return verified.payload;
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

/**
 * Cost of one billable event, from the campaign's own pricing model.
 *
 * `spent_amount` used to be read by the engine's budget gate but written by
 * nothing, so `budget` and `dailyBudget` were permanently inert — a campaign
 * could never exhaust its money. Impressions bill CPM (price per mille) and
 * clicks bill CPC; `fixed` campaigns are flat-rate and accrue nothing per event.
 */
async function eventCost(
  db: D1Database,
  campaignId: string,
  event: "impression" | "click",
): Promise<number> {
  const row = await db
    .prepare("SELECT pricing_model, price FROM ad_campaigns WHERE id = ?1")
    .bind(campaignId)
    .first<{ pricing_model: string | null; price: number | string | null }>();
  if (!row) return 0;
  const price = Number(row.price) || 0;
  if (price <= 0) return 0;
  const model = (row.pricing_model ?? "fixed").toLowerCase();
  if (event === "impression" && model === "cpm") return price / 1000;
  if (event === "click" && model === "cpc") return price;
  return 0;
}

export async function recordImpression(
  db: D1Database,
  campaignId: string,
  ctx: ResolvedAdContext,
  now = new Date(),
  extra: { creativeId?: string | null; inventoryClass?: "commercial" } = {},
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

  const cost = await eventCost(db, campaignId, "impression");
  await upsertDailyStat(db, campaignId, statDate(now), { impressions: 1, uniqueImpressions: unique ? 1 : 0, spent: cost });
  await db
    .prepare(
      `UPDATE ad_campaigns SET
         total_impressions = total_impressions + 1,
         total_unique_impressions = total_unique_impressions + ?,
         spent_amount = spent_amount + ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(unique ? 1 : 0, cost, campaignId)
    .run();
}

export async function recordClick(
  db: D1Database,
  campaignId: string,
  ctx: ResolvedAdContext,
  now = new Date(),
  extra: { creativeId?: string | null; inventoryClass?: "commercial" } = {},
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

  const cost = await eventCost(db, campaignId, "click");
  await upsertDailyStat(db, campaignId, statDate(now), { clicks: 1, spent: cost });
  await db
    .prepare(
      `UPDATE ad_campaigns SET
         total_clicks = total_clicks + 1,
         spent_amount = spent_amount + ?1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?2`,
    )
    .bind(cost, campaignId)
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
         spent_amount = spent_amount + ?1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?2`,
    )
    .bind(value, campaignId)
    .run();
}

export function trackingNow(): string {
  return formatDateTime(new Date());
}
