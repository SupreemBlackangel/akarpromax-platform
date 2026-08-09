/**
 * News & Ticker Engine — placement registry (CRUD).
 *
 * Placements control how a news item is delivered on each channel: which
 * pages/groups, geo, language and audiences it targets, its limits, schedule
 * and pause state. Default placement semantics live in the delivery layer
 * (`defaultPlacementFor`); rows here only exist when an admin has explicitly
 * configured targeting for a channel.
 */

import {
  NEWS_CHANNELS,
  PAGE_TARGET_MODES,
  type NewsChannel,
  type NewsLimitSet,
  type NewsPlacement,
  type PageTargetMode,
} from "@/lib/news/contracts";
import { getNewsDb } from "@/lib/news/db";

export type PlacementRow = {
  id: string;
  news_id: string;
  channel: string;
  page_mode: string;
  page_codes: string;
  country_code: string | null;
  city_id: string | null;
  language: string | null;
  audiences: string;
  priority: number | null;
  manual_order: number | null;
  max_impressions: number | null;
  max_clicks: number | null;
  max_per_user_per_day: number | null;
  max_per_session: number | null;
  start_at: string | null;
  end_at: string | null;
  status: string;
};

function parseJsonList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function placementFromRow(row: PlacementRow): NewsPlacement {
  const limits: NewsLimitSet = {
    maxImpressions: row.max_impressions,
    maxClicks: row.max_clicks,
    maxPerUserPerDay: row.max_per_user_per_day,
    maxPerSession: row.max_per_session,
  };
  return {
    id: row.id,
    newsId: row.news_id,
    channel: (row.channel as NewsChannel) ?? "WEBSITE_TICKER",
    pageMode: (row.page_mode as PageTargetMode) ?? "ALL_PAGES",
    pageCodes: parseJsonList(row.page_codes),
    countryCode: row.country_code,
    cityId: row.city_id,
    language: row.language,
    audiences: parseJsonList(row.audiences),
    priority: Number(row.priority) || 100,
    manualOrder: row.manual_order,
    limits,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status === "paused" ? "paused" : "active",
  };
}

function toJsonList(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => String(item).trim().slice(0, 120)).filter(Boolean).slice(0, 50));
  return "[]";
}

