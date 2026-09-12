import { nowMySqlDateTime } from "@/lib/auth/mysql-time";
import { insertRow, getServicesDb } from "@services/db";

/**
 * One audit row.
 *
 * `before`, `after` and `reason` are named fields rather than something each
 * caller invents inside `metadata`, because they are the three questions an
 * administrator actually asks of this table and the ones it could not answer.
 * WHO is `actorUserId`, WHAT is `action`, WHEN is the row's timestamp; what the
 * record could not say was what the thing looked like beforehand, what it looks
 * like now, and why anybody did it.
 *
 * Leaving that to each call site meant it was mostly not done at all —
 * `setProviderStatus` read the previous status in order to validate the
 * transition and then threw it away, so the log recorded that a provider had
 * been rejected without recording what they had been, or why.
 *
 * They are stored inside `metadata` rather than in new columns: the shape is
 * the contract, and no migration is needed for a column that is already there.
 */
export type AuditEntry = {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  /** What the entity looked like before this action. */
  before?: Record<string, unknown> | null;
  /** What it looks like after. */
  after?: Record<string, unknown> | null;
  /** Why — the reviewer's own words, as the subject was shown them. */
  reason?: string | null;
  actorUserId?: string | null;
  ipAddress?: string | null;
};

/** The three named fields join the metadata; an absent one is simply absent. */
function auditMetadata(entry: AuditEntry): string {
  const metadata: Record<string, unknown> = { ...(entry.metadata ?? {}) };
  if (entry.before !== undefined) metadata.before = entry.before;
  if (entry.after !== undefined) metadata.after = entry.after;
  if (entry.reason !== undefined) metadata.reason = entry.reason;
  return JSON.stringify(metadata);
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  const db = await getServicesDb();
  await db
    .prepare(
      `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata, ip_address, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      crypto.randomUUID(),
      entry.actorUserId ?? null,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      auditMetadata(entry),
      entry.ipAddress ?? null,
      nowMySqlDateTime(),
    )
    .run();
}

export async function writeSponsorActivity(entry: {
  sponsorId?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  newValues?: Record<string, unknown>;
  actor?: { userId?: string | null; ip?: string | null };
}): Promise<void> {
  const db = await getServicesDb();
  await db
    .prepare(
      `INSERT INTO sponsor_activity_logs
        (id, sponsor_id, action, entity_type, entity_id, new_values, ip_address, created_by, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
    .bind(
      crypto.randomUUID(),
      entry.sponsorId ?? null,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      JSON.stringify(entry.newValues ?? {}),
      entry.actor?.ip ?? null,
      entry.actor?.userId ?? null,
      nowMySqlDateTime(),
    )
    .run();
}

export { insertRow };
