import { NextRequest, NextResponse } from "next/server";
import { getSessionIdentity, hasPermission } from "@/lib/identity-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";
import { ROLE_CATALOG, type SponsorRole } from "@/src/constants/roles";

export const dynamic = "force-dynamic";

const assignableRoles: SponsorRole[] = [
  "viewer", "analyst", "content_editor", "service_provider",
  "service_supervisor", "country_manager", "ad_manager", "ads_reviewer",
  "sponsor_admin", "sponsor_manager", "super_admin",
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

export async function GET() {
  const identity = await getSessionIdentity();
  if (!hasPermission(identity, PERMISSIONS.ROLES_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getRuntimeDb();
  const rows = await db.prepare(
    `SELECT id, email, display_name, role, country_code, status, created_at, updated_at
     FROM sponsor_access
     ORDER BY CASE role WHEN 'super_admin' THEN 0 WHEN 'sponsor_manager' THEN 1 WHEN 'country_manager' THEN 2 ELSE 3 END,
              display_name, email`,
  ).all<AccessRow>();

  return NextResponse.json({
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
    assignableRoles: assignableRoles.map((role) => ({
      id: role,
      nameAr: ROLE_CATALOG[role].nameAr,
      nameEn: ROLE_CATALOG[role].nameEn,
      descriptionAr: ROLE_CATALOG[role].descriptionAr,
      permissionCount: ROLE_CATALOG[role].permissions.length,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!hasPermission(identity, PERMISSIONS.ROLES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const newRole = typeof body.role === "string" ? body.role.trim() : "";
  if (!userId || !newRole) return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
  if (!assignableRoles.includes(newRole as SponsorRole)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const db = await getRuntimeDb();
  const existing = await db.prepare("SELECT id, role FROM sponsor_access WHERE id = ?1 LIMIT 1")
    .bind(userId).first<{ id: string; role: string }>();
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (existing.role === "super_admin" && newRole !== "super_admin") {
    const count = await db.prepare(
      "SELECT COUNT(*) AS total FROM sponsor_access WHERE role = 'super_admin' AND status = 'active'",
    ).first<{ total: number }>();
    if (Number(count?.total ?? 0) <= 1) {
      return NextResponse.json({ error: "Cannot remove the last super admin" }, { status: 409 });
    }
  }

  await db.prepare("UPDATE sponsor_access SET role = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2")
    .bind(newRole, userId).run();
  await db.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
     VALUES (?1, ?2, 'role.updated', 'sponsor_access', ?3, ?4)`,
  ).bind(crypto.randomUUID(), identity.email, userId, JSON.stringify({ from: existing.role, to: newRole })).run();

  return NextResponse.json({ ok: true, role: newRole });
}