function cleanNumber(value: unknown, fallback: number | null, min = 0, max = 9_999_999): number | null {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export function validatePlacementInput(input: Partial<NewsPlacement>): { ok: boolean; error?: string; normalized?: Partial<NewsPlacement> } {
  const channel = input.channel && NEWS_CHANNELS.includes(input.channel) ? input.channel : null;
  if (!channel) return { ok: false, error: "Valid channel is required" };
  const pageMode = input.pageMode && PAGE_TARGET_MODES.includes(input.pageMode) ? input.pageMode : "ALL_PAGES";
  return {
    ok: true,
    normalized: {
      channel,
      pageMode,
      pageCodes: Array.isArray(input.pageCodes) ? input.pageCodes.map(String).slice(0, 50) : [],
      countryCode: input.countryCode ? String(input.countryCode).toLowerCase().slice(0, 2) : null,
      cityId: input.cityId ? String(input.cityId).toLowerCase().slice(0, 100) : null,
      language: input.language ? String(input.language).toLowerCase().slice(0, 8) : null,
      audiences: Array.isArray(input.audiences) ? input.audiences.map(String).slice(0, 50) : [],
      priority: Math.max(1, Math.min(999, Number(input.priority) || 100)),
      manualOrder: input.manualOrder == null || String(input.manualOrder).trim() === "" ? null : Math.max(0, Math.min(9999, Number(input.manualOrder) || 0)),
      limits: {
        maxImpressions: cleanNumber(input.limits?.maxImpressions, null),
        maxClicks: cleanNumber(input.limits?.maxClicks, null),
        maxPerUserPerDay: cleanNumber(input.limits?.maxPerUserPerDay, null),
        maxPerSession: cleanNumber(input.limits?.maxPerSession, null),
      },
      startAt: input.startAt ? String(input.startAt).slice(0, 40) : null,
      endAt: input.endAt ? String(input.endAt).slice(0, 40) : null,
      status: input.status === "paused" ? "paused" : "active",
    },
  };
}

export async function listNewsPlacements(newsId?: string, channel?: string): Promise<NewsPlacement[]> {
  const db = await getNewsDb();
  const clauses: string[] = [];
  const params: string[] = [];
  if (newsId) {
    clauses.push("news_id = ?1");
    params.push(newsId);
  }
  if (channel) {
    clauses.push(`channel = ?${params.length + 1}`);
    params.push(channel);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await db
    .prepare(`SELECT * FROM news_placements ${where} ORDER BY priority ASC, created_at DESC`)
    .bind(...params)
    .all<PlacementRow>();
  return (rows.results ?? []).map(placementFromRow);
}

export async function createNewsPlacement(newsId: string, input: Partial<NewsPlacement>): Promise<NewsPlacement> {
  const validation = validatePlacementInput(input);
  if (!validation.ok || !validation.normalized) {
    throw new Error(validation.error ?? "Invalid placement");
  }
  const normalized = validation.normalized;
  const db = await getNewsDb();
  const existing = await db.prepare("SELECT id FROM news WHERE id = ?1 LIMIT 1").bind(newsId).first<{ id: string }>();
  if (!existing) throw new Error("News item not found");
  const id = crypto.randomUUID();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db
    .prepare(
      `INSERT INTO news_placements
        (id, news_id, channel, page_mode, page_codes, country_code, city_id,
         language, audiences, priority, manual_order,
         max_impressions, max_clicks, max_per_user_per_day, max_per_session,
         start_at, end_at, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?19)`,
    )
    .bind(
      id,
      newsId,
      normalized.channel,
      normalized.pageMode,
      toJsonList(normalized.pageCodes),
      normalized.countryCode,
      normalized.cityId,
      normalized.language,
      toJsonList(normalized.audiences),
      normalized.priority,
      normalized.manualOrder,
      normalized.limits?.maxImpressions ?? null,
      normalized.limits?.maxClicks ?? null,
      normalized.limits?.maxPerUserPerDay ?? null,
      normalized.limits?.maxPerSession ?? null,
      normalized.startAt,
      normalized.endAt,
      normalized.status,
      now,
    )
    .run();
  const created = await listNewsPlacements(newsId);
  const placement = created.find((item) => item.id === id);
  if (!placement) throw new Error("Failed to create placement");
  return placement;
}

export async function updateNewsPlacement(id: string, input: Partial<NewsPlacement>): Promise<NewsPlacement> {
  const db = await getNewsDb();
  const existing = await db.prepare("SELECT * FROM news_placements WHERE id = ?1 LIMIT 1").bind(id).first<PlacementRow>();
  if (!existing) throw new Error("Placement not found");
  const merged = { ...placementFromRow(existing), ...input };
  const validation = validatePlacementInput(merged);
  if (!validation.ok || !validation.normalized) {
    throw new Error(validation.error ?? "Invalid placement");
  }
  const normalized = validation.normalized;
  await db
    .prepare(
      `UPDATE news_placements SET
         channel = ?2, page_mode = ?3, page_codes = ?4, country_code = ?5,
         city_id = ?6, language = ?7, audiences = ?8, priority = ?9,
         manual_order = ?10, max_impressions = ?11, max_clicks = ?12,
         max_per_user_per_day = ?13, max_per_session = ?14,
         start_at = ?15, end_at = ?16, status = ?17, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(
      id,
      normalized.channel,
      normalized.pageMode,
      toJsonList(normalized.pageCodes),
      normalized.countryCode,
      normalized.cityId,
      normalized.language,
      toJsonList(normalized.audiences),
      normalized.priority,
      normalized.manualOrder,
      normalized.limits?.maxImpressions ?? null,
      normalized.limits?.maxClicks ?? null,
      normalized.limits?.maxPerUserPerDay ?? null,
      normalized.limits?.maxPerSession ?? null,
      normalized.startAt,
      normalized.endAt,
      normalized.status,
    )
    .run();
  const updated = await listNewsPlacements(existing.news_id);
  const placement = updated.find((item) => item.id === id);
  if (!placement) throw new Error("Placement not found after update");
  return placement;
}

export async function deleteNewsPlacement(id: string): Promise<void> {
  const db = await getNewsDb();
  await db.prepare("DELETE FROM news_placements WHERE id = ?1").bind(id).run();
}

export async function setPlacementStatus(id: string, status: "active" | "paused"): Promise<NewsPlacement> {
  return updateNewsPlacement(id, { status });
}
