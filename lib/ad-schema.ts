export const AD_CAMPAIGN_NEW_COLUMNS: string[] = [
  `ADD COLUMN mobile_media_url TEXT NULL`,
  `ADD COLUMN tablet_media_url TEXT NULL`,
  `ADD COLUMN section_scopes TEXT NULL`,
  `ADD COLUMN page_types TEXT NULL`,
  `ADD COLUMN placements TEXT NULL`,
  `ADD COLUMN domains TEXT NULL`,
  `ADD COLUMN region_ids TEXT NULL`,
  `ADD COLUMN district_ids TEXT NULL`,
  `ADD COLUMN latitude REAL NULL`,
  `ADD COLUMN longitude REAL NULL`,
  `ADD COLUMN radius_km REAL NULL`,
  `ADD COLUMN target_all_countries INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN target_all_regions INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN target_all_cities INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN target_all_districts INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN entity_type VARCHAR(64) NULL`,
  `ADD COLUMN entity_ids TEXT NULL`,
  `ADD COLUMN category_ids TEXT NULL`,
  `ADD COLUMN property_types TEXT NULL`,
  `ADD COLUMN service_categories TEXT NULL`,
  `ADD COLUMN office_types TEXT NULL`,
  `ADD COLUMN tool_categories TEXT NULL`,
  `ADD COLUMN operating_systems TEXT NULL`,
  `ADD COLUMN daily_start_time VARCHAR(8) NULL`,
  `ADD COLUMN daily_end_time VARCHAR(8) NULL`,
  `ADD COLUMN days_of_week TEXT NULL`,
  `ADD COLUMN rotation_group VARCHAR(64) NULL`,
  `ADD COLUMN pricing_model VARCHAR(24) NOT NULL DEFAULT 'fixed'`,
  `ADD COLUMN price INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN budget INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN daily_budget INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN spent_amount INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN max_impressions INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN max_clicks INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN frequency_cap_per_user INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN frequency_cap_period VARCHAR(16) NOT NULL DEFAULT 'day'`,
  `ADD COLUMN approval_status VARCHAR(16) NOT NULL DEFAULT 'approved'`,
  `ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`,
  `ADD COLUMN is_sponsored INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN is_fallback INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN is_global INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN total_impressions INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN total_unique_impressions INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN total_clicks INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN total_unique_clicks INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN total_conversions INTEGER NOT NULL DEFAULT 0`,
  `ADD COLUMN approved_by VARCHAR(255) NULL`,
  `ADD COLUMN deleted_at VARCHAR(40) NULL`,
];

const AD_CAMPAIGN_MODIFY_REPAIR: string[] = [
  `ALTER TABLE ad_campaigns MODIFY section_scopes TEXT NULL`,
  `ALTER TABLE ad_campaigns MODIFY page_types TEXT NULL`,
  `ALTER TABLE ad_campaigns MODIFY placements TEXT NULL`,
  `ALTER TABLE ad_campaigns MODIFY region_ids TEXT NULL`,
  `ALTER TABLE ad_campaigns MODIFY district_ids TEXT NULL`,
  `ALTER TABLE ad_campaigns MODIFY entity_ids TEXT NULL`,
  `ALTER TABLE ad_campaigns MODIFY category_ids TEXT NULL`,
  `ALTER TABLE ad_campaigns MODIFY property_types TEXT NULL`,
  `ALTER TABLE ad_campaigns MODIFY service_categories TEXT NULL`,
  `ALTER TABLE ad_campaigns MODIFY office_types TEXT NULL`,
  `ALTER TABLE ad_campaigns MODIFY tool_categories TEXT NULL`,
  `ALTER TABLE ad_campaigns MODIFY operating_systems TEXT NULL`,
  `ALTER TABLE ad_campaigns MODIFY days_of_week TEXT NULL`,
];

