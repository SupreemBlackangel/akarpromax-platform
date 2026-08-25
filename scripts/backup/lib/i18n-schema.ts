export const I18N_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS i18n_namespaces (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    code VARCHAR(128) NOT NULL,
    description TEXT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS i18n_keys (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    namespace_id VARCHAR(36) NOT NULL,
    \`key\` VARCHAR(255) NOT NULL,
    description TEXT NULL,
    default_value TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS i18n_translations (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    key_id VARCHAR(36) NOT NULL,
    locale VARCHAR(8) NOT NULL,
    value TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'published',
    is_machine INTEGER NOT NULL DEFAULT 0,
    updated_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS i18n_versions (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    version INTEGER NOT NULL,
    label VARCHAR(190) NULL,
    snapshot TEXT NOT NULL,
    created_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS i18n_change_log (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    key_id VARCHAR(36) NULL,
    locale VARCHAR(8) NULL,
    action VARCHAR(32) NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    actor_user_id VARCHAR(36) NULL,
    ip_address VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

export const I18N_INDEXES_SQL: string[] = [
  `CREATE UNIQUE INDEX IF NOT EXISTS i18n_namespaces_code_unique ON i18n_namespaces (code)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS i18n_keys_namespace_key_unique ON i18n_keys (namespace_id, \`key\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS i18n_translations_key_locale_unique ON i18n_translations (key_id, locale)`,
  `CREATE INDEX IF NOT EXISTS i18n_translations_locale_status_idx ON i18n_translations (locale, status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS i18n_versions_version_unique ON i18n_versions (version)`,
  `CREATE INDEX IF NOT EXISTS i18n_change_log_key_idx ON i18n_change_log (key_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS i18n_change_log_actor_idx ON i18n_change_log (actor_user_id, created_at)`,
];

export async function ensureI18nSchema(db: D1Database): Promise<void> {
  for (const sql of I18N_TABLES_SQL) {
    await db.prepare(sql).run();
  }
  for (const sql of I18N_INDEXES_SQL) {
    try {
      await db.prepare(sql).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/duplicate (key|index|column)|already exists/i.test(message)) throw error;
    }
  }
}
