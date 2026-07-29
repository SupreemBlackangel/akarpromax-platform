let sponsorSchemaReady: Promise<void> | null = null;

export async function getRuntimeDb(): Promise<D1Database> {
  const runtime = await import("cloudflare:workers");
  if (!runtime.env.DB) throw new Error("Database binding is unavailable");
  const db = runtime.env.DB;
  sponsorSchemaReady ??= ensureSponsorSchema(db);
  await sponsorSchemaReady;
  return db;
}

async function ensureSponsorSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS sponsor_access (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'viewer',
      country_code TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sponsors (
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
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sponsor_events (
      id TEXT PRIMARY KEY NOT NULL,
      sponsor_id TEXT NOT NULL,
      country_code TEXT NOT NULL,
      placement TEXT NOT NULL,
      event_type TEXT NOT NULL,
      occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY NOT NULL,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ad_assets (
      id TEXT PRIMARY KEY NOT NULL,
      object_key TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      media_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      uploaded_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ad_campaigns (
      id TEXT PRIMARY KEY NOT NULL,
      internal_name TEXT NOT NULL,
      advertiser_name TEXT NOT NULL,
      campaign_type TEXT NOT NULL DEFAULT 'platform',
      status TEXT NOT NULL DEFAULT 'draft',
      media_type TEXT NOT NULL DEFAULT 'image',
      media_url TEXT NOT NULL,
      mobile_media_url TEXT,
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
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ad_events (
      id TEXT PRIMARY KEY NOT NULL,
      campaign_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      country_code TEXT NOT NULL,
      city_id TEXT,
      locale TEXT NOT NULL,
      device TEXT NOT NULL,
      occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS sponsor_access_email_unique ON sponsor_access (email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sponsor_access_role_country_idx ON sponsor_access (role, country_code)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sponsors_country_status_priority_idx ON sponsors (country_code, status, priority)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sponsors_campaign_dates_idx ON sponsors (start_at, end_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sponsor_events_sponsor_type_idx ON sponsor_events (sponsor_id, event_type)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sponsor_events_country_date_idx ON sponsor_events (country_code, occurred_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_logs (entity_type, entity_id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS ad_assets_object_key_unique ON ad_assets (object_key)"),
    db.prepare("CREATE INDEX IF NOT EXISTS ad_assets_media_created_idx ON ad_assets (media_type, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS ad_campaigns_status_dates_idx ON ad_campaigns (status, start_at, end_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS ad_campaigns_priority_idx ON ad_campaigns (priority, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS ad_events_campaign_type_idx ON ad_events (campaign_id, event_type)"),
    db.prepare("CREATE INDEX IF NOT EXISTS ad_events_country_date_idx ON ad_events (country_code, occurred_at)"),
  ]);
}
