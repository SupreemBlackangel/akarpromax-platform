import { NextRequest, NextResponse } from "next/server";
import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { ensureCompanySchema } from "@/lib/company-schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !hasSponsorPermission(identity, PERMISSIONS.PROPERTIES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const db = await getRuntimeDb();
  await ensureCompanySchema(db);
  const row = await db
    .prepare(
      "SELECT id, label_ar, label_en, label_tr, icon, is_active, sort_order FROM company_specialties WHERE id = ?1 LIMIT 1",
    )
    .bind(id)
    .first<{ id: string; label_ar: string; label_en: string; label_tr: string; icon: string | null; is_active: number; sort_order: number }>();
  if (!row) {
    return NextResponse.json({ error: "Specialty not found" }, { status: 404 });
  }
  return NextResponse.json({
    specialty: {
      id: row.id,
      name_en: row.label_en,
      name_ar: row.label_ar,
      name_tr: row.label_tr,
      slug: row.id,
      icon: row.icon,
      is_active: row.is_active === 1,
      sort_order: row.sort_order,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !hasSponsorPermission(identity, PERMISSIONS.PROPERTIES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const db = await getRuntimeDb();
  await ensureCompanySchema(db);
  const existing = await db
    .prepare("SELECT id FROM company_specialties WHERE id = ?1 LIMIT 1")
    .bind(id)
    .first<{ id: string }>();
  if (!existing) {
    return NextResponse.json({ error: "Specialty not found" }, { status: 404 });
  }
  const sets: string[] = [];
  const values: unknown[] = [];
  if (typeof body.name_en === "string") { sets.push("label_en = ?"); values.push(body.name_en); }
  if (typeof body.name_ar === "string") { sets.push("label_ar = ?"); values.push(body.name_ar); }
  if (typeof body.name_tr === "string") { sets.push("label_tr = ?"); values.push(body.name_tr); }
  if (typeof body.icon === "string" || body.icon === null) { sets.push("icon = ?"); values.push(body.icon); }
  if (typeof body.is_active === "boolean") { sets.push("is_active = ?"); values.push(body.is_active ? 1 : 0); }
  if (typeof body.sort_order === "number") { sets.push("sort_order = ?"); values.push(body.sort_order); }
  if (sets.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  sets.push("updated_at = CURRENT_TIMESTAMP");
  await db
    .prepare(`UPDATE company_specialties SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values, id)
    .run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !hasSponsorPermission(identity, PERMISSIONS.PROPERTIES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const db = await getRuntimeDb();
  await ensureCompanySchema(db);
  const existing = await db
    .prepare("SELECT id FROM company_specialties WHERE id = ?1 LIMIT 1")
    .bind(id)
    .first<{ id: string }>();
  if (!existing) {
    return NextResponse.json({ error: "Specialty not found" }, { status: 404 });
  }
  await db.prepare("DELETE FROM company_specialties WHERE id = ?1").bind(id).run();
  return NextResponse.json({ ok: true });
}
