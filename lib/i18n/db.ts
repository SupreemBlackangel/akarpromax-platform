import { getRuntimeDb } from "@/lib/runtime-db";
import type { Locale } from "@/src/types/site";
import { parseKey } from "@/lib/i18n/keys";

export type TranslationRow = {
  fullKey: string;
  locale: Locale;
  value: string;
  status: string;
};

export type VersionSnapshot = {
  version: number;
  label: string;
  entries: Array<{ key: string; locale: Locale; value: string }>;
  createdAt: string;
};

let cachedTranslationRows: TranslationRow[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export async function loadAllTranslations(force = false): Promise<TranslationRow[]> {
  if (!force && cachedTranslationRows && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedTranslationRows;
  }
  const db = await getRuntimeDb();
  const result = await db
    .prepare(
      `SELECT n.code AS ns, k.\`key\` AS kkey, t.locale AS locale, t.value AS value, t.status AS status
       FROM i18n_keys k
       JOIN i18n_namespaces n ON n.id = k.namespace_id
       JOIN i18n_translations t ON t.key_id = k.id`,
    )
    .all<{ ns: string; kkey: string; locale: string; value: string; status: string }>();
  const rows: TranslationRow[] = (result.results ?? []).map((row) => ({
    fullKey: `${row.ns}.${row.kkey}`,
    locale: row.locale as Locale,
    value: row.value,
    status: row.status,
  }));
  cachedTranslationRows = rows;
  cachedAt = Date.now();
  return rows;
}

export function invalidateTranslationCache(): void {
  cachedTranslationRows = null;
}

async function findNamespaceId(db: D1Database, namespace: string): Promise<string | null> {
  const row = await db
    .prepare("SELECT id FROM i18n_namespaces WHERE code = ?")
    .bind(namespace)
    .first<{ id: string }>();
  return row?.id ?? null;
}

async function upsertNamespace(db: D1Database, namespace: string, description: string | null): Promise<string> {
  const existing = await findNamespaceId(db, namespace);
  if (existing) return existing;
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT OR IGNORE INTO i18n_namespaces (id, code, description, is_active, created_at, updated_at)
       VALUES (?1, ?2, ?3, 1, ?4, ?4)`,
    )
    .bind(id, namespace, description, nowSql())
    .run();
  const after = await findNamespaceId(db, namespace);
  return after ?? id;
}

async function findKeyId(db: D1Database, namespaceId: string, key: string): Promise<string | null> {
  const row = await db
    .prepare("SELECT id FROM i18n_keys WHERE namespace_id = ? AND `key` = ?")    .bind(namespaceId, key)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export type UpsertTranslation = {
  key: string;
  locale: Locale;
  value: string;
};

/**
 * Persist a batch of translations, creating namespaces/keys as needed.
 * Rejects empty values. Returns the number of keys touched.
 */
export async function upsertTranslations(
  entries: UpsertTranslation[],
  actor?: { userId?: string; ip?: string },
): Promise<{ created: number; updated: number }> {
  const db = await getRuntimeDb();
  const buckets = new Map<string, UpsertTranslation[]>();
  for (const entry of entries) {
    if (!entry.value || !entry.key) continue;
    const { namespace, key } = parseKey(entry.key);
    const bucket = buckets.get(namespace) ?? [];
    bucket.push({ ...entry, key });
    buckets.set(namespace, bucket);
  }

  let created = 0;
  let updated = 0;

  for (const [namespace, bucket] of buckets) {
    const namespaceId = await upsertNamespace(db, namespace, null);
    for (const entry of bucket) {
      const keyId = await findKeyId(db, namespaceId, entry.key);
      if (!keyId) {
        const newKeyId = crypto.randomUUID();
        await db
          .prepare(
            `INSERT INTO i18n_keys (id, namespace_id, \`key\`, default_value, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?5)`,
          )
          .bind(newKeyId, namespaceId, entry.key, entry.value, nowSql())
          .run();
        await db
          .prepare(
            `INSERT INTO i18n_translations (id, key_id, locale, value, status, is_machine, updated_by, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, 'published', 0, ?5, ?6, ?6)
             ON CONFLICT (key_id, locale) DO UPDATE SET value = ?4, status = 'published', updated_by = ?5, updated_at = ?6`,
          )
          .bind(crypto.randomUUID(), newKeyId, entry.locale, entry.value, actor?.userId ?? null, nowSql())
          .run();
        created += 1;
        continue;
      }
      const existing = await db
        .prepare("SELECT value FROM i18n_translations WHERE key_id = ? AND locale = ?")
        .bind(keyId, entry.locale)
        .first<{ value: string }>();
      await db
        .prepare(
          `INSERT INTO i18n_translations (id, key_id, locale, value, status, is_machine, updated_by, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, 'published', 0, ?5, ?6, ?6)
           ON CONFLICT (key_id, locale) DO UPDATE SET value = ?4, status = 'published', updated_by = ?5, updated_at = ?6`,
        )
        .bind(crypto.randomUUID(), keyId, entry.locale, entry.value, actor?.userId ?? null, nowSql())
        .run();
      if (existing && existing.value !== entry.value) updated += 1;
      else created += 1;
    }
  }

  await recordChangeLog(entries, actor);
  invalidateTranslationCache();
  return { created, updated };
}

