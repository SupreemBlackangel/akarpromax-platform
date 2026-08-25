import { getIntegrationDb } from "@/lib/integration/db";
import {
  OFFICE_SYNC_MAX_ATTEMPTS,
  type OfficeSyncStatus,
  type OfficeSyncOperationType,
} from "@/lib/integration/constants";
import {
  OfficePropertyError,
  archiveOfficeProperty,
  getOfficePropertyLink,
  upsertOfficeProperty,
} from "@/lib/integration/office-property";

export type SyncPushItem = {
  operationType: OfficeSyncOperationType;
  entityId: string;
  payload: Record<string, unknown>;
  clientUpdatedAt: string;
  idempotencyKey: string;
};

export type SyncPullItem = {
  id: string;
  deviceId: string;
  operationType: string;
  entityId: string | null;
  status: string;
  attempts: number;
  clientUpdatedAt: string | null;
  serverUpdatedAt: string | null;
  conflictReason: string | null;
  createdAt: string;
};

export type SyncPushResult = {
  accepted: number;
  conflicts: number;
  duplicates: number;
  items: Array<{
    idempotencyKey: string;
    status: OfficeSyncStatus;
    entityId: string;
    /** Canonical `properties.id` this office entity maps to, when known. */
    propertyId?: string | null;
    conflictReason?: string;
    serverCopy?: Record<string, unknown> | null;
  }>;
};

export type SyncConflictDecision =
  | { action: "accept-server" }
  | { action: "client-wins"; payload: Record<string, unknown>; clientUpdatedAt: string };

function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Office sync writes property data through lib/integration/office-property.ts,
 * which owns the canonical `properties` model, the sponsor-scoped identity
 * mapping and the moderation status. This module only owns the operation log,
 * the idempotency guarantee and the conflict decision.
 */
const SUPPORTED_OPERATIONS = new Set<string>(["property.upsert", "property.delete"]);

async function serverVersionOf(
  db: D1Database,
  sponsorId: string,
  operationType: string,
  entityId: string,
): Promise<{ updatedAt: string | null; row: Record<string, unknown> | null; propertyId: string | null }> {
  if (!SUPPORTED_OPERATIONS.has(operationType)) return { updatedAt: null, row: null, propertyId: null };
  const link = await getOfficePropertyLink(sponsorId, entityId);
  if (!link) return { updatedAt: null, row: null, propertyId: null };
  const row = await db
    .prepare("SELECT * FROM properties WHERE id = ?1 LIMIT 1")
    .bind(link.propertyId)
    .first<Record<string, unknown>>();
  return {
    updatedAt: row?.updated_at ? String(row.updated_at) : null,
    row: row ?? null,
    propertyId: link.propertyId,
  };
}

/**
 * Applies a batch of office operations.
 *
 * `sponsorId` MUST come from the authenticated device credential. It is the
 * only ownership key used to resolve, create or archive a property, so a device
 * can never reach a row belonging to another sponsor no matter what it sends.
 */
export async function syncPush(
  deviceId: string,
  sponsorId: string,
  items: SyncPushItem[],
  decideConflict?: (server: Record<string, unknown> | null, incoming: SyncPushItem) => SyncConflictDecision,
): Promise<SyncPushResult> {
  const db = await getIntegrationDb();
  const result: SyncPushResult = { accepted: 0, conflicts: 0, duplicates: 0, items: [] };
  const now = nowIso();
  const owner = String(sponsorId ?? "").trim();

  for (const item of items) {
    const existingOp = await db
      .prepare("SELECT id, status FROM office_sync_operations WHERE device_id = ?1 AND idempotency_key = ?2 LIMIT 1")
      .bind(deviceId, String(item.idempotencyKey).slice(0, 160))
      .first<{ id: string; status: string }>();

    if (existingOp && existingOp.status === "synced") {
      // Idempotent replay: report the mapping again, never write a second row.
      const replayLink = await getOfficePropertyLink(owner, item.entityId);
      result.duplicates += 1;
      result.items.push({
        idempotencyKey: item.idempotencyKey,
        status: "synced",
        entityId: item.entityId,
        propertyId: replayLink?.propertyId ?? null,
      });
      continue;
    }

    const opId = existingOp?.id ?? crypto.randomUUID();
    const { updatedAt: serverUpdatedAt, row: serverRow, propertyId: linkedPropertyId } =
      await serverVersionOf(db, owner, item.operationType, item.entityId);
    let propertyId: string | null = linkedPropertyId;

    let finalStatus: OfficeSyncStatus = "synced";
    let conflictReason: string | null = null;
    let shouldApply = true;

    if (serverUpdatedAt && serverUpdatedAt > item.clientUpdatedAt) {
      const decision = decideConflict?.(serverRow, item) ?? { action: "accept-server" as const };
      if (decision.action === "accept-server") {
        finalStatus = "conflict";
        conflictReason = "server_newer";
        shouldApply = false;
        result.conflicts += 1;
        result.items.push({
          idempotencyKey: item.idempotencyKey,
          status: "conflict",
          entityId: item.entityId,
          propertyId,
          conflictReason,
          serverCopy: serverRow,
        });
      } else {
        finalStatus = "synced";
        conflictReason = "client_wins";
      }
    }

    if (shouldApply) {
      if (!SUPPORTED_OPERATIONS.has(item.operationType)) {
        finalStatus = "failed";
        conflictReason = "unsupported_operation";
      } else if (!owner) {
        finalStatus = "failed";
        conflictReason = "SPONSOR_REQUIRED";
      } else {
        try {
          if (item.operationType === "property.upsert") {
            const outcome = await upsertOfficeProperty({
              sponsorId: owner,
              deviceId,
              externalId: item.entityId,
              payload: item.payload,
              now,
            });
            propertyId = outcome.propertyId;
          } else {
            const outcome = await archiveOfficeProperty({
              sponsorId: owner,
              externalId: item.entityId,
              now,
            });
            propertyId = outcome.propertyId;
          }
        } catch (error) {
          finalStatus = "failed";
          conflictReason = error instanceof OfficePropertyError
            ? error.code
            : error instanceof Error
              ? error.message.slice(0, 200)
              : "db_error";
        }
      }
    }

    await db
      .prepare(
        `INSERT INTO office_sync_operations
          (id, device_id, operation_type, direction, entity_type, entity_id, payload,
           idempotency_key, client_updated_at, server_updated_at, status, attempts, conflict_reason,
           created_at, processed_at, updated_at)
         VALUES (?1, ?2, ?3, 'push', ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, ?11, ?12, ?13, ?14)
         ON CONFLICT(device_id, idempotency_key) DO UPDATE SET
           operation_type = ?15, entity_id = ?16, payload = ?17, client_updated_at = ?18,
           server_updated_at = ?19, status = ?20, conflict_reason = ?21, processed_at = ?22, updated_at = ?23`,
      )
      .bind(
        opId, deviceId, item.operationType, item.operationType.split(".")[0], item.entityId,
        JSON.stringify(item.payload), String(item.idempotencyKey).slice(0, 160),
        item.clientUpdatedAt, serverUpdatedAt, finalStatus, conflictReason, now, now, now,
        item.operationType, item.entityId, JSON.stringify(item.payload), item.clientUpdatedAt,
        serverUpdatedAt, finalStatus, conflictReason, now, now,
      )
      .run();

    if (finalStatus === "synced") {
      result.accepted += 1;
    }
    if (finalStatus !== "conflict") {
      // Exactly one result entry per submitted item, including retries of a
      // previously failed operation, so the desktop queue can always resolve
      // what happened to the item it sent.
      result.items.push({
        idempotencyKey: item.idempotencyKey,
        status: finalStatus,
        entityId: item.entityId,
        propertyId,
        conflictReason: conflictReason ?? undefined,
      });
    }
  }

  return result;
}

