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

type AuditApiResponse = {
  rows: {
    id: string;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    user_id: string | null;
    ip_address: string | null;
    details: Record<string, unknown> | null;
    created_at: string;
  }[];
  total: number;
  page: number;
  limit: number;
};

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

  const db = await getRuntimeDb();

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (action) {
    conditions.push(`event_type = ?${paramIndex}`);
    params.push(action);
    paramIndex++;
  }
  if (userId) {
    conditions.push(`user_id = ?${paramIndex}`);
    params.push(userId);
    paramIndex++;
  }
  if (from) {
    conditions.push(`created_at >= ?${paramIndex}`);
    params.push(from);
    paramIndex++;
  }
  if (to) {
    conditions.push(`created_at <= ?${paramIndex}`);
    params.push(to);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countSql = `SELECT COUNT(*) AS total FROM audit_events ${whereClause}`;
  const dataSql = `SELECT id, user_id, event_type, ip_address, user_agent, detail, created_at FROM audit_events ${whereClause} ORDER BY created_at DESC LIMIT ?${paramIndex} OFFSET ?${paramIndex + 1}`;

  const [countResult, dataResult] = await Promise.all([
    db.prepare(countSql).bind(...params).first<{ total: number }>(),
    db.prepare(dataSql).bind(...params, limit, offset).all<AuditRow>(),
  ]);

  let rows = dataResult.results.map((row) => ({
    id: row.id,
    action: row.event_type,
    entity_type: (row.detail?.entity_type as string) ?? null,
    entity_id: (row.detail?.entity_id as string) ?? null,
    user_id: row.user_id,
    ip_address: row.ip_address,
    details: row.detail,
    created_at: row.created_at,
  }));

  if (entityType) {
    rows = rows.filter((r) => r.entity_type === entityType);
  }
  if (entityId) {
    rows = rows.filter((r) => r.entity_id === entityId);
  }

  const response: AuditApiResponse = {
    rows,
    total: Number(countResult?.total ?? 0),
    page,
    limit,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
