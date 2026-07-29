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
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS sponsor_access_email_unique ON sponsor_access (email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sponsor_access_role_country_idx ON sponsor_access (role, country_code)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sponsors_country_status_priority_idx ON sponsors (country_code, status, priority)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sponsors_campaign_dates_idx ON sponsors (start_at, end_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sponsor_events_sponsor_type_idx ON sponsor_events (sponsor_id, event_type)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sponsor_events_country_date_idx ON sponsor_events (country_code, occurred_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_logs (entity_type, entity_id)"),
  ]);
}