async function recordChangeLog(
  entries: Array<{ key: string; locale: Locale; value: string }>,
  actor?: { userId?: string; ip?: string },
): Promise<void> {
  const db = await getRuntimeDb();
  const statements = entries
    .filter((entry) => entry.key && entry.value)
    .map((entry) =>
      db
        .prepare(
          `INSERT INTO i18n_change_log (id, key_id, locale, action, new_value, actor_user_id, ip_address, created_at)
           VALUES (?1, ?2, ?3, 'upsert', ?4, ?5, ?6, ?7)`,
        )
        .bind(crypto.randomUUID(), entry.key, entry.locale, entry.value, actor?.userId ?? null, actor?.ip ?? null, nowSql()),
    );
  if (statements.length) await db.batch(statements);}

export async function currentVersion(): Promise<number> {
  const db = await getRuntimeDb();
  const row = await db
    .prepare("SELECT COALESCE(MAX(version), 0) AS v FROM i18n_versions")
    .first<{ v: number }>();
  return Number(row?.v ?? 0);
}

export async function publishSnapshot(label: string, actor?: { userId?: string }): Promise<number> {
  const rows = await loadAllTranslations(true);
  const version = (await currentVersion()) + 1;
  const snapshot: VersionSnapshot = {
    version,
    label,
    entries: rows.map((row) => ({ key: row.fullKey, locale: row.locale, value: row.value })),
    createdAt: new Date().toISOString(),
  };
  const db = await getRuntimeDb();
  await db
    .prepare(
      `INSERT INTO i18n_versions (id, version, label, snapshot, created_by, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(crypto.randomUUID(), version, label, JSON.stringify(snapshot), actor?.userId ?? null, nowSql())
    .run();
  return version;
}

export async function listVersions(limit = 50): Promise<Array<{ version: number; label: string | null; createdAt: string }>> {
  const db = await getRuntimeDb();
  const result = await db
    .prepare("SELECT version, label, created_at AS createdAt FROM i18n_versions ORDER BY version DESC LIMIT ?1")
    .bind(limit)
    .all<{ version: number; label: string | null; createdAt: string }>();
  return (result.results ?? []).map((row) => ({
    version: Number(row.version),
    label: row.label,
    createdAt: row.createdAt,
  }));
}

/**
 * Restore a published snapshot: replaces the whole published set with the
 * snapshot entries (upsert style). Returns the count of keys restored.
 */
export async function rollbackToVersion(version: number, actor?: { userId?: string }): Promise<number> {
  const db = await getRuntimeDb();
  const row = await db
    .prepare("SELECT snapshot FROM i18n_versions WHERE version = ?")
    .bind(version)
    .first<{ snapshot: string }>();
  if (!row) throw new Error("version_not_found");
  const snapshot = JSON.parse(row.snapshot) as VersionSnapshot;
  const entries = snapshot.entries
    .filter((entry) => entry.key && entry.value)
    .map((entry) => ({ key: entry.key, locale: entry.locale, value: entry.value }));
  const { updated } = await upsertTranslations(entries, actor);
  return updated;
}
