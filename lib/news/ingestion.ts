/**
 * News & Ticker Engine — automated ingestion.
 *
 * Fetches external feeds through the trusted-source registry only. Every
 * external item lands as a news DRAFT (status 'draft') with reviewStatus
 * REVIEW_REQUIRED unless the source is TRUSTED (still reviewed, but may be
 * auto-promoted by the admin workflow). Dedupe uses a stable content hash
 * (title + link + pubDate), so re-fetching a feed never duplicates rows.
 *
 * THE AI NEVER INVENTS NEWS: the engine stores exactly what the feed said,
 * keeps the source attribution, and never fabricates facts, quotes, dates or
 * regulations. Summarization/translation (if any) happens downstream under
 * explicit admin control.
 */

import { entryContentHash, parseFeed } from "@/lib/news/rss";
import { getNewsDb } from "@/lib/news/db";
import { sanitizeHtml, isSafeFetchUrl } from "@/lib/news/security";
import { getNewsSource, recordSourceFetch, type NewsSource } from "@/lib/news/sources";
import type { NewsSourceType } from "@/lib/news/contracts";

export const FETCH_TIMEOUT_MS = 15_000;
export const MAX_FEED_BYTES = 512 * 1024;
const MAX_FETCH_REDIRECTS = 5;

const RELEVANCE_KEYWORDS = [
  "عقار", "عقارات", "عقارية", "إيجار", "إيجارات", "بيع", "تمليك", "أراضي",
  "مخطط", "وحدات", "فيلا", "شقة", "شقق", "تطوير", "مشروع", "ضاحية",
  "property", "real estate", "rental", "lease", "villa", "apartment",
  "housing", "development", "mortgage", "realestate", "emlak", "kira",
  "gayrimenkul", "arsa", "konut", "villa", "daire",
];

export type IngestionSummary = {
  sourceId: string;
  sourceName: string;
  fetched: boolean;
  entries: number;
  newItems: number;
  duplicates: number;
  errors: string[];
};

export function relevanceScore(title: string, description: string | null): number {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  let score = 0;
  for (const keyword of RELEVANCE_KEYWORDS) {
    if (text.includes(keyword)) score += 1;
  }
  return score;
}

function normalizePubDate(raw: string | null): string | null {
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 19).replace("T", " ");
}

async function fetchFeedText(source: NewsSource): Promise<{ text: string; etag: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let currentUrl = source.url;
    let response: Response | null = null;
    for (let redirectCount = 0; redirectCount <= MAX_FETCH_REDIRECTS; redirectCount += 1) {
      if (!isSafeFetchUrl(currentUrl)) {
        throw new Error("Blocked: source URL is not a public http(s) endpoint");
      }
      response = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
          "User-Agent": "AkarPromaxNewsBot/1.0",
        },
        redirect: "manual",
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error(`HTTP ${response.status}`);
        }
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      break;
    }
    if (!response) {
      throw new Error("Empty response");
    }
    if (response.status >= 300 && response.status < 400) {
      throw new Error(`Too many redirects (max ${MAX_FETCH_REDIRECTS})`);
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const etag = response.headers.get("etag");
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_FEED_BYTES) {
      throw new Error(`Feed too large (${buffer.byteLength} bytes)`);
    }
    const text = new TextDecoder().decode(buffer);
    if (!text.trim()) throw new Error("Empty feed");
    return { text, etag };
  } finally {
    clearTimeout(timer);
  }
}

export async function ingestSource(sourceId: string): Promise<IngestionSummary> {
  const summary: IngestionSummary = {
    sourceId,
    sourceName: "",
    fetched: false,
    entries: 0,
    newItems: 0,
    duplicates: 0,
    errors: [],
  };
  const source = await getNewsSource(sourceId);
  if (!source) {
    summary.errors.push("Source not found");
    return summary;
  }
  summary.sourceName = source.name;
  if (source.status !== "active") {
    summary.errors.push("Source is paused");
    return summary;
  }

  let text: string;
  let etag: string | null = null;
  try {
    ({ text, etag } = await fetchFeedText(source));
    summary.fetched = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    summary.errors.push(message);
    await recordSourceFetch(sourceId, "error", message.slice(0, 500));
    return summary;
  }

  const feed = parseFeed(text);
  summary.entries = feed.entries.length;

  const db = await getNewsDb();
  let newItems = 0;
  let duplicates = 0;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const scope = source.countryCode ? "country" : "global";
  const countryCode = source.countryCode ?? null;

  for (const entry of feed.entries) {
    if (!entry.title) {
      duplicates += 1;
      continue;
    }
    const contentHash = entryContentHash(entry);
    const existing = await db
      .prepare("SELECT news_id FROM news_extended WHERE content_hash = ?1 LIMIT 1")
      .bind(contentHash)
      .first<{ news_id: string }>();
    if (existing) {
      duplicates += 1;
      continue;
    }
    const id = crypto.randomUUID();
    const titleAr = entry.title.slice(0, 255);
    const titleEn = entry.title.slice(0, 255);
    const titleTr = entry.title.slice(0, 255);
    const description = entry.description ? sanitizeHtml(entry.description) : null;
    const publishedAt = normalizePubDate(entry.pubDate);
    const sourceType: NewsSourceType = source.sourceType ?? "RSS";
    const reviewStatus = "REVIEW_REQUIRED";

    await db.prepare(
      `INSERT INTO news
        (id, scope, country_code, city_id, title_ar, title_en, title_tr,
         link_url, status, priority, start_at, end_at, created_by,
         created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'draft', 100, ?9, NULL, ?10, ?11, ?11)`,
    ).bind(id, scope, countryCode, null, titleAr, titleEn, titleTr, entry.link, publishedAt, sourceId, now).run();
    await db.prepare(
      `INSERT INTO news_extended
        (news_id, slug, summary_ar, summary_en, summary_tr, body_ar, body_en, body_tr,
         category, tags, image_url, is_breaking, is_pinned, language, news_type,
         source_name, source_url, source_published_at, fetched_at, content_hash,
         external_id, review_status, created_at, updated_at)
       VALUES (?1, NULL, ?2, ?3, ?4, NULL, NULL, NULL, 'GENERAL', ?5, NULL, 0, 0,
         ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?15)`,
    ).bind(
      id,
      description?.slice(0, 300) ?? null,
      description?.slice(0, 300) ?? null,
      description?.slice(0, 300) ?? null,
      JSON.stringify(entry.categories.slice(0, 10)),
      source.language ?? "ar",
      sourceType,
      source.name,
      entry.link,
      publishedAt,
      now,
      contentHash,
      entry.guid ?? entry.link,
      reviewStatus,
      now,
    ).run();
    newItems += 1;
  }

  await recordSourceFetch(sourceId, "ok", null, feed.rawHash ?? undefined, etag);
  summary.newItems = newItems;
  summary.duplicates = duplicates;
  return summary;
}
