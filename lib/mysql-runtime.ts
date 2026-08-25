import mysql from "mysql2/promise";

import { ensureAdSchema } from "@/lib/ad-schema";
import { ensureI18nSchema } from "@/lib/i18n-schema";
import { ensureServicesSchema } from "@/lib/services-schema";
import { ensureServicesMarketplaceSchema } from "@/lib/services-marketplace-schema";
import { seedServiceTaxonomy, seedServicesMarketplace } from "@services/seed-marketplace";
import { isServicesDemoSeedEnabled } from "@/lib/services/demo-seed-gate";
import { ensurePropertiesSchema } from "@/lib/properties-schema";
import { ensureNewsSchema } from "@/lib/news/schema";

let pool: mysql.Pool | null = null;
let adapter: MysqlRuntimeDb | null = null;
let schemaReady: Promise<void> | null = null;

function getPool(): mysql.Pool {
  if (pool) return pool;
  const url =
    process.env.MYSQL_URL ??
    "mysql://root:root@localhost:3306/akarpromax?charset=utf8mb4";
  pool = mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: 10,
  });
  return pool;
}

export async function getMysqlRuntimeDb(): Promise<D1Database> {
  if (!adapter) adapter = new MysqlRuntimeDb(getPool());
  if (!schemaReady) {
    schemaReady = ensureMysqlSchema(adapter).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
  return adapter;
}

function translateSql(input: string): string {
  const sql = input
    .replace(/\bINSERT OR IGNORE\b/gi, "INSERT IGNORE")
    .replace(/\bON CONFLICT\s*\(([^)]*)\)\s*DO UPDATE SET\b/gi, "ON DUPLICATE KEY UPDATE")
    .replace(/datetime\(\s*'now'\s*\)/gi, "NOW()")
    .replace(/\bdate\(\s*'now'\s*\)/gi, "CURDATE()")
    .replace(/datetime\(\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\)/gi, "$1")
    .replace(/\bCREATE (UNIQUE )?INDEX IF NOT EXISTS\b/gi, "CREATE $1INDEX");
  return sql;
}

type ResultSetHeader = { affectedRows?: number; insertId?: number };

class MysqlStatement implements D1PreparedStatement {
  private values: unknown[] = [];

  constructor(private readonly db: MysqlRuntimeDb, private readonly sql: string) {}

  bind(...values: unknown[]): D1PreparedStatement {
    this.values = values;
    return this;
  }

  /**
   * Expand D1-style numbered placeholders (`?1`, `?2`) into positional `?`
   * while duplicating values so repeated indices (e.g. `?4, ?4`) bind correctly
   * on mysql2, which does not support repeated placeholders.
   */
  private expandPlaceholders(sql: string, values: unknown[]): { sql: string; values: unknown[] } {
    if (!/\?\d+/.test(sql)) return { sql, values };
    const expanded: unknown[] = [];
    const out = sql.replace(/\?\d+/g, (match) => {
      const index = Number(match.slice(1)) - 1;
      const value = values[index];
      expanded.push(value);
      return "?";
    });
    return { sql: out, values: expanded };
  }

  private async runQuery<T>(): Promise<T[]> {
    const { sql, values } = this.expandPlaceholders(this.sql, this.values);
    const [rows] = await this.db.pool.query(translateSql(sql), values as never[]);
    return rows as T[];
  }

  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const rows = await this.runQuery<T>();
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    if (columnName !== undefined) return (row[columnName] as T) ?? null;
    return row as T;
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const rows = await this.runQuery<T>();
    return { success: true, results: rows, meta: {} };
  }

  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const { sql, values } = this.expandPlaceholders(this.sql, this.values);
    const [result] = (await this.db.pool.query(translateSql(sql), values as never[])) as unknown as [
      ResultSetHeader,
      unknown,
    ];
    return {
      success: true,
      results: [] as T[],
      meta: { changes: result?.affectedRows ?? 0, last_row_id: result?.insertId ?? 0 },
    };
  }
}

class MysqlRuntimeDb implements D1Database {
  constructor(readonly pool: mysql.Pool) {}

  prepare(query: string): D1PreparedStatement {
    return new MysqlStatement(this, query);
  }

