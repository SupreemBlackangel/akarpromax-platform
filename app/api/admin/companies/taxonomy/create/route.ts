import { NextRequest, NextResponse } from "next/server";
import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { ensureCompanySchema } from "@/lib/company-schema";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !hasSponsorPermission(identity, PERMISSIONS.PROPERTIES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const nameEn = typeof body.name_en === "string" ? body.name_en.trim() : "";
  const nameAr = typeof body.name_ar === "string" ? body.name_ar.trim() : "";
  const nameTr = typeof body.name_tr === "string" ? body.name_tr.trim() : "";
  if (!nameEn || !nameAr || !nameTr) {
    return NextResponse.json({ error: "name_en, name_ar, and name_tr are required" }, { status: 400 });
  }
  const slug = typeof body.slug === "string" && body.slug.trim() ? body.slug.trim() : nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const icon = typeof body.icon === "string" ? body.icon : null;
  const isActive = typeof body.is_active === "boolean" ? (body.is_active ? 1 : 0) : 1;
  const sortOrder = typeof body.sort_order === "number" ? body.sort_order : 0;
  const db = await getRuntimeDb();
  await ensureCompanySchema(db);
  const id = slug;
  const existing = await db
    .prepare("SELECT id FROM company_specialties WHERE id = ?1 LIMIT 1")
    .bind(id)
    .first<{ id: string }>();
  if (existing) {
    return NextResponse.json({ error: "A specialty with this slug already exists" }, { status: 409 });
  }
  await db
    .prepare(
      `INSERT INTO company_specialties (id, label_ar, label_en, label_tr, icon, is_active, sort_order)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(id, nameAr, nameEn, nameTr, icon, isActive, sortOrder)
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
