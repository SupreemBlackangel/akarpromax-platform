/**
 * News & Ticker Engine — additive schema.
 *
 * The base `news` table (content-schema / mysql-runtime) stays untouched.
 * Rich editorial fields live in `news_extended` keyed 1:1 by news id; the
 * placement / source / counters / events tables power targeting, limits and
 * analytics. All statements are additive and safe on both D1 (vinext dev)
 * and MySQL (vinext start via translateSql).
 */

export const NEWS_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS news_extended (
    news_id TEXT PRIMARY KEY NOT NULL,
    slug TEXT NULL,
    summary_ar TEXT NULL,
    summary_en TEXT NULL,
    summary_tr TEXT NULL,
    body_ar TEXT NULL,
    body_en TEXT NULL,
    body_tr TEXT NULL,
    category TEXT NOT NULL DEFAULT 'GENERAL',
    tags TEXT NOT NULL DEFAULT '[]',
    image_url TEXT NULL,
    is_breaking INTEGER NOT NULL DEFAULT 0,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    language TEXT NOT NULL DEFAULT 'ar',
    news_type TEXT NOT NULL DEFAULT 'MANUAL',
    source_name TEXT NULL,
    source_url TEXT NULL,
    source_published_at TEXT NULL,
    fetched_at TEXT NULL,
    content_hash TEXT NULL,
    external_id TEXT NULL,
    review_status TEXT NOT NULL DEFAULT 'APPROVED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS news_placements (
    id TEXT PRIMARY KEY NOT NULL,
    news_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    page_mode TEXT NOT NULL DEFAULT 'ALL_PAGES',
    page_codes TEXT NOT NULL DEFAULT '[]',
    country_code TEXT NULL,
    city_id TEXT NULL,
    language TEXT NULL,
    audiences TEXT NOT NULL DEFAULT '[]',
    priority INTEGER NOT NULL DEFAULT 100,
    manual_order INTEGER NULL,
    max_impressions INTEGER NULL,
    max_clicks INTEGER NULL,
    max_per_user_per_day INTEGER NULL,
    max_per_session INTEGER NULL,
    start_at TEXT NULL,
    end_at TEXT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS news_sources (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'RSS',
    format TEXT NOT NULL DEFAULT 'rss',
    country_code TEXT NULL,
    language TEXT NOT NULL DEFAULT 'ar',
    trust_level TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
    status TEXT NOT NULL DEFAULT 'active',
    fetch_interval_minutes INTEGER NOT NULL DEFAULT 60,
    last_fetched_at TEXT NULL,
    last_fetch_status TEXT NULL,
    last_error TEXT NULL,
    etag TEXT NULL,
    content_hash TEXT NULL,
    created_by TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS news_delivery_counters (
    id TEXT PRIMARY KEY NOT NULL,
    news_id TEXT NOT NULL,
    placement_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    day TEXT NOT NULL,
    user_key TEXT NULL,
    session_key TEXT NULL,
    impressions INTEGER NOT NULL DEFAULT 0,
    visible_impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS news_events (
    id TEXT PRIMARY KEY NOT NULL,
    news_id TEXT NOT NULL,
    placement_id TEXT NULL,
    channel TEXT NOT NULL,
    event_type TEXT NOT NULL,
    user_key TEXT NULL,
    session_key TEXT NULL,
    country_code TEXT NULL,
    city_id TEXT NULL,
    page_path TEXT NULL,
    device_type TEXT NULL,
    valid INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

export const NEWS_INDEXES_SQL: string[] = [
  `CREATE INDEX IF NOT EXISTS news_extended_hash_idx ON news_extended (content_hash)`,
  `CREATE INDEX IF NOT EXISTS news_extended_external_idx ON news_extended (external_id)`,
  `CREATE INDEX IF NOT EXISTS news_placements_news_idx ON news_placements (news_id)`,
  `CREATE INDEX IF NOT EXISTS news_placements_channel_idx ON news_placements (channel, status)`,
  `CREATE INDEX IF NOT EXISTS news_sources_status_idx ON news_sources (status)`,
  `CREATE INDEX IF NOT EXISTS news_counters_lookup_idx ON news_delivery_counters (news_id, placement_id, day)`,
  `CREATE INDEX IF NOT EXISTS news_events_news_idx ON news_events (news_id, event_type)`,
  `CREATE INDEX IF NOT EXISTS news_events_created_idx ON news_events (created_at)`,
];

function isDuplicateKeyError(message: string): boolean {
  return /duplicate (key|index|column)|already exists/i.test(message);
}

export async function ensureNewsSchema(db: D1Database): Promise<void> {
  for (const sql of NEWS_TABLES_SQL) {
    await db.prepare(sql).run();
  }
  for (const sql of NEWS_INDEXES_SQL) {
    try {
      await db.prepare(sql).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isDuplicateKeyError(message)) throw error;
    }
  }
}
