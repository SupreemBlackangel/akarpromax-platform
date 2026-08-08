/**
 * News & Ticker Engine — trusted source registry.
 *
 * External ingestion is gated behind an explicit, admin-managed registry.
 * New sources default to REVIEW_REQUIRED; TRUSTED sources may auto-publish
 * drafts after dedupe + sanitization. SSRF-safe URL validation is enforced on
 * every create/update before the URL is ever stored or fetched.
 */

import type { NewsSourceType, TrustLevel } from "@/lib/news/contracts";
import { getNewsDb } from "@/lib/news/db";
import { isSafeFetchUrl } from "@/lib/news/security";

export type NewsSource = {
  id: string;
  name: string;
  url: string;
  sourceType: NewsSourceType;
  format: string;
  countryCode: string | null;
  language: string;
  trustLevel: TrustLevel;
  status: "active" | "paused";
  fetchIntervalMinutes: number;
  lastFetchedAt: string | null;
  lastFetchStatus: string | null;
  lastError: string | null;
  etag: string | null;
  contentHash: string | null;
};

type SourceRow = {
  id: string;
  name: string;
  url: string;
  source_type: string;
  format: string;
  country_code: string | null;
  language: string;
  trust_level: string;
  status: string;
  fetch_interval_minutes: number;
  last_fetched_at: string | null;
  last_fetch_status: string | null;
  last_error: string | null;
  etag: string | null;
  content_hash: string | null;
};

function sourceFromRow(row: SourceRow): NewsSource {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    sourceType: (row.source_type as NewsSourceType) ?? "RSS",
    format: row.format ?? "rss",
    countryCode: row.country_code,
    language: row.language ?? "ar",
    trustLevel: (row.trust_level as TrustLevel) ?? "REVIEW_REQUIRED",
    status: row.status === "paused" ? "paused" : "active",
    fetchIntervalMinutes: Number(row.fetch_interval_minutes) || 60,
    lastFetchedAt: row.last_fetched_at,
    lastFetchStatus: row.last_fetch_status,
    lastError: row.last_error,
    etag: row.etag,
    contentHash: row.content_hash,
  };
}

export function validateSourceInput(input: {
  name: string;
  url: string;
  sourceType?: string;
  format?: string;
  countryCode?: string | null;
  language?: string;
  trustLevel?: string;
  status?: string;
  fetchIntervalMinutes?: number;
}): { ok: boolean; error?: string; normalized?: Partial<NewsSource> } {
  const name = String(input.name ?? "").trim().slice(0, 160);
  if (!name) return { ok: false, error: "Source name is required" };
  const url = String(input.url ?? "").trim().slice(0, 800);
  if (!url) return { ok: false, error: "Source URL is required" };
  if (!isSafeFetchUrl(url)) {
    return { ok: false, error: "URL must be public http(s) — private/local targets are not allowed" };
  }
  const sourceType = (["RSS", "EXTERNAL_API"].includes(input.sourceType ?? "") ? input.sourceType : "RSS") as NewsSourceType;
  const format = String(input.format ?? "rss").toLowerCase().slice(0, 12);
  const countryCode = input.countryCode ? String(input.countryCode).toLowerCase().slice(0, 2) : null;
  const language = String(input.language ?? "ar").toLowerCase().slice(0, 8);
  const trustLevel = (input.trustLevel === "TRUSTED" ? "TRUSTED" : "REVIEW_REQUIRED") as TrustLevel;
  const status = input.status === "paused" ? "paused" : "active";
  const fetchIntervalMinutes = Math.max(15, Math.min(60 * 24 * 7, Math.round(Number(input.fetchIntervalMinutes) || 60)));
  return {
    ok: true,
    normalized: { name, url, sourceType, format, countryCode, language, trustLevel, status, fetchIntervalMinutes },
  };
}

export async function listNewsSources(options?: { status?: string }): Promise<NewsSource[]> {
  const db = await getNewsDb();
  const where = options?.status ? "WHERE status = ?1" : "";
  const params = options?.status ? [options.status] : [];
  const rows = await db
    .prepare(`SELECT * FROM news_sources ${where} ORDER BY name ASC`)
    .bind(...params)
    .all<SourceRow>();
  return (rows.results ?? []).map(sourceFromRow);
}

export async function getNewsSource(id: string): Promise<NewsSource | null> {
  const db = await getNewsDb();
  const row = await db.prepare("SELECT * FROM news_sources WHERE id = ?1").bind(id).first<SourceRow>();
  return row ? sourceFromRow(row) : null;
}

export async function createNewsSource(input: Partial<NewsSource>, createdBy: string | null): Promise<NewsSource> {
  const validation = validateSourceInput(input as { name: string; url: string });
  if (!validation.ok || !validation.normalized) {
    throw new Error(validation.error ?? "Invalid source");
  }
  const db = await getNewsDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db
    .prepare(
      `INSERT INTO news_sources
        (id, name, url, source_type, format, country_code, language,
         trust_level, status, fetch_interval_minutes, created_by, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)`,
    )
    .bind(
      id,
      validation.normalized.name,
      validation.normalized.url,
      validation.normalized.sourceType,
      validation.normalized.format,
      validation.normalized.countryCode,
      validation.normalized.language,
      validation.normalized.trustLevel,
      validation.normalized.status,
      validation.normalized.fetchIntervalMinutes,
      createdBy,
      now,
    )
    .run();
  const created = await getNewsSource(id);
  if (!created) throw new Error("Failed to create source");
  return created;
}

export async function updateNewsSource(id: string, input: Partial<NewsSource>): Promise<NewsSource> {
  const existing = await getNewsSource(id);
  if (!existing) throw new Error("Source not found");
  const merged = { ...existing, ...input };
  const validation = validateSourceInput(merged as { name: string; url: string });
  if (!validation.ok || !validation.normalized) {
    throw new Error(validation.error ?? "Invalid source");
  }
  const db = await getNewsDb();
  await db
    .prepare(
      `UPDATE news_sources SET
         name = ?2, url = ?3, source_type = ?4, format = ?5, country_code = ?6,
         language = ?7, trust_level = ?8, status = ?9, fetch_interval_minutes = ?10,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(
      id,
      validation.normalized.name,
      validation.normalized.url,
      validation.normalized.sourceType,
      validation.normalized.format,
      validation.normalized.countryCode,
      validation.normalized.language,
      validation.normalized.trustLevel,
      validation.normalized.status,
      validation.normalized.fetchIntervalMinutes,
    )
    .run();
  const updated = await getNewsSource(id);
  if (!updated) throw new Error("Source not found after update");
  return updated;
}

export async function deleteNewsSource(id: string): Promise<void> {
  const db = await getNewsDb();
  await db.prepare("DELETE FROM news_sources WHERE id = ?1").bind(id).run();
}

export async function recordSourceFetch(
  id: string,
  status: "ok" | "error",
  error: string | null,
  contentHash?: string,
  etag?: string | null,
): Promise<void> {
  const db = await getNewsDb();
  await db
    .prepare(
      `UPDATE news_sources SET
         last_fetched_at = CURRENT_TIMESTAMP, last_fetch_status = ?2,
         last_error = ?3, content_hash = ?4, etag = ?5, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(id, status, error, contentHash ?? null, etag ?? null)
    .run();
}