  async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    for (const statement of statements) {
      results.push(await statement.all<T>());
    }
    return results;
  }
}

const MYSQL_SCHEMA_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS sponsor_access (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name TEXT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'viewer',
    country_code VARCHAR(8) NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS sponsors (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    country_code VARCHAR(8) NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_tr TEXT NOT NULL,
    tier VARCHAR(24) NOT NULL DEFAULT 'exclusive',
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    website_url TEXT NULL,
    logo_url TEXT NULL,
    banner_url VARCHAR(500) NOT NULL DEFAULT '/sponsors/arab-blue.webp',
    contact_name TEXT NULL,
    contact_email TEXT NULL,
    contact_phone TEXT NULL,
    placements VARCHAR(2048) NOT NULL DEFAULT '["header","content","footer"]',
    start_at VARCHAR(40) NULL,
    end_at VARCHAR(40) NULL,
    priority INT NOT NULL DEFAULT 100,
    created_by TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS sponsor_events (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(36) NOT NULL,
    country_code VARCHAR(8) NOT NULL,
    placement TEXT NOT NULL,
    event_type TEXT NOT NULL,
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    actor_user_id TEXT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NULL,
    metadata VARCHAR(2048) NOT NULL DEFAULT '{}',
    ip_address TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ad_assets (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    object_key VARCHAR(255) NOT NULL UNIQUE,
    url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    media_type TEXT NOT NULL,
    size_bytes INT NOT NULL,
    uploaded_by TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ad_campaigns (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    internal_name TEXT NOT NULL,
    advertiser_name TEXT NOT NULL,
    campaign_type VARCHAR(24) NOT NULL DEFAULT 'platform',
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    media_type VARCHAR(16) NOT NULL DEFAULT 'image',
    media_url TEXT NOT NULL,
    mobile_media_url TEXT NULL,
    tablet_media_url TEXT NULL,
    poster_url TEXT NULL,
    channels VARCHAR(128) NOT NULL DEFAULT '["website"]',
    eyebrow_ar TEXT NOT NULL,
    eyebrow_en TEXT NOT NULL,
    eyebrow_tr TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_tr TEXT NOT NULL,
    accent_ar TEXT NOT NULL,
    accent_en TEXT NOT NULL,
    accent_tr TEXT NOT NULL,
    description_ar TEXT NOT NULL,
    description_en TEXT NOT NULL,
    description_tr TEXT NOT NULL,
    cta_ar TEXT NOT NULL,
    cta_en TEXT NOT NULL,
    cta_tr TEXT NOT NULL,
    target_url TEXT NOT NULL,
    countries VARCHAR(2048) NOT NULL DEFAULT '[]',
    cities VARCHAR(2048) NOT NULL DEFAULT '[]',
    languages VARCHAR(2048) NOT NULL DEFAULT '["ar","en","tr"]',
    devices VARCHAR(2048) NOT NULL DEFAULT '["desktop","mobile"]',
    priority INT NOT NULL DEFAULT 100,
    weight INT NOT NULL DEFAULT 100,
    start_at VARCHAR(40) NULL,
    end_at VARCHAR(40) NULL,
    created_by TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    section_scopes TEXT NULL,
    page_types TEXT NULL,
    placements TEXT NULL,
    region_ids TEXT NULL,
    district_ids TEXT NULL,
    latitude REAL NULL,
    longitude REAL NULL,
    radius_km REAL NULL,
    target_all_countries INT NOT NULL DEFAULT 0,
    target_all_regions INT NOT NULL DEFAULT 0,
    target_all_cities INT NOT NULL DEFAULT 0,
    target_all_districts INT NOT NULL DEFAULT 0,
    entity_type VARCHAR(64) NULL,
    entity_ids TEXT NULL,
    category_ids TEXT NULL,
    property_types TEXT NULL,
    service_categories TEXT NULL,
    office_types TEXT NULL,
    tool_categories TEXT NULL,
    operating_systems TEXT NULL,
    daily_start_time VARCHAR(8) NULL,
    daily_end_time VARCHAR(8) NULL,
    days_of_week TEXT NULL,
    rotation_group VARCHAR(64) NULL,
    pricing_model VARCHAR(24) NOT NULL DEFAULT 'fixed',
    price INT NOT NULL DEFAULT 0,
    budget INT NOT NULL DEFAULT 0,
    daily_budget INT NOT NULL DEFAULT 0,
    spent_amount INT NOT NULL DEFAULT 0,
    max_impressions INT NOT NULL DEFAULT 0,
    max_clicks INT NOT NULL DEFAULT 0,
    frequency_cap_per_user INT NOT NULL DEFAULT 0,
    frequency_cap_period VARCHAR(16) NOT NULL DEFAULT 'day',
    approval_status VARCHAR(16) NOT NULL DEFAULT 'approved',
    is_active INT NOT NULL DEFAULT 1,
    is_sponsored INT NOT NULL DEFAULT 0,
    is_featured INT NOT NULL DEFAULT 0,
    is_fallback INT NOT NULL DEFAULT 0,
    is_global INT NOT NULL DEFAULT 0,
    total_impressions INT NOT NULL DEFAULT 0,
    total_unique_impressions INT NOT NULL DEFAULT 0,
    total_clicks INT NOT NULL DEFAULT 0,
    total_unique_clicks INT NOT NULL DEFAULT 0,
    total_conversions INT NOT NULL DEFAULT 0,
    approved_by VARCHAR(255) NULL,
    deleted_at VARCHAR(40) NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ad_events (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    campaign_id VARCHAR(36) NOT NULL,
    event_type TEXT NOT NULL,
    country_code VARCHAR(8) NOT NULL,
    city_id TEXT NULL,
    locale TEXT NOT NULL,
    device TEXT NOT NULL,
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ad_creatives (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    campaign_id VARCHAR(36) NOT NULL,
    media_type TEXT NOT NULL,
    media_url TEXT NOT NULL,
    mobile_media_url TEXT NULL,
    tablet_media_url TEXT NULL,
    poster_url TEXT NULL,
    position INT NOT NULL DEFAULT 1,
    duration_seconds INT NOT NULL DEFAULT 6,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
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
    creative_id VARCHAR(36) NULL,
    channel VARCHAR(16) NOT NULL DEFAULT 'website',
    inventory_class VARCHAR(16) NOT NULL DEFAULT 'commercial',
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
    creative_id VARCHAR(36) NULL,
    channel VARCHAR(16) NOT NULL DEFAULT 'website',
    inventory_class VARCHAR(16) NOT NULL DEFAULT 'commercial',
    target_url VARCHAR(800) NULL,
    clicked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ad_conversions (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    campaign_id VARCHAR(36) NOT NULL,
    conversion_type VARCHAR(32) NOT NULL DEFAULT 'click',
    value INT NOT NULL DEFAULT 0,
    session_id VARCHAR(100) NULL,
    user_id VARCHAR(100) NULL,
    converted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ad_daily_statistics (
    campaign_id VARCHAR(36) NOT NULL,
    stat_date VARCHAR(40) NOT NULL,
    impressions INT NOT NULL DEFAULT 0,
    unique_impressions INT NOT NULL DEFAULT 0,
    clicks INT NOT NULL DEFAULT 0,
    unique_clicks INT NOT NULL DEFAULT 0,
    conversions INT NOT NULL DEFAULT 0,
    spent_amount INT NOT NULL DEFAULT 0,
    PRIMARY KEY (campaign_id, stat_date)
  )`,
  `CREATE TABLE IF NOT EXISTS moderator_scopes (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    module VARCHAR(64) NOT NULL,
    country_code VARCHAR(8) NULL,
    city_id VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX moderator_scopes_user_idx ON moderator_scopes (user_id)`,
  `CREATE INDEX moderator_scopes_module_idx ON moderator_scopes (module)`,
  `CREATE UNIQUE INDEX sponsor_access_email_unique ON sponsor_access (email)`,
  `CREATE INDEX sponsor_access_role_country_idx ON sponsor_access (role, country_code)`,
  `CREATE INDEX sponsors_country_status_priority_idx ON sponsors (country_code, status, priority)`,
  `CREATE INDEX sponsors_campaign_dates_idx ON sponsors (start_at, end_at)`,
  `CREATE INDEX sponsor_events_sponsor_type_idx ON sponsor_events (sponsor_id, event_type)`,
  `CREATE INDEX sponsor_events_country_date_idx ON sponsor_events (country_code, occurred_at)`,
  `CREATE INDEX audit_entity_idx ON audit_logs (entity_type, entity_id)`,
  `CREATE UNIQUE INDEX ad_assets_object_key_unique ON ad_assets (object_key)`,
  `CREATE INDEX ad_assets_media_created_idx ON ad_assets (media_type, created_at)`,
  `CREATE INDEX ad_campaigns_status_dates_idx ON ad_campaigns (status, start_at, end_at)`,
  `CREATE INDEX ad_campaigns_priority_idx ON ad_campaigns (priority, updated_at)`,
  `CREATE INDEX ad_events_campaign_type_idx ON ad_events (campaign_id, event_type)`,
  `CREATE INDEX ad_events_country_date_idx ON ad_events (country_code, occurred_at)`,
  `CREATE INDEX ad_creatives_campaign_position_idx ON ad_creatives (campaign_id, position)`,
  `CREATE INDEX ad_impressions_campaign_date_idx ON ad_impressions (campaign_id, tracked_at)`,
  `CREATE INDEX ad_impressions_creative_idx ON ad_impressions (campaign_id, creative_id)`,
  `CREATE INDEX ad_impressions_channel_class_idx ON ad_impressions (channel, inventory_class)`,
  `CREATE INDEX ad_clicks_campaign_date_idx ON ad_clicks (campaign_id, clicked_at)`,
  `CREATE INDEX ad_clicks_creative_idx ON ad_clicks (campaign_id, creative_id)`,
  `CREATE INDEX ad_conversions_campaign_idx ON ad_conversions (campaign_id, converted_at)`,
  `CREATE INDEX ad_daily_stats_campaign_idx ON ad_daily_statistics (campaign_id, stat_date)`,

  `CREATE TABLE IF NOT EXISTS sponsor_profiles (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_code VARCHAR(255) NOT NULL UNIQUE,
    company_name_ar TEXT NOT NULL,
    company_name_en TEXT NOT NULL,
    logo_url TEXT NULL,
    cover_url TEXT NULL,
    commercial_registration TEXT NULL,
    tax_number TEXT NULL,
    country_code VARCHAR(8) NOT NULL DEFAULT 'OM',
    city_id TEXT NULL,
    district_id TEXT NULL,
    governorate TEXT NULL,
    village TEXT NULL,
    street TEXT NULL,
    address_ar TEXT NULL,
    address_en TEXT NULL,
    contact_name TEXT NULL,
    email TEXT NULL,
    phone TEXT NULL,
    website TEXT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    verified_at VARCHAR(40) NULL,
    approved_at VARCHAR(40) NULL,
    suspended_at VARCHAR(40) NULL,
    created_by TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX sponsor_profiles_code_unique ON sponsor_profiles (sponsor_code)`,
  `CREATE INDEX sponsor_profiles_country_status_idx ON sponsor_profiles (country_code, status)`,

  `CREATE TABLE IF NOT EXISTS sponsor_users (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(36) NOT NULL,
    user_id TEXT NULL,
    email VARCHAR(255) NOT NULL,
    display_name TEXT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'viewer',
    phone TEXT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX sponsor_users_email_unique ON sponsor_users (sponsor_id, email)`,
  `CREATE INDEX sponsor_users_sponsor_idx ON sponsor_users (sponsor_id)`,

  `CREATE TABLE IF NOT EXISTS sponsor_branches (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(36) NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    country_code VARCHAR(8) NOT NULL,
    city_id TEXT NOT NULL,
    district_id TEXT NULL,
    governorate TEXT NULL,
    village TEXT NULL,
    street TEXT NULL,
    address_ar TEXT NULL,
    address_en TEXT NULL,
    phone TEXT NULL,
    email TEXT NULL,
    lat TEXT NULL,
    lng TEXT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX sponsor_branches_sponsor_idx ON sponsor_branches (sponsor_id)`,
  `CREATE INDEX sponsor_branches_location_idx ON sponsor_branches (country_code, city_id)`,

  `CREATE TABLE IF NOT EXISTS sponsor_plans (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    price_monthly INT NOT NULL DEFAULT 0,
    price_yearly INT NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'OMR',
    max_branches INT NOT NULL DEFAULT 0,
    max_users INT NOT NULL DEFAULT 0,
    max_properties INT NOT NULL DEFAULT 0,
    max_ads INT NOT NULL DEFAULT 0,
    features VARCHAR(2048) NOT NULL DEFAULT '[]',
    is_active INT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX sponsor_plans_code_unique ON sponsor_plans (code)`,

  `CREATE TABLE IF NOT EXISTS sponsor_subscriptions (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(36) NOT NULL,
    plan_id VARCHAR(36) NOT NULL,
    start_date VARCHAR(40) NOT NULL,
    end_date VARCHAR(40) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'trial',
    auto_renew INT NOT NULL DEFAULT 1,
    payment_method TEXT NULL,
    notes TEXT NULL,
    created_by TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX sponsor_subscriptions_sponsor_idx ON sponsor_subscriptions (sponsor_id)`,
  `CREATE INDEX sponsor_subscriptions_dates_idx ON sponsor_subscriptions (start_date, end_date)`,

  `CREATE TABLE IF NOT EXISTS sponsor_contracts (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(36) NOT NULL,
    contract_number VARCHAR(255) NOT NULL UNIQUE,
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    file_url TEXT NULL,
    signed_at VARCHAR(40) NULL,
    start_date VARCHAR(40) NOT NULL,
    end_date VARCHAR(40) NOT NULL,
    value INT NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'OMR',
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    notes TEXT NULL,
    created_by TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX sponsor_contracts_sponsor_idx ON sponsor_contracts (sponsor_id)`,

  `CREATE TABLE IF NOT EXISTS sponsor_documents (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(36) NOT NULL,
    type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL,
    notes TEXT NULL,
    uploaded_by TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX sponsor_documents_sponsor_idx ON sponsor_documents (sponsor_id)`,
  `CREATE INDEX sponsor_documents_type_idx ON sponsor_documents (sponsor_id, type)`,

  `CREATE TABLE IF NOT EXISTS sponsor_payments (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(36) NOT NULL,
    subscription_id TEXT NULL,
    invoice_id TEXT NULL,
    amount INT NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'OMR',
    method TEXT NOT NULL,
    reference_number TEXT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    paid_at VARCHAR(40) NULL,
    notes TEXT NULL,
    created_by TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX sponsor_payments_sponsor_idx ON sponsor_payments (sponsor_id)`,
  `CREATE INDEX sponsor_payments_status_idx ON sponsor_payments (status, paid_at)`,

  `CREATE TABLE IF NOT EXISTS sponsor_invoices (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(36) NOT NULL,
    invoice_number VARCHAR(255) NOT NULL UNIQUE,
    subscription_id TEXT NULL,
    contract_id TEXT NULL,
    amount INT NOT NULL DEFAULT 0,
    tax_amount INT NOT NULL DEFAULT 0,
    total_amount INT NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'OMR',
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    due_date VARCHAR(40) NOT NULL,
    paid_at VARCHAR(40) NULL,
    file_url TEXT NULL,
    notes TEXT NULL,
    created_by TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX sponsor_invoices_sponsor_idx ON sponsor_invoices (sponsor_id)`,

  `CREATE TABLE IF NOT EXISTS sponsor_activity_logs (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(36) NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NULL,
    old_values TEXT NULL,
    new_values TEXT NULL,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    created_by TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX sponsor_activity_sponsor_idx ON sponsor_activity_logs (sponsor_id)`,
  `CREATE INDEX sponsor_activity_action_idx ON sponsor_activity_logs (action, created_at)`,

  `CREATE TABLE IF NOT EXISTS office_links (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(36) NOT NULL,
    office_id TEXT NULL,
    device_id TEXT NULL,
    license_key VARCHAR(255) NOT NULL UNIQUE,
    application_version TEXT NULL,
    last_sync_at VARCHAR(40) NULL,
    last_ip TEXT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    activated_at VARCHAR(40) NULL,
    revoked_at VARCHAR(40) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX office_links_sponsor_idx ON office_links (sponsor_id)`,

  `CREATE TABLE IF NOT EXISTS news (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    scope VARCHAR(16) NOT NULL DEFAULT 'global',
    country_code VARCHAR(8) NULL,
    city_id VARCHAR(100) NULL,
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_tr TEXT NOT NULL,
    link_url TEXT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    priority INT NOT NULL DEFAULT 100,
    start_at VARCHAR(40) NULL,
    end_at VARCHAR(40) NULL,
    created_by TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX news_scope_country_idx ON news (status, scope, country_code)`,
];

async function ensureMysqlSchema(db: D1Database): Promise<void> {
  for (const sql of MYSQL_SCHEMA_SQL) {
    try {
      await db.prepare(sql).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Duplicate key name")) throw error;
    }
  }
  await ensureAdSchema(db);
  await ensureI18nSchema(db);
  await ensureServicesSchema(db);
  await ensureServicesMarketplaceSchema(db);
  await ensurePropertiesSchema(db);
  await ensureNewsSchema(db);
  await seedNews(db);
  await seedSponsorPlans(db);
  await seedLocalAdminAccess(db);

  // The Services taxonomy is reference/catalog data and stays unconditional:
  // without it a fresh market has no professions to register against.
  await seedServiceTaxonomy(db);

  // L1C-0.5B1 — CONTAINED. The unconditional Services marketplace demo seed
  // that used to run on every MySQL bootstrap is removed. The demo graph now
  // requires the explicit SEED_DEMO_DATA=true opt-in and is refused under
  // NODE_ENV=production. See lib/services/demo-seed-gate.ts.
  if (isServicesDemoSeedEnabled()) {
    await seedServicesMarketplace(db);
  }
}

async function seedLocalAdminAccess(db: D1Database) {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@localhost.akarpromax").trim().toLowerCase();
  const existing = await db.prepare("SELECT COUNT(*) AS count FROM sponsor_access WHERE lower(email) = ?1").bind(email).first<{ count: number }>();
  if (existing && Number(existing.count) > 0) return;
  await db
    .prepare(
      `INSERT OR IGNORE INTO sponsor_access (id, email, display_name, role, country_code, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, 'super_admin', 'om', 'active', ?4, ?4)`,
    )
    .bind(crypto.randomUUID(), email, "Local Administrator", nowSql())
    .run();
}

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

async function seedNews(db: D1Database) {
  const existing = await db.prepare("SELECT COUNT(*) AS count FROM news WHERE status = 'active'").first<{ count: number }>();
  if (existing && Number(existing.count) > 0) return;

  const items = [
    {
      scope: "global", countryCode: null, cityId: null,
      titleAr: "منصة عقار بروماكس تستعد لإطلاق تجربة عقارية أوضح في عُمان", titleEn: "AkarPromax is preparing a clearer real estate experience in Oman", titleTr: "AkarPromax, Umman'da daha anlaşılır bir gayrimenkul deneyimi hazırlıyor",
      linkUrl: null, priority: 100,
    },
    {
      scope: "global", countryCode: null, cityId: null,
      titleAr: "تحديثات السوق والخدمات العقارية أولًا بأول", titleEn: "Market and property-service updates, one step at a time", titleTr: "Pazar ve gayrimenkul hizmeti güncellemeleri anında",
      linkUrl: null, priority: 200,
    },
    {
      scope: "global", countryCode: null, cityId: null,
      titleAr: "تطبيق AkarPromax Office متصل بالمنصة", titleEn: "AkarPromax Office is connected to the platform", titleTr: "AkarPromax Office platforma bağlı",
      linkUrl: null, priority: 300,
    },
    {
      scope: "country", countryCode: "om", cityId: null,
      titleAr: "سوق مسقط العقاري يشهد إقبالًا متزايدًا على الوحدات السكنية الحديثة", titleEn: "Muscat's property market sees rising demand for modern residential units", titleTr: "Maskat gayrimenkul piyasasında modern konutlara talep artıyor",
      linkUrl: null, priority: 100,
    },
    {
      scope: "country", countryCode: "sa", cityId: null,
      titleAr: "السعودية تطلق مبادرات جديدة لتطوير القطاع العقاري", titleEn: "Saudi Arabia launches new initiatives to develop the real estate sector", titleTr: "Suudi Arabistan gayrimenkul sektörünü geliştirmek için yeni girişimler başlattı",
      linkUrl: null, priority: 100,
    },
    {
      scope: "city", countryCode: "om", cityId: "om-muscat",
      titleAr: "مسقط: إطلاق مشروع تطوير ضواحي العاصمة الجديدة", titleEn: "Muscat: new capital suburbs development project launched", titleTr: "Maskat: yeni başkent banliyö geliştirme projesi başlatıldı",
      linkUrl: null, priority: 100,
    },
    {
      scope: "city", countryCode: "ae", cityId: "ae-dubai",
      titleAr: "دبي: طلب قوي على العقارات الفاخرة خلال الربع الجاري", titleEn: "Dubai: strong demand for luxury properties this quarter", titleTr: "Dubai: bu çeyrekte lüks gayrimenkullere güçlü talep",
      linkUrl: null, priority: 100,
    },
  ];

  const statements = items.map((item) =>
    db.prepare(
      `INSERT OR IGNORE INTO news
        (id, scope, country_code, city_id, title_ar, title_en, title_tr, link_url, status, priority)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'active', ?9)`
    ).bind(
      crypto.randomUUID(), item.scope, item.countryCode, item.cityId,
      item.titleAr, item.titleEn, item.titleTr, item.linkUrl, item.priority,
    )
  );
  await db.batch(statements);
}

async function seedSponsorPlans(db: D1Database) {
  const existing = await db.prepare("SELECT COUNT(*) AS count FROM sponsor_plans").first<{ count: number }>();
  if (existing && Number(existing.count) > 0) return;

  const plans = [
    { nameAr: "مجاني", nameEn: "Free", code: "free", priceMonthly: 0, priceYearly: 0, maxBranches: 1, maxUsers: 1, maxProperties: 3, maxAds: 0, features: ["إعلان واحد", "رعاية بسيطة", "دعم عبر البريد"], sortOrder: 0 },
    { nameAr: "أساسي", nameEn: "Basic", code: "basic", priceMonthly: 99, priceYearly: 999, maxBranches: 3, maxUsers: 5, maxProperties: 20, maxAds: 5, features: ["5 إعلانات", "رعاية متوسطة", "3 فروع", "دعم فني", "تقارير أساسية"], sortOrder: 1 },
    { nameAr: "احترافي", nameEn: "Professional", code: "professional", priceMonthly: 299, priceYearly: 2999, maxBranches: 10, maxUsers: 20, maxProperties: 100, maxAds: 20, features: ["20 إعلان", "رعاية متقدمة", "10 فروع", "دعم فني优先", "تقارير متقدمة", "API مخصص"], sortOrder: 2 },
    { nameAr: "مؤسسي", nameEn: "Enterprise", code: "enterprise", priceMonthly: 999, priceYearly: 9999, maxBranches: 999, maxUsers: 999, maxProperties: 9999, maxAds: 999, features: ["إعلانات غير محدودة", "رعاية حصرية", "فروع غير محدودة", "دعم فني مخصص", "تقارير شاملة", "API كامل", "مدير حساب مخصص"], sortOrder: 3 },
  ];

  const statements = plans.map((plan) =>
    db.prepare(
      `INSERT OR IGNORE INTO sponsor_plans (id, name_ar, name_en, code, price_monthly, price_yearly,
        currency, max_branches, max_users, max_properties, max_ads, features, is_active, sort_order)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 1, ?13)`
    ).bind(
      crypto.randomUUID(), plan.nameAr, plan.nameEn, plan.code,
      plan.priceMonthly, plan.priceYearly, "OMR",
      plan.maxBranches, plan.maxUsers, plan.maxProperties, plan.maxAds,
      JSON.stringify(plan.features), plan.sortOrder,
    )
  );
  await db.batch(statements);
}
