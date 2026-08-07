import { getIntegrationDb } from "@/lib/integration/db";
import {
  OFFICE_SYNC_MAX_ATTEMPTS,
  type OfficeSyncStatus,
  type OfficeSyncOperationType,
} from "@/lib/integration/constants";

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

const PROPERTY_NOT_NULL_DEFAULTS: Record<string, unknown> = {
  status: "active",
  listing_type: "for-sale",
  property_type: "villa",
  country_code: "om",
  currency: "OMR",
  title_ar: "",
  title_en: "",
  title_tr: "",
  description_ar: "",
  description_en: "",
  description_tr: "",
  price: 0,
  bedrooms: 0,
  bathrooms: 0,
  parking_slots: 0,
  features_ar: "[]",
  features_en: "[]",
  features_tr: "[]",
  is_featured: 0,
  priority: 100,
};

function pickPropertyColumns(payload: Record<string, unknown>): Array<[string, unknown]> {
  const entries: Array<[string, unknown]> = [];
  const columns: Array<[string, string]> = [
    ["slug", "slug"],
    ["status", "status"],
    ["listingType", "listing_type"],
    ["propertyType", "property_type"],
    ["countryCode", "country_code"],
    ["cityId", "city_id"],
    ["district", "district"],
    ["titleAr", "title_ar"],
    ["titleEn", "title_en"],
    ["titleTr", "title_tr"],
    ["areaTextAr", "area_text_ar"],
    ["areaTextEn", "area_text_en"],
    ["areaTextTr", "area_text_tr"],
    ["descriptionAr", "description_ar"],
    ["descriptionEn", "description_en"],
    ["descriptionTr", "description_tr"],
    ["price", "price"],
    ["currency", "currency"],
    ["builtUpArea", "built_up_area"],
    ["landArea", "land_area"],
    ["bedrooms", "bedrooms"],
    ["bathrooms", "bathrooms"],
    ["parkingSlots", "parking_slots"],
    ["featuresAr", "features_ar"],
    ["featuresEn", "features_en"],
    ["featuresTr", "features_tr"],
    ["imageUrl", "image_url"],
    ["isFeatured", "is_featured"],
    ["priority", "priority"],
  ];
  for (const [source, column] of columns) {
    const value = payload[source];
    if (value !== undefined && value !== null) {
      entries.push([column, column.startsWith("features_") ? JSON.stringify(value) : value]);
    }
  }
  for (const [column, fallback] of Object.entries(PROPERTY_NOT_NULL_DEFAULTS)) {
    if (!entries.some(([name]) => name === column)) entries.push([column, fallback]);
  }
  return entries;
}

const OPERATION_FIELD_MAP: Record<string, { table: string; keyColumn: string; pickColumns: (payload: Record<string, unknown>) => Array<[string, unknown]> }> = {
  "property.upsert": {
    table: "property_listings",
    keyColumn: "id",
    pickColumns: pickPropertyColumns,
  },
};

async function serverVersionOf(db: D1Database, operationType: string, entityId: string): Promise<{ updatedAt: string | null; row: Record<string, unknown> | null }> {
  const mapping = OPERATION_FIELD_MAP[operationType];
  if (!mapping) return { updatedAt: null, row: null };
  const row = await db
    .prepare(`SELECT * FROM ${mapping.table} WHERE ${mapping.keyColumn} = ?1 LIMIT 1`)
    .bind(entityId)
    .first<Record<string, unknown>>();
  return { updatedAt: row?.updated_at ? String(row.updated_at) : null, row: row ?? null };
}

export async function syncPush(deviceId: string, items: SyncPushItem[], decideConflict?: (server: Record<string, unknown> | null, incoming: SyncPushItem) => SyncConflictDecision): Promise<SyncPushResult> {
  const db = await getIntegrationDb();
  const result: SyncPushResult = { accepted: 0, conflicts: 0, duplicates: 0, items: [] };
  const now = nowIso();

  for (const item of items) {
    const existingOp = await db
      .prepare("SELECT id, status FROM office_sync_operations WHERE device_id = ?1 AND idempotency_key = ?2 LIMIT 1")
      .bind(deviceId, String(item.idempotencyKey).slice(0, 160))
      .first<{ id: string; status: string }>();

    if (existingOp && existingOp.status === "synced") {
      result.duplicates += 1;
      result.items.push({ idempotencyKey: item.idempotencyKey, status: "synced", entityId: item.entityId });
      continue;
    }

    const opId = existingOp?.id ?? crypto.randomUUID();
    const { updatedAt: serverUpdatedAt, row: serverRow } = await serverVersionOf(db, item.operationType, item.entityId);

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
          conflictReason,
          serverCopy: serverRow,
        });
      } else {
        finalStatus = "synced";
        conflictReason = "client_wins";
      }
    }

    if (shouldApply) {
      const mapping = OPERATION_FIELD_MAP[item.operationType];
      if (!mapping) {
        finalStatus = "failed";
        conflictReason = "unsupported_operation";
      } else {
        try {
          if (item.operationType === "property.upsert") {
            const pairs = OPERATION_FIELD_MAP["property.upsert"].pickColumns(item.payload);
            const cols = pairs.map(([name]) => name);
            if (!cols.length) {
              finalStatus = "failed";
              conflictReason = "empty_payload";
            } else {
              const values = cols.map((name) => pairs.find(([c]) => c === name)?.[1]);
              const insertCols = ["id", ...cols].join(", ");
              const insertPlaceholders = ["?1", ...cols.map((_, i) => `?${i + 2}`)].join(", ");
              const updateClauses = cols.map((c, i) => `${c} = ?${i + 2}`).join(", ");
              const createdIdx = cols.length + 2;
              const updatedIdx = cols.length + 3;
              await db
                .prepare(
                  `INSERT INTO property_listings (${insertCols}, created_at, updated_at)
                   VALUES (${insertPlaceholders}, ?${createdIdx}, ?${updatedIdx})
                   ON CONFLICT("id") DO UPDATE SET ${updateClauses}, updated_at = ?${updatedIdx}`,
                )
                .bind(item.entityId, ...values, now, now)
                .run();
            }
          } else if (item.operationType === "property.delete") {
            await db.prepare("UPDATE property_listings SET status = 'deleted', updated_at = ?1 WHERE id = ?2").bind(now, item.entityId).run();
          }
        } catch (error) {
          finalStatus = "failed";
          conflictReason = error instanceof Error ? error.message.slice(0, 200) : "db_error";
        }
      }
    }

    const statusBefore = existingOp?.status ?? null;
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
    if (!existingOp && finalStatus === "failed") {
      result.items.push({ idempotencyKey: item.idempotencyKey, status: "failed", entityId: item.entityId, conflictReason: conflictReason ?? undefined });
    } else if (!existingOp && finalStatus !== "conflict") {
      result.items.push({ idempotencyKey: item.idempotencyKey, status: finalStatus, entityId: item.entityId, conflictReason: conflictReason ?? undefined });
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
