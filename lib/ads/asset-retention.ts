/**
 * Retention for advertiser intake uploads.
 *
 * `ad_request_assets` holds the raw image bytes of every file submitted through
 * the public "advertise with us" form, straight in the database. Nothing ever
 * removed a row, so the table only grows: measured on production it was already
 * 11 MB across 7 rows, and every one of those bytes sits in the primary
 * database, its backups and its replication stream.
 *
 * Most of those uploads are dead the moment the request is declined or the
 * submitter abandons the form. Some are not: the intake route writes a draft
 * campaign whose media_url points back at `/api/ads/request-asset?id=...`, and
 * deleting one of those would blank a live ad. So an asset is removed only when
 * it is BOTH old and unreferenced -- the reference check is what makes this
 * safe to run unattended, and it is done by reading the referencing columns
 * rather than by assuming which ones exist.
 */

const REFERENCING_QUERIES = [
  "SELECT media_url AS url FROM ad_campaigns",
  "SELECT mobile_media_url AS url FROM ad_campaigns",
  "SELECT tablet_media_url AS url FROM ad_campaigns",
  "SELECT media_url AS url FROM ad_creatives",
];

const ASSET_ID = /request-asset\?id=([0-9a-f-]{36})/gi;

async function referencedAssetIds(db: D1Database): Promise<Set<string>> {
  const referenced = new Set<string>();
  for (const sql of REFERENCING_QUERIES) {
    let rows: { url: string | null }[];
    try {
      rows = (await db.prepare(sql).all<{ url: string | null }>()).results ?? [];
    } catch {
      // A column or table that does not exist in this deployment simply
      // contributes no references; it must not abort the sweep.
      continue;
    }
    for (const row of rows) {
      for (const match of (row.url ?? "").matchAll(ASSET_ID)) {
        referenced.add(match[1].toLowerCase());
      }
    }
  }
  return referenced;
}

export type PruneResult = { examined: number; deleted: number; keptBecauseReferenced: number };

export async function pruneOrphanAdRequestAssets(
  db: D1Database,
  options: { olderThanDays?: number; now?: Date; limit?: number } = {},
): Promise<PruneResult> {
  const olderThanDays = options.olderThanDays ?? 90;
  const now = options.now ?? new Date();
  const cutoff = new Date(now.getTime() - olderThanDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const candidates =
    (await db
      .prepare("SELECT id FROM ad_request_assets WHERE created_at < ?1 ORDER BY created_at LIMIT ?2")
      .bind(cutoff, options.limit ?? 500)
      .all<{ id: string }>()).results ?? [];
  if (candidates.length === 0) return { examined: 0, deleted: 0, keptBecauseReferenced: 0 };

  const referenced = await referencedAssetIds(db);
  let deleted = 0;
  let kept = 0;
  for (const { id } of candidates) {
    if (referenced.has(String(id).toLowerCase())) {
      kept += 1;
      continue;
    }
    await db.prepare("DELETE FROM ad_request_assets WHERE id = ?1").bind(id).run();
    deleted += 1;
  }
  return { examined: candidates.length, deleted, keptBecauseReferenced: kept };
}

// One sweep per process per interval: the upload path is the only place new
// rows appear, so that is where it is cheapest to hang the cleanup, and it must
// not run on every request.
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;
let lastSweep = 0;

export function maybePruneAdRequestAssets(db: D1Database, now = Date.now()): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  // Deliberately not awaited: retention must never delay or fail an upload.
  void pruneOrphanAdRequestAssets(db).catch(() => undefined);
}

export function resetAssetSweepForTests(): void {
  lastSweep = 0;
}
