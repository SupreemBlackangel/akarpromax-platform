import { getRuntimeDb } from "@/lib/runtime-db";
import { nowMySqlDateTime } from "@/lib/auth/mysql-time";
import { insertRow } from "@/lib/services/db";

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
  ipAddress?: string | null;
};

export async function writeAudit(entry: AuditEntry): Promise<void> {
  const db = await getRuntimeDb();
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
      JSON.stringify(entry.metadata ?? {}),
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
  const db = await getRuntimeDb();
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
