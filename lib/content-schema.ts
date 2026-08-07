import { ensureAdSchema } from "@/lib/ad-schema";
import { ensureI18nSchema } from "@/lib/i18n-schema";
import { ensureServicesSchema } from "@/lib/services-schema";
import { ensureServicesMarketplaceSchema } from "@/lib/services-marketplace-schema";
import { seedServicesMarketplace } from "@services/seed-marketplace";
import { ensurePropertiesSchema } from "@/lib/properties-schema";
import { ensureIntegrationSchema } from "@/lib/integration/schema";
import { isProduction } from "@/lib/config/runtime-env";

export const CONTENT_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS sponsor_access (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'viewer',
    country_code TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS sponsors (
    id TEXT PRIMARY KEY NOT NULL,
    country_code TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_tr TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'exclusive',
    status TEXT NOT NULL DEFAULT 'draft',
    website_url TEXT,
    logo_url TEXT,
    banner_url TEXT NOT NULL DEFAULT '/sponsors/arab-blue.webp',
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    placements TEXT NOT NULL DEFAULT '["header","content","footer"]',
    start_at TEXT,
    end_at TEXT,
    priority INTEGER NOT NULL DEFAULT 100,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS sponsor_events (
    id TEXT PRIMARY KEY NOT NULL,
    sponsor_id TEXT NOT NULL,
    country_code TEXT NOT NULL,
    placement TEXT NOT NULL,
    event_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    actor_user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ad_assets (
    id TEXT PRIMARY KEY NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    media_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    uploaded_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ad_campaigns (
    id TEXT PRIMARY KEY NOT NULL,
    internal_name TEXT NOT NULL,
    advertiser_name TEXT NOT NULL,
    campaign_type TEXT NOT NULL DEFAULT 'platform',
    status TEXT NOT NULL DEFAULT 'draft',
    media_type TEXT NOT NULL DEFAULT 'image',
    media_url TEXT NOT NULL,
    mobile_media_url TEXT,
    tablet_media_url TEXT,
    poster_url TEXT,
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
    countries TEXT NOT NULL DEFAULT '[]',
    cities TEXT NOT NULL DEFAULT '[]',
    languages TEXT NOT NULL DEFAULT '["ar","en","tr"]',
    devices TEXT NOT NULL DEFAULT '["desktop","mobile"]',
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    start_at TEXT,
    end_at TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    section_scopes TEXT,
    page_types TEXT,
    placements TEXT,
    region_ids TEXT,
    district_ids TEXT,
    latitude REAL,
    longitude REAL,
    radius_km REAL,
    target_all_countries INTEGER NOT NULL DEFAULT 0,
    target_all_regions INTEGER NOT NULL DEFAULT 0,
    target_all_cities INTEGER NOT NULL DEFAULT 0,
    target_all_districts INTEGER NOT NULL DEFAULT 0,
    entity_type TEXT,
    entity_ids TEXT,
    category_ids TEXT,
    property_types TEXT,
    service_categories TEXT,
    office_types TEXT,
    tool_categories TEXT,
    operating_systems TEXT,
    daily_start_time TEXT,
    daily_end_time TEXT,
    days_of_week TEXT,
    rotation_group TEXT,
    pricing_model TEXT NOT NULL DEFAULT 'fixed',
    price INTEGER NOT NULL DEFAULT 0,
    budget INTEGER NOT NULL DEFAULT 0,
    daily_budget INTEGER NOT NULL DEFAULT 0,
    spent_amount INTEGER NOT NULL DEFAULT 0,
    max_impressions INTEGER NOT NULL DEFAULT 0,
    max_clicks INTEGER NOT NULL DEFAULT 0,
    frequency_cap_per_user INTEGER NOT NULL DEFAULT 0,
    frequency_cap_period TEXT NOT NULL DEFAULT 'day',
    approval_status TEXT NOT NULL DEFAULT 'approved',
    is_active INTEGER NOT NULL DEFAULT 1,
    is_sponsored INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0,
    is_fallback INTEGER NOT NULL DEFAULT 0,
    is_global INTEGER NOT NULL DEFAULT 0,
    total_impressions INTEGER NOT NULL DEFAULT 0,
    total_unique_impressions INTEGER NOT NULL DEFAULT 0,
    total_clicks INTEGER NOT NULL DEFAULT 0,
    total_unique_clicks INTEGER NOT NULL DEFAULT 0,
    total_conversions INTEGER NOT NULL DEFAULT 0,
    approved_by TEXT,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS ad_events (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    country_code TEXT NOT NULL,
    city_id TEXT,
    locale TEXT NOT NULL,
    device TEXT NOT NULL,
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ad_creatives (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    media_type TEXT NOT NULL,
    media_url TEXT NOT NULL,
    mobile_media_url TEXT,
    poster_url TEXT,
    position INTEGER NOT NULL DEFAULT 1,
    duration_seconds INTEGER NOT NULL DEFAULT 6,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS sponsor_access_email_unique ON sponsor_access (email)`,
  `CREATE INDEX IF NOT EXISTS sponsor_access_role_country_idx ON sponsor_access (role, country_code)`,
  `CREATE INDEX IF NOT EXISTS sponsors_country_status_priority_idx ON sponsors (country_code, status, priority)`,
  `CREATE INDEX IF NOT EXISTS sponsors_campaign_dates_idx ON sponsors (start_at, end_at)`,
  `CREATE INDEX IF NOT EXISTS sponsor_events_sponsor_type_idx ON sponsor_events (sponsor_id, event_type)`,
  `CREATE INDEX IF NOT EXISTS sponsor_events_country_date_idx ON sponsor_events (country_code, occurred_at)`,
  `CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_logs (entity_type, entity_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ad_assets_object_key_unique ON ad_assets (object_key)`,
  `CREATE INDEX IF NOT EXISTS ad_assets_media_created_idx ON ad_assets (media_type, created_at)`,
  `CREATE INDEX IF NOT EXISTS ad_campaigns_status_dates_idx ON ad_campaigns (status, start_at, end_at)`,
  `CREATE INDEX IF NOT EXISTS ad_campaigns_priority_idx ON ad_campaigns (priority, updated_at)`,
  `CREATE INDEX IF NOT EXISTS ad_events_campaign_type_idx ON ad_events (campaign_id, event_type)`,
  `CREATE INDEX IF NOT EXISTS ad_events_country_date_idx ON ad_events (country_code, occurred_at)`,
  `CREATE INDEX IF NOT EXISTS ad_creatives_campaign_position_idx ON ad_creatives (campaign_id, position)`,

  `CREATE TABLE IF NOT EXISTS sponsor_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    sponsor_code TEXT NOT NULL UNIQUE,
    company_name_ar TEXT NOT NULL,
    company_name_en TEXT NOT NULL,
    logo_url TEXT,
    cover_url TEXT,
    commercial_registration TEXT,
    tax_number TEXT,
    country_code TEXT NOT NULL DEFAULT 'OM',
    city_id TEXT,
    district_id TEXT,
    governorate TEXT,
    village TEXT,
    street TEXT,
    address_ar TEXT,
    address_en TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    verified_at TEXT,
    approved_at TEXT,
    suspended_at TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS sponsor_profiles_code_unique ON sponsor_profiles (sponsor_code)`,
  `CREATE INDEX IF NOT EXISTS sponsor_profiles_country_status_idx ON sponsor_profiles (country_code, status)`,

  `CREATE TABLE IF NOT EXISTS sponsor_users (
    id TEXT PRIMARY KEY NOT NULL,
    sponsor_id TEXT NOT NULL,
    user_id TEXT,
    email TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'viewer',
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS sponsor_users_email_unique ON sponsor_users (sponsor_id, email)`,
  `CREATE INDEX IF NOT EXISTS sponsor_users_sponsor_idx ON sponsor_users (sponsor_id)`,

  `CREATE TABLE IF NOT EXISTS sponsor_branches (
    id TEXT PRIMARY KEY NOT NULL,
    sponsor_id TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    country_code TEXT NOT NULL,
    city_id TEXT NOT NULL,
    district_id TEXT,
    governorate TEXT,
    village TEXT,
    street TEXT,
    address_ar TEXT,
    address_en TEXT,
    phone TEXT,
    email TEXT,
    lat TEXT,
    lng TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS sponsor_branches_sponsor_idx ON sponsor_branches (sponsor_id)`,
  `CREATE INDEX IF NOT EXISTS sponsor_branches_location_idx ON sponsor_branches (country_code, city_id)`,

  `CREATE TABLE IF NOT EXISTS sponsor_plans (
    id TEXT PRIMARY KEY NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    price_monthly INTEGER NOT NULL DEFAULT 0,
    price_yearly INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'OMR',
    max_branches INTEGER NOT NULL DEFAULT 0,
    max_users INTEGER NOT NULL DEFAULT 0,
    max_properties INTEGER NOT NULL DEFAULT 0,
    max_ads INTEGER NOT NULL DEFAULT 0,
    features TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS sponsor_plans_code_unique ON sponsor_plans (code)`,

  `CREATE TABLE IF NOT EXISTS sponsor_subscriptions (
    id TEXT PRIMARY KEY NOT NULL,
    sponsor_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'trial',
    auto_renew INTEGER NOT NULL DEFAULT 1,
    payment_method TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS sponsor_subscriptions_sponsor_idx ON sponsor_subscriptions (sponsor_id)`,
  `CREATE INDEX IF NOT EXISTS sponsor_subscriptions_dates_idx ON sponsor_subscriptions (start_date, end_date)`,

  `CREATE TABLE IF NOT EXISTS sponsor_contracts (
    id TEXT PRIMARY KEY NOT NULL,
    sponsor_id TEXT NOT NULL,
    contract_number TEXT NOT NULL UNIQUE,
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    file_url TEXT,
    signed_at TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    value INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'OMR',
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS sponsor_contracts_sponsor_idx ON sponsor_contracts (sponsor_id)`,

  `CREATE TABLE IF NOT EXISTS sponsor_documents (
    id TEXT PRIMARY KEY NOT NULL,
    sponsor_id TEXT NOT NULL,
    type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL,
    notes TEXT,
    uploaded_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS sponsor_documents_sponsor_idx ON sponsor_documents (sponsor_id)`,
  `CREATE INDEX IF NOT EXISTS sponsor_documents_type_idx ON sponsor_documents (sponsor_id, type)`,

  `CREATE TABLE IF NOT EXISTS sponsor_payments (
    id TEXT PRIMARY KEY NOT NULL,
    sponsor_id TEXT NOT NULL,
    subscription_id TEXT,
    invoice_id TEXT,
    amount INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'OMR',
    method TEXT NOT NULL,
    reference_number TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    paid_at TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS sponsor_payments_sponsor_idx ON sponsor_payments (sponsor_id)`,
  `CREATE INDEX IF NOT EXISTS sponsor_payments_status_idx ON sponsor_payments (status, paid_at)`,

  `CREATE TABLE IF NOT EXISTS sponsor_invoices (
    id TEXT PRIMARY KEY NOT NULL,
    sponsor_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    subscription_id TEXT,
    contract_id TEXT,
    amount INTEGER NOT NULL DEFAULT 0,
    tax_amount INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'OMR',
    status TEXT NOT NULL DEFAULT 'draft',
    due_date TEXT NOT NULL,
    paid_at TEXT,
    file_url TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS sponsor_invoices_sponsor_idx ON sponsor_invoices (sponsor_id)`,

  `CREATE TABLE IF NOT EXISTS sponsor_activity_logs (
    id TEXT PRIMARY KEY NOT NULL,
    sponsor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS sponsor_activity_sponsor_idx ON sponsor_activity_logs (sponsor_id)`,
  `CREATE INDEX IF NOT EXISTS sponsor_activity_action_idx ON sponsor_activity_logs (action, created_at)`,

  `CREATE TABLE IF NOT EXISTS office_links (
    id TEXT PRIMARY KEY NOT NULL,
    sponsor_id TEXT NOT NULL,
    office_id TEXT,
    device_id TEXT,
    license_key TEXT NOT NULL UNIQUE,
    application_version TEXT,
    last_sync_at TEXT,
    last_ip TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    activated_at TEXT,
    revoked_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS office_links_sponsor_idx ON office_links (sponsor_id)`,

  `CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY NOT NULL,
    scope TEXT NOT NULL DEFAULT 'global',
    country_code TEXT,
    city_id TEXT,
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_tr TEXT NOT NULL,
    link_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    priority INTEGER NOT NULL DEFAULT 100,
    start_at TEXT,
    end_at TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS news_scope_country_idx ON news (status, scope, country_code)`,
];

async function seedNews(db: D1Database) {
  const existing = await db.prepare("SELECT COUNT(*) AS count FROM news WHERE status = 'active'").first<{ count: number }>();
  if (existing && existing.count > 0) return;

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

async function seedIntegrationDemo(db: D1Database) {
  const existing = await db.prepare("SELECT COUNT(*) AS count FROM office_notification_rules").first<{ count: number }>();
  if (existing && Number(existing.count) > 0) return;

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.batch([
    db.prepare(
      `INSERT INTO office_notification_rules
        (id, sponsor_id, office_id, event_type, channel, enabled, created_at, updated_at)
       VALUES (?1, 'demo@akarpromax.com', '', 'OFFICE_RADAR_MATCH', 'office_desktop', 1, ?2, ?3)`,
    ).bind(crypto.randomUUID(), now, now),
    db.prepare(
      `INSERT INTO office_notification_rules
        (id, sponsor_id, office_id, event_type, channel, enabled, created_at, updated_at)
       VALUES (?1, 'demo@akarpromax.com', '', 'OFFICE_NEW_NEWS', 'in_app', 1, ?2, ?3)`,
    ).bind(crypto.randomUUID(), now, now),
  ]);
}

async function seedSponsorPlans(db: D1Database) {
  const existing = await db.prepare("SELECT COUNT(*) AS count FROM sponsor_plans").first<{ count: number }>();
  if (existing && existing.count > 0) return;

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

/**
 * Shared content schema + seed bootstrap used by both the D1 adapter and the
 * Postgres (PgRuntimeDb) adapter. Both dialects accept this DDL after the
 * adapter's translateSql() applies placeholder/conflict transforms.
 */
export const CONTENT_SCHEMA_VERSION = 1;

const SCHEMA_META_SQL =
  `CREATE TABLE IF NOT EXISTS ak_content_schema_meta (version INTEGER PRIMARY KEY NOT NULL)`.trim();

async function isContentSchemaApplied(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 AS ok FROM ak_content_schema_meta WHERE version = ?1")
    .bind(CONTENT_SCHEMA_VERSION)
    .first<{ ok: number }>();
  return !!row;
}

export async function ensureContentSchema(db: D1Database): Promise<void> {
  // Fast path: in production the schema bootstrap is a set of round trips per
  // statement against a remote Postgres/MySQL target (~100s on first boot).
  // Once applied, skip the full DDL+seed run on every subsequent boot via the
  // ak_content_schema_meta latch. In development (D1 local / dev) we always
  // re-run the idempotent DDL + COUNT-guarded seeds so a locally-cleared DB
  // repopulates automatically on restart.
  if (isProduction() && (await isContentSchemaApplied(db).catch(() => false))) return;
  await db.batch(CONTENT_TABLES_SQL.map((sql) => db.prepare(sql)));
  await ensureAdSchema(db);
  await ensureI18nSchema(db);
  await ensureServicesSchema(db);
  await ensureServicesMarketplaceSchema(db);
  await ensurePropertiesSchema(db);
  await ensureIntegrationSchema(db);

  // Demo/seeding data is a development/preview concern only. Production boots
  // run schema (DDL) but must NOT inject demo rows through the request path;
  // real data arrives via controlled migrations/admin. Opt-in with
  // SEED_DEMO_DATA=true for preview/verification against a real PG target.
  const seedDemo = !isProduction() || process.env.SEED_DEMO_DATA === "true";
  if (seedDemo) {
    await seedSponsorPlans(db);
    await seedIntegrationDemo(db);
    await seedNews(db);
    await seedServicesMarketplace(db);
  }
  await db.prepare(SCHEMA_META_SQL).run();
  await db.prepare("INSERT OR IGNORE INTO ak_content_schema_meta (version) VALUES (?1)").bind(CONTENT_SCHEMA_VERSION).run();
}
