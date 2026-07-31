import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission, type SponsorRole } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

const assignableRoles: SponsorRole[] = [
  "viewer",
  "analyst",
  "content_editor",
  "country_manager",
  "ad_manager",
  "sponsor_admin",
  "sponsor_manager",
  "super_admin",
];

type AccessRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  country_code: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET() {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.USERS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getRuntimeDb();
  const rows = await db.prepare(
    `SELECT id, email, display_name, role, country_code, status, created_at, updated_at
     FROM sponsor_access
     ORDER BY CASE role WHEN 'super_admin' THEN 0 WHEN 'ad_manager' THEN 1 WHEN 'sponsor_admin' THEN 2 ELSE 3 END,
              display_name, email`,
  ).all<AccessRow>();

  return NextResponse.json({
    identity,
    users: rows.results.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      countryCode: row.country_code,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.USERS_CREATE) && !hasSponsorPermission(identity, PERMISSIONS.USERS_UPDATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const email = clean(body.email, 180).toLowerCase();
  const displayName = clean(body.displayName, 120);
  const role = clean(body.role, 40) as SponsorRole;
  const countryCode = clean(body.countryCode, 2).toUpperCase() || null;
  const status = clean(body.status, 20) === "disabled" ? "disabled" : "active";
  if (!email.includes("@") || !assignableRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid access assignment" }, { status: 400 });
  }
  if (role === "country_manager" && !countryCode) {
    return NextResponse.json({ error: "Country managers require a country" }, { status: 400 });
  }

  const db = await getRuntimeDb();
  const existing = await db.prepare(
    "SELECT id, role FROM sponsor_access WHERE lower(email) = ?1 LIMIT 1",
  )
    .bind(email)
    .first<{ id: string; role: SponsorRole }>();

  if (existing?.role === "super_admin" && role !== "super_admin") {
    const count = await db.prepare(
      "SELECT COUNT(*) AS total FROM sponsor_access WHERE role = 'super_admin' AND status = 'active'",
    ).first<{ total: number }>();
    if (Number(count?.total ?? 0) <= 1) {
      return NextResponse.json({ error: "At least one active super administrator is required" }, { status: 409 });
    }
  }

  const id = existing?.id ?? crypto.randomUUID();
  await db.prepare(
    `INSERT INTO sponsor_access
      (id, email, display_name, role, country_code, status, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)
     ON CONFLICT(email) DO UPDATE SET
       display_name = excluded.display_name,
       role = excluded.role,
       country_code = excluded.country_code,
       status = excluded.status,
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(id, email, displayName || null, role, countryCode, status)
    .run();

  await db.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
     VALUES (?1, ?2, 'sponsor.access.updated', 'sponsor_access', ?3, ?4)`,
  )
    .bind(crypto.randomUUID(), identity.email, id, JSON.stringify({ email, role, countryCode, status }))
    .run();

  return NextResponse.json({ id });
}

export async function DELETE(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.USERS_DELETE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = clean(request.nextUrl.searchParams.get("id"), 80);
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = await getRuntimeDb();
  const existing = await db.prepare(
    "SELECT id, email, role FROM sponsor_access WHERE id = ?1 LIMIT 1",
  )
    .bind(id)
    .first<{ id: string; email: string; role: SponsorRole }>();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.role === "super_admin") {
    const count = await db.prepare(
      "SELECT COUNT(*) AS total FROM sponsor_access WHERE role = 'super_admin' AND status = 'active'",
    ).first<{ total: number }>();
    if (Number(count?.total ?? 0) <= 1) {
      return NextResponse.json({ error: "At least one active super administrator is required" }, { status: 409 });
    }
  }

  await db.prepare("DELETE FROM sponsor_access WHERE id = ?1").bind(id).run();
  await db.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
     VALUES (?1, ?2, 'sponsor.access.deleted', 'sponsor_access', ?3, ?4)`,
  )
    .bind(crypto.randomUUID(), identity.email, id, JSON.stringify({ email: existing.email }))
    .run();

  return new NextResponse(null, { status: 204 });
}
