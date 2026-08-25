import { NextResponse } from "next/server";
import { getSessionIdentity, hasPermission } from "@/lib/identity-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";
import { roleNameAr } from "@/src/constants/roles";

export const dynamic = "force-dynamic";

type CountRow = { name: string; total: number };
type EventRow = { country_code: string; impressions: number; clicks: number };
type AuditRow = { action: string; entity_type: string; entity_id: string | null; created_at: string };

async function countsBy(db: D1Database, table: string, column: string): Promise<Record<string, number>> {
  try {
    const rows = await db.prepare(
      `SELECT ${column} AS name, COUNT(*) AS total FROM ${table} GROUP BY ${column}`,
    ).all<CountRow>();
    const result: Record<string, number> = {};
    rows.results.forEach((row) => { result[row.name] = Number(row.total); });
    return result;
  } catch {
    return {};
  }
}

function groupBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  rows.forEach((row) => {
    const k = key(row);
    result[k] = (result[k] ?? 0) + 1;
  });
  return result;
}

export async function GET() {
  const identity = await getSessionIdentity();
  if (!hasPermission(identity, PERMISSIONS.ADMIN_DASHBOARD_VIEW) &&
      !hasPermission(identity, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getRuntimeDb();
  const [advertiserByStatus, advertiserByCountry, campaignByStatus, campaignByType,
    accessByRole, usersByStatus, adEventsByCountry, adEvents, auditRows, plans] = await Promise.all([
    countsBy(db, "sponsors", "status"),
    db.prepare(
      `SELECT country_code, COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0) AS impressions,
              COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) AS clicks
       FROM sponsor_events GROUP BY country_code ORDER BY impressions DESC LIMIT 10`,
    ).all<EventRow>(),
    countsBy(db, "ad_campaigns", "status"),
    countsBy(db, "ad_campaigns", "campaign_type"),
    countsBy(db, "sponsor_access", "role"),
    countsBy(db, "sponsor_users", "status"),
    db.prepare(
      `SELECT country_code, COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0) AS impressions,
              COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) AS clicks
       FROM ad_events GROUP BY country_code ORDER BY impressions DESC LIMIT 10`,
    ).all<EventRow>(),
    db.prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0) AS impressions,
        COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) AS clicks
       FROM ad_events`,
    ).first<{ impressions: number; clicks: number }>(),
    db.prepare(
      `SELECT action, entity_type, entity_id, created_at
       FROM audit_logs ORDER BY created_at DESC LIMIT 10`,
    ).all<AuditRow>(),
    db.prepare("SELECT COUNT(*) AS total FROM sponsor_plans").first<{ total: number }>(),
  ]);

  const advertiserEvents = await db.prepare(
    `SELECT COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0) AS impressions,
            COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) AS clicks
     FROM sponsor_events`,
  ).first<{ impressions: number; clicks: number }>();

  const advertiserToday = await db.prepare(
    `SELECT COUNT(*) AS total FROM sponsor_events WHERE date(occurred_at) = date('now')`,
  ).first<{ total: number }>();
  const adToday = await db.prepare(
    `SELECT COUNT(*) AS total FROM ad_events WHERE date(occurred_at) = date('now')`,
  ).first<{ total: number }>();

  return NextResponse.json({
    identity,
    advertisers: {
      total: Object.values(advertiserByStatus).reduce((sum, n) => sum + n, 0),
      byStatus: advertiserByStatus,
      byCountry: advertiserByCountry.results.map((row) => ({
        country: row.country_code,
        impressions: Number(row.impressions),
        clicks: Number(row.clicks),
      })),
    },
    campaigns: {
      total: Object.values(campaignByStatus).reduce((sum, n) => sum + n, 0),
      byStatus: campaignByStatus,
      byType: campaignByType,
    },
    access: {
      total: Object.values(accessByRole).reduce((sum, n) => sum + n, 0),
      byRole: Object.fromEntries(Object.entries(accessByRole).map(([role, count]) => [role, { label: roleNameAr(role), count }])),
    },
    members: {
      total: Object.values(usersByStatus).reduce((sum, n) => sum + n, 0),
      byStatus: usersByStatus,
    },
    events: {
      advertiserImpressions: Number(advertiserEvents?.impressions ?? 0),
      advertiserClicks: Number(advertiserEvents?.clicks ?? 0),
      adImpressions: Number(adEvents?.impressions ?? 0),
      adClicks: Number(adEvents?.clicks ?? 0),
      today: Number(advertiserToday?.total ?? 0) + Number(adToday?.total ?? 0),
    },
    plans: Number(plans?.total ?? 0),
    audit: auditRows.results.map((row) => ({
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      createdAt: row.created_at,
    })),
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
