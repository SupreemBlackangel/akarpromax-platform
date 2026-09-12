import { NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  user_id: string | null;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

/** A row as written by lib/services/audit.ts — services and ads decisions. */
type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: unknown;
  ip_address: string | null;
  created_at: string;
};

type UnifiedRow = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  ip_address: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  /** Which store the row came from: "services" = audit_logs, "auth" = audit_events. */
  source: AuditSource;
};

type AuditApiResponse = {
  rows: UnifiedRow[];
  total: number;
  page: number;
  limit: number;
  /** The action names actually present, so the filter cannot offer events nothing emits. */
  actions: string[];
};

const AUDIT_SOURCES = ["all", "services", "auth"] as const;
type AuditSource = "services" | "auth";

/** JSON is stored as text in one driver and parsed by another; accept both. */
function asDetails(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function parseDateParam(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function GET(request: Request) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADMIN_DASHBOARD_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));
  const action = url.searchParams.get("action");
  const entityType = url.searchParams.get("entity_type");
  const entityId = url.searchParams.get("entity_id");
  const userId = url.searchParams.get("user_id");
  const from = parseDateParam(url.searchParams.get("from"));
  const to = parseDateParam(url.searchParams.get("to"));
  const offset = (page - 1) * limit;

  const requestedSource = url.searchParams.get("source");
  const source = AUDIT_SOURCES.includes(requestedSource as (typeof AUDIT_SOURCES)[number])
    ? (requestedSource as (typeof AUDIT_SOURCES)[number])
    : "all";

  const db = await getRuntimeDb();

  /**
   * Two stores, read as one.
   *
   * `audit_logs` holds every services and ads decision — provider approvals and
   * rejections, suspensions, listing verdicts, campaign approvals — written by
   * lib/services/audit.ts. `audit_events` holds authentication events, written
   * by the Drizzle side. This screen was built on the second and never
   * connected to the first, so every moderation decision the platform has ever
   * recorded was invisible to the people who made it.
   *
   * They are read as two statements rather than a UNION because their filters
   * differ: audit_logs has real entity_type/entity_id columns to filter on,
   * while audit_events keeps the same fields inside its JSON `detail` and has
   * to be filtered after the fact. Each side is asked for the first
   * `limit + offset` rows by time, which is enough for the merge below to
   * produce the correct page.
   */
  const windowSize = limit + offset;

  const logsFilter = () => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const add = (sql: string, value: unknown) => {
      params.push(value);
      conditions.push(sql.replace("?", `?${params.length}`));
    };
    if (action) add("action = ?", action);
    if (userId) add("actor_user_id = ?", userId);
    if (entityType) add("entity_type = ?", entityType);
    if (entityId) add("entity_id = ?", entityId);
    if (from) add("created_at >= ?", from);
    if (to) add("created_at <= ?", to);
    return { where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
  };

  const eventsFilter = () => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const add = (sql: string, value: unknown) => {
      params.push(value);
      conditions.push(sql.replace("?", `?${params.length}`));
    };
    if (action) add("event_type = ?", action);
    if (userId) add("user_id = ?", userId);
    if (from) add("created_at >= ?", from);
    if (to) add("created_at <= ?", to);
    return { where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
  };

  const wantLogs = source === "all" || source === "services";
  const wantEvents = source === "all" || source === "auth";

  const readLogs = async (): Promise<{ rows: UnifiedRow[]; total: number }> => {
    if (!wantLogs) return { rows: [], total: 0 };
    const { where, params } = logsFilter();
    try {
      const [count, data] = await Promise.all([
        db.prepare(`SELECT COUNT(*) AS total FROM audit_logs ${where}`).bind(...params).first<{ total: number }>(),
        db
          .prepare(`SELECT id, actor_user_id, action, entity_type, entity_id, metadata, ip_address, created_at FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ?${params.length + 1}`)
          .bind(...params, windowSize)
          .all<AuditLogRow>(),
      ]);
      return {
        total: Number(count?.total ?? 0),
        rows: (data.results ?? []).map((row) => ({
          id: String(row.id),
          action: row.action,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          user_id: row.actor_user_id,
          ip_address: row.ip_address,
          details: asDetails(row.metadata),
          created_at: String(row.created_at),
          source: "services" as const,
        })),
      };
    } catch {
      // One store being unreadable must not blank the other: a screen showing
      // half the record is worth more than a 500 showing none of it.
      return { rows: [], total: 0 };
    }
  };

  const readEvents = async (): Promise<{ rows: UnifiedRow[]; total: number }> => {
    if (!wantEvents) return { rows: [], total: 0 };
    const { where, params } = eventsFilter();
    try {
      const [count, data] = await Promise.all([
        db.prepare(`SELECT COUNT(*) AS total FROM audit_events ${where}`).bind(...params).first<{ total: number }>(),
        db
          .prepare(`SELECT id, user_id, event_type, ip_address, user_agent, detail, created_at FROM audit_events ${where} ORDER BY created_at DESC LIMIT ?${params.length + 1}`)
          .bind(...params, windowSize)
          .all<AuditRow>(),
      ]);
      let rows: UnifiedRow[] = (data.results ?? []).map((row) => {
        const details = asDetails(row.detail);
        return {
          id: String(row.id),
          action: row.event_type,
          entity_type: (details?.entity_type as string) ?? null,
          entity_id: (details?.entity_id as string) ?? null,
          user_id: row.user_id,
          ip_address: row.ip_address,
          details,
          created_at: String(row.created_at),
          source: "auth" as const,
        };
      });
      // These two live inside the JSON here, so they cannot be filtered in SQL
      // and the count above does not reflect them.
      if (entityType) rows = rows.filter((row) => row.entity_type === entityType);
      if (entityId) rows = rows.filter((row) => row.entity_id === entityId);
      return { total: Number(count?.total ?? 0), rows };
    } catch {
      return { rows: [], total: 0 };
    }
  };

  const readActions = async (): Promise<string[]> => {
    // The filter used to offer a hard-coded list naming events no code emits.
    const names = new Set<string>();
    const collect = async (sql: string) => {
      try {
        const result = await db.prepare(sql).all<{ name: string }>();
        for (const row of result.results ?? []) if (row.name) names.add(String(row.name));
      } catch {
        // A missing store contributes no names.
      }
    };
    if (wantLogs) await collect("SELECT DISTINCT action AS name FROM audit_logs ORDER BY name LIMIT 200");
    if (wantEvents) await collect("SELECT DISTINCT event_type AS name FROM audit_events ORDER BY name LIMIT 200");
    return [...names].sort();
  };

  const [logs, events, actions] = await Promise.all([readLogs(), readEvents(), readActions()]);

  const rows = [...logs.rows, ...events.rows]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    .slice(offset, offset + limit);

  const response: AuditApiResponse = {
    rows,
    total: logs.total + events.total,
    page,
    limit,
    actions,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