export async function syncPull(deviceId: string, sinceId?: string, limit = 100): Promise<SyncPullItem[]> {
  const db = await getIntegrationDb();
  if (sinceId) {
    const rows = await db
      .prepare(
        `SELECT id, device_id, operation_type, entity_id, status, attempts, client_updated_at,
                server_updated_at, conflict_reason, created_at
         FROM office_sync_operations
         WHERE device_id = ?1 AND status = 'synced' AND id > ?2
         ORDER BY created_at ASC, id ASC
         LIMIT ?3`,
      )
      .bind(deviceId, sinceId, limit)
      .all<SyncPullItem>();
    return rows.results ?? [];
  }
  const rows = await db
    .prepare(
      `SELECT id, device_id, operation_type, entity_id, status, attempts, client_updated_at,
              server_updated_at, conflict_reason, created_at
       FROM office_sync_operations
       WHERE device_id = ?1 AND status = 'synced'
       ORDER BY created_at ASC, id ASC
       LIMIT ?2`,
    )
    .bind(deviceId, limit)
    .all<SyncPullItem>();
  return rows.results ?? [];
}

export async function retryFailedOperations(): Promise<number> {
  const db = await getIntegrationDb();
  const now = nowIso();
  const rows = await db
    .prepare(
      `SELECT id FROM office_sync_operations
       WHERE status = 'failed' AND attempts < ?1
       ORDER BY created_at ASC
       LIMIT 200`,
    )
    .bind(OFFICE_SYNC_MAX_ATTEMPTS)
    .all<{ id: string }>();
  for (const row of rows.results ?? []) {
    await db
      .prepare(
        `UPDATE office_sync_operations
           SET status = 'retrying', attempts = attempts + 1, updated_at = ?1
         WHERE id = ?2 AND status = 'failed'`,
      )
      .bind(now, String(row.id))
      .run();
  }
  return rows.results?.length ?? 0;
}

export async function deadLetterExpired(): Promise<number> {
  const db = await getIntegrationDb();
  const now = nowIso();
  const rows = await db
    .prepare(
      `SELECT id FROM office_sync_operations
       WHERE status IN ('failed', 'retrying') AND attempts >= ?1`,
    )
    .bind(OFFICE_SYNC_MAX_ATTEMPTS)
    .all<{ id: string }>();
  for (const row of rows.results ?? []) {
    await db
      .prepare(
        `UPDATE office_sync_operations SET status = 'dead_letter', updated_at = ?1 WHERE id = ?2`,
      )
      .bind(now, String(row.id))
      .run();
  }
  return rows.results?.length ?? 0;
}

export async function listSyncOperations(deviceId?: string, status?: OfficeSyncStatus, limit = 50): Promise<Array<Record<string, unknown>>> {
  const db = await getIntegrationDb();
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (deviceId) {
    params.push(deviceId);
    clauses.push(`device_id = ?${params.length}`);
  }
  if (status) {
    params.push(status);
    clauses.push(`status = ?${params.length}`);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const rows = await db
    .prepare(
      `SELECT id, device_id, operation_type, direction, entity_id, idempotency_key,
              client_updated_at, server_updated_at, status, attempts, conflict_reason, error,
              created_at, processed_at, updated_at
       FROM office_sync_operations${where}
       ORDER BY created_at DESC
       LIMIT ?${params.length + 1}`,
    )
    .bind(...params, limit)
    .all<Record<string, unknown>>();
  return rows.results ?? [];
}

export function syncStatusLabel(status: string): string {
  return status.replace("_", " ");
}

export type { OfficeSyncStatus };
