export const INTEGRATION_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS office_devices (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(80) NOT NULL,
    office_id VARCHAR(80) NULL,
    legacy_link_id VARCHAR(80) NULL,
    device_name VARCHAR(120) NULL,
    model VARCHAR(120) NULL,
    os VARCHAR(64) NULL,
    os_version VARCHAR(64) NULL,
    app_version VARCHAR(30) NULL,
    protocol_version INTEGER NOT NULL DEFAULT 1,
    installation_id VARCHAR(120) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    last_seen_at TEXT NULL,
    last_ip VARCHAR(45) NULL,
    revoked_at TEXT NULL,
    revoked_reason TEXT NULL,
    created_by VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS office_pairing_codes (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(80) NOT NULL,
    office_id VARCHAR(80) NULL,
    code_hash TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    expires_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    completed_by_device_id VARCHAR(36) NULL,
    created_by VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS office_device_credentials (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    device_id VARCHAR(36) NOT NULL,
    token_hash TEXT NOT NULL,
    token_prefix VARCHAR(16) NOT NULL,
    scopes TEXT NOT NULL DEFAULT '[]',
    expires_at DATETIME NULL,
    revoked_at DATETIME NULL,
    last_used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS office_sync_operations (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    device_id VARCHAR(36) NOT NULL,
    operation_type VARCHAR(48) NOT NULL,
    direction VARCHAR(16) NOT NULL DEFAULT 'push',
    entity_type VARCHAR(48) NOT NULL,
    entity_id VARCHAR(120) NULL,
    payload TEXT NULL,
    idempotency_key VARCHAR(160) NULL,
    client_updated_at TEXT NULL,
    server_updated_at TEXT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'queued',
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT NULL,
    conflict_reason TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS office_radar_queries (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    device_id VARCHAR(36) NOT NULL,
    sponsor_id VARCHAR(80) NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_km REAL NOT NULL DEFAULT 10,
    kind VARCHAR(16) NOT NULL DEFAULT 'properties',
    filters TEXT NULL,
    matched_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS office_notification_rules (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(80) NOT NULL,
    office_id VARCHAR(80) NOT NULL DEFAULT '',
    event_type VARCHAR(80) NOT NULL,
    channel VARCHAR(24) NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    quiet_start VARCHAR(8) NULL,
    quiet_end VARCHAR(8) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS office_notification_deliveries (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    sponsor_id VARCHAR(80) NOT NULL,
    office_id VARCHAR(80) NULL,
    device_id VARCHAR(36) NULL,
    event_type VARCHAR(80) NOT NULL,
    event_id VARCHAR(80) NOT NULL,
    recipient_key VARCHAR(255) NOT NULL,
    channel VARCHAR(24) NOT NULL,
    title TEXT NULL,
    body TEXT NULL,
    link TEXT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'queued',
    dedup_key VARCHAR(255) NOT NULL,
    delivered_at DATETIME NULL,
    error TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS office_realtime_events (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    event_id VARCHAR(80) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    scope VARCHAR(40) NOT NULL DEFAULT 'sponsor',
    sponsor_id VARCHAR(80) NULL,
    office_id VARCHAR(80) NULL,
    payload TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS office_news_deliveries (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    news_id VARCHAR(36) NOT NULL,
    sponsor_id VARCHAR(80) NOT NULL,
    device_id VARCHAR(36) NULL,
    delivered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

export const INTEGRATION_ALTER_SQL: string[] = [
  `ALTER TABLE property_listings ADD COLUMN latitude REAL NULL`,
  `ALTER TABLE property_listings ADD COLUMN longitude REAL NULL`,
];

export const INTEGRATION_INDEXES_SQL: string[] = [
  `CREATE UNIQUE INDEX IF NOT EXISTS office_devices_installation_unique ON office_devices (installation_id)`,
  `CREATE INDEX IF NOT EXISTS office_devices_sponsor_status_idx ON office_devices (sponsor_id, status)`,
  `CREATE INDEX IF NOT EXISTS office_devices_office_idx ON office_devices (office_id)`,
  `CREATE INDEX IF NOT EXISTS office_pairing_codes_sponsor_idx ON office_pairing_codes (sponsor_id)`,
  `CREATE INDEX IF NOT EXISTS office_pairing_codes_status_expiry_idx ON office_pairing_codes (status, expires_at)`,
  `CREATE INDEX IF NOT EXISTS office_credentials_device_idx ON office_device_credentials (device_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS office_credentials_token_hash_unique ON office_device_credentials (token_hash)`,
  `CREATE INDEX IF NOT EXISTS office_credentials_prefix_idx ON office_device_credentials (token_prefix)`,
  `CREATE INDEX IF NOT EXISTS office_sync_device_status_idx ON office_sync_operations (device_id, status, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS office_sync_device_idem_key_unique ON office_sync_operations (device_id, idempotency_key)`,
  `CREATE INDEX IF NOT EXISTS office_sync_status_idx ON office_sync_operations (status, created_at)`,
  `CREATE INDEX IF NOT EXISTS office_radar_device_idx ON office_radar_queries (device_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS office_radar_sponsor_idx ON office_radar_queries (sponsor_id, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS office_rule_sponsor_office_event_channel_unique ON office_notification_rules (sponsor_id, office_id, event_type, channel)`,
  `CREATE INDEX IF NOT EXISTS office_deliveries_recipient_idx ON office_notification_deliveries (recipient_key, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS office_deliveries_dedup_unique ON office_notification_deliveries (dedup_key)`,
  `CREATE INDEX IF NOT EXISTS office_deliveries_status_idx ON office_notification_deliveries (status, created_at)`,
  `CREATE INDEX IF NOT EXISTS office_realtime_scope_idx ON office_realtime_events (scope, sponsor_id, office_id, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS office_realtime_event_id_unique ON office_realtime_events (event_id)`,
  `CREATE INDEX IF NOT EXISTS office_news_device_idx ON office_news_deliveries (device_id, news_id)`,
];

function isDuplicateKeyError(message: string): boolean {
  return /duplicate (key|index|column)|already exists/i.test(message);
}

export async function ensureIntegrationSchema(db: D1Database): Promise<void> {
  for (const sql of INTEGRATION_ALTER_SQL) {
    try {
      await db.prepare(sql).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isDuplicateKeyError(message)) throw error;
    }
  }
  for (const sql of INTEGRATION_TABLES_SQL) {
    await db.prepare(sql).run();
  }
  for (const sql of INTEGRATION_INDEXES_SQL) {
    try {
      await db.prepare(sql).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isDuplicateKeyError(message)) throw error;
    }
  }
}
