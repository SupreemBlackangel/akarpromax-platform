import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

const MODULES = ["sponsors", "ads", "news", "services", "i18n", "reports"] as const;

type ScopeRow = {
  id: string;
  user_id: string;
  module: string;
  country_code: string | null;
  city_id: string | null;
  created_at: string;
  updated_at: string;
};

type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
};

export async function GET() {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ROLES_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getRuntimeDb();

  const [scopeRows, userRows] = await Promise.all([
    db.prepare(
      `SELECT id, user_id, module, country_code, city_id, created_at, updated_at
       FROM moderator_scopes ORDER BY module, country_code, city_id`,
    ).all<ScopeRow>(),
    db.prepare(
      `SELECT id, email, display_name, role FROM sponsor_access
       WHERE role IN ('content_editor', 'country_manager', 'service_supervisor', 'ad_manager', 'ads_reviewer', 'sponsor_admin', 'super_admin')
       ORDER BY display_name, email`,
    ).all<UserRow>(),
  ]);

  return NextResponse.json({
    scopes: scopeRows.results.map((row) => ({
      id: row.id,
      userId: row.user_id,
      module: row.module,
      countryCode: row.country_code,
      cityId: row.city_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    eligibleUsers: userRows.results.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
    })),
    modules: MODULES,
  });
}

export async function PATCH(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ROLES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const moduleScope = typeof body.module === "string" ? body.module.trim() : "";
  const countryCode = typeof body.countryCode === "string" ? body.countryCode.trim().toUpperCase() || null : null;
  const cityId = typeof body.cityId === "string" ? body.cityId.trim() || null : null;

  if (!userId || !moduleScope) {
    return NextResponse.json({ error: "userId and module are required" }, { status: 400 });
  }
  if (!(MODULES as readonly string[]).includes(moduleScope)) {
    return NextResponse.json({ error: "Invalid module" }, { status: 400 });
  }

  const db = await getRuntimeDb();

  const existing = await db.prepare(
    "SELECT id FROM moderator_scopes WHERE user_id = ?1 AND module = ?2 AND COALESCE(country_code, '') = COALESCE(?3, '') AND COALESCE(city_id, '') = COALESCE(?4, '') LIMIT 1",
  ).bind(userId, moduleScope, countryCode, cityId).first<{ id: string }>();

  if (existing) {
    return NextResponse.json({ id: existing.id, message: "Scope already exists" });
  }

  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO moderator_scopes (id, user_id, module, country_code, city_id, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)`,
  ).bind(id, userId, moduleScope, countryCode, cityId).run();

  await db.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
     VALUES (?1, ?2, 'moderator.scope.added', 'moderator_scopes', ?3, ?4)`,
  ).bind(
    crypto.randomUUID(),
    identity.email,
    id,
    JSON.stringify({ userId, module: moduleScope, countryCode, cityId }),
  ).run();

  return NextResponse.json({ id, ok: true });
}

export async function DELETE(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ROLES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scopeId = request.nextUrl.searchParams.get("id");
  if (!scopeId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = await getRuntimeDb();
  const existing = await db.prepare(
    "SELECT id, user_id, module, country_code, city_id FROM moderator_scopes WHERE id = ?1 LIMIT 1",
  ).bind(scopeId).first<ScopeRow>();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.prepare("DELETE FROM moderator_scopes WHERE id = ?1").bind(scopeId).run();

  await db.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
     VALUES (?1, ?2, 'moderator.scope.removed', 'moderator_scopes', ?3, ?4)`,
  ).bind(
    crypto.randomUUID(),
    identity.email,
    scopeId,
    JSON.stringify({ userId: existing.user_id, module: existing.module, countryCode: existing.country_code, cityId: existing.city_id }),
  ).run();

  return new NextResponse(null, { status: 204 });
}