export const AD_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS ad_impressions (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    campaign_id VARCHAR(36) NOT NULL,
    placement VARCHAR(64) NULL,
    section VARCHAR(32) NULL,
    page_type VARCHAR(32) NULL,
    entity_type VARCHAR(64) NULL,
    entity_id VARCHAR(100) NULL,
    country_code VARCHAR(8) NULL,
    region_id VARCHAR(100) NULL,
    city_id VARCHAR(100) NULL,
    district_id VARCHAR(100) NULL,
    locale VARCHAR(8) NOT NULL DEFAULT 'ar',
    device VARCHAR(16) NOT NULL DEFAULT 'desktop',
    session_id VARCHAR(100) NULL,
    user_id VARCHAR(100) NULL,
    tracked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ad_clicks (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    campaign_id VARCHAR(36) NOT NULL,
    placement VARCHAR(64) NULL,
    section VARCHAR(32) NULL,
    page_type VARCHAR(32) NULL,
    entity_type VARCHAR(64) NULL,
    entity_id VARCHAR(100) NULL,
    country_code VARCHAR(8) NULL,
    region_id VARCHAR(100) NULL,
    city_id VARCHAR(100) NULL,
    district_id VARCHAR(100) NULL,
    locale VARCHAR(8) NOT NULL DEFAULT 'ar',
    device VARCHAR(16) NOT NULL DEFAULT 'desktop',
    session_id VARCHAR(100) NULL,
    user_id VARCHAR(100) NULL,
    target_url VARCHAR(800) NULL,
    clicked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ad_conversions (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    campaign_id VARCHAR(36) NOT NULL,
    conversion_type VARCHAR(32) NOT NULL DEFAULT 'click',
    value INTEGER NOT NULL DEFAULT 0,
    session_id VARCHAR(100) NULL,
    user_id VARCHAR(100) NULL,
    converted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ad_daily_statistics (
    campaign_id VARCHAR(36) NOT NULL,
    stat_date VARCHAR(40) NOT NULL,
    impressions INTEGER NOT NULL DEFAULT 0,
    unique_impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    unique_clicks INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    spent_amount INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (campaign_id, stat_date)
  )`,
];

export const AD_TABLE_INDEXES: string[] = [
  `CREATE INDEX IF NOT EXISTS ad_impressions_campaign_date_idx ON ad_impressions (campaign_id, tracked_at)`,
  `CREATE INDEX IF NOT EXISTS ad_impressions_session_idx ON ad_impressions (session_id)`,
  `CREATE INDEX IF NOT EXISTS ad_impressions_geo_idx ON ad_impressions (country_code, city_id)`,
  `CREATE INDEX IF NOT EXISTS ad_clicks_campaign_date_idx ON ad_clicks (campaign_id, clicked_at)`,
  `CREATE INDEX IF NOT EXISTS ad_clicks_session_idx ON ad_clicks (session_id)`,
  `CREATE INDEX IF NOT EXISTS ad_conversions_campaign_idx ON ad_conversions (campaign_id, converted_at)`,
  `CREATE INDEX IF NOT EXISTS ad_daily_stats_campaign_idx ON ad_daily_statistics (campaign_id, stat_date)`,
];

function isDuplicateColumnError(message: string): boolean {
  return /duplicate column|already exists/i.test(message);
}

function isDuplicateKeyError(message: string): boolean {
  return /duplicate (key|index|column)|already exists/i.test(message);
}

export async function ensureAdSchema(db: D1Database): Promise<void> {
  for (const sql of AD_CAMPAIGN_MODIFY_REPAIR) {
    try {
      await db.prepare(sql).run();
    } catch {
      // SQLite/D1 does not support MODIFY; ignore.
    }
  }

  for (const column of AD_CAMPAIGN_NEW_COLUMNS) {
    try {
      await db.prepare(`ALTER TABLE ad_campaigns ${column}`).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isDuplicateColumnError(message)) throw error;
    }
  }

  for (const sql of AD_TABLES_SQL) {
    await db.prepare(sql).run();
  }

  for (const sql of AD_TABLE_INDEXES) {
    try {
      await db.prepare(sql).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isDuplicateKeyError(message)) throw error;
    }
  }
}
