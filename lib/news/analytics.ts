/**
 * News & Ticker Engine — analytics + delivery counters.
 *
 * Valid impression / click recording with aggregated delivery counters used
 * by the placement limit checks. Rules:
 *  - valid impression = rendered + visible (client signals visibility; the
 *    server accepts a `visible` flag from the ticker after intersection).
 *  - valid click = real user click, excludes prefetch/bots (no user-agent,
 *    `Sec-Purpose: prefetch`, `X-Moz: prefetch`, or headless marker).
 *  - a click without a prior impression for the same placement+session is
 *    still counted for CTR but flagged `valid=0` (no limit consumption).
 */

import type { AnalyticsEventType, NewsChannel } from "@/lib/news/contracts";
import { getNewsDb } from "@/lib/news/db";

export type RecordEventInput = {
  newsId: string;
  channel: NewsChannel;
  eventType: AnalyticsEventType;
  placementId?: string | null;
  userKey?: string | null;
  sessionKey?: string | null;
  countryCode?: string | null;
  cityId?: string | null;
  pagePath?: string | null;
  deviceType?: string | null;
  visible?: boolean;
  request?: Request | null;
};

export function dayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isBotLike(request: Request | null | undefined): boolean {
  if (!request) return false;
  const purpose = request.headers.get("Sec-Purpose") ?? "";
  const xMoz = request.headers.get("X-Moz") ?? "";
  const userAgent = request.headers.get("User-Agent") ?? "";
  const lower = userAgent.toLowerCase();
  return (
    purpose.includes("prefetch") ||
    xMoz.includes("prefetch") ||
    lower.includes("bot") ||
    lower.includes("crawler") ||
    lower.includes("headless") ||
    lower.includes("preview")
  );
}

export async function recordNewsEvent(input: RecordEventInput): Promise<{ recorded: boolean; valid: boolean }> {
  const db = await getNewsDb();

  const isImpression = input.eventType === "impression" || input.eventType === "visible_impression" || input.eventType === "ticker_render";
  const isClick = input.eventType === "click";
  if (!isImpression && !isClick) {
    return { recorded: false, valid: false };
  }

  let valid = true;
  if (isClick) {
    valid = !isBotLike(input.request ?? null);
  } else if (input.eventType === "visible_impression") {
    valid = input.visible === true;
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO news_events
      (id, news_id, placement_id, channel, event_type, user_key, session_key,
       country_code, city_id, page_path, device_type, valid, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
  ).bind(
    id,
    input.newsId,
    input.placementId ?? null,
    input.channel,
    input.eventType,
    input.userKey ?? null,
    input.sessionKey ?? null,
    input.countryCode ?? null,
    input.cityId ?? null,
    input.pagePath ?? null,
    input.deviceType ?? null,
    valid ? 1 : 0,
    now,
  ).run();

  if (valid) {
    await incrementCounter(input.newsId, input.placementId, input.channel, {
      userKey: input.userKey ?? null,
      sessionKey: input.sessionKey ?? null,
      impressions: isImpression && input.eventType !== "visible_impression" ? 1 : 0,
      visibleImpressions: input.eventType === "visible_impression" ? 1 : 0,
      clicks: isClick ? 1 : 0,
    });
  }

  return { recorded: true, valid };
}

export async function incrementCounter(
  newsId: string,
  placementId: string | null | undefined,
  channel: NewsChannel,
  delta: { impressions?: number; visibleImpressions?: number; clicks?: number; userKey?: string | null; sessionKey?: string | null },
): Promise<void> {
  const db = await getNewsDb();
  const dk = dayKey();
  const placementKey = placementId ?? "";
  const userKey = delta.userKey ?? null;
  const sessionKey = delta.sessionKey ?? null;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const existing = await db.prepare(
    "SELECT id FROM news_delivery_counters WHERE news_id = ?1 AND placement_id = ?2 AND day = ?3 AND user_key = ?4 AND session_key = ?5 LIMIT 1",
  ).bind(newsId, placementKey, dk, userKey, sessionKey).first<{ id: string }>();

  if (existing) {
    await db.prepare(
      `UPDATE news_delivery_counters SET
         impressions = impressions + ?2,
         visible_impressions = visible_impressions + ?3,
         clicks = clicks + ?4,
         updated_at = ?5
       WHERE id = ?1`,
    ).bind(existing.id, delta.impressions ?? 0, delta.visibleImpressions ?? 0, delta.clicks ?? 0, now).run();
  } else {
    await db.prepare(
      `INSERT INTO news_delivery_counters
        (id, news_id, placement_id, channel, day, user_key, session_key,
         impressions, visible_impressions, clicks, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)`,
    ).bind(
      crypto.randomUUID(),
      newsId,
      placementKey,
      channel,
      dk,
      userKey,
      sessionKey,
      delta.impressions ?? 0,
      delta.visibleImpressions ?? 0,
      delta.clicks ?? 0,
      now,
    ).run();
  }
}
