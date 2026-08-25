import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";

export const dynamic = "force-dynamic";

function writeAudit(db: D1Database, actor: string | null, action: string, entityType: string, entityId: string, metadata: object) {
  return db
    .prepare(
      `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(crypto.randomUUID(), actor, action, entityType, entityId, JSON.stringify(metadata))
    .run()
    .catch(() => {});
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.PROPERTIES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const kind = body.kind;
  if (kind !== "category" && kind !== "type") {
    return NextResponse.json({ error: "kind must be 'category' or 'type'" }, { status: 400 });
  }

  const labelEn = typeof body.label_en === "string" ? body.label_en.trim() : "";
  const labelAr = typeof body.label_ar === "string" ? body.label_ar.trim() : "";
  const labelTr = typeof body.label_tr === "string" ? body.label_tr.trim() : "";

  if (!labelEn || !labelAr || !labelTr) {
    return NextResponse.json({ error: "label_en, label_ar, and label_tr are required" }, { status: 400 });
  }

  const db = await getRuntimeDb();

  if (kind === "category") {
    const id = slugify(labelEn) || crypto.randomUUID().slice(0, 12);
    const icon = typeof body.icon === "string" ? body.icon : null;
    const sortOrder = typeof body.sort_order === "number" ? body.sort_order : 0;

    const existing = await db.prepare("SELECT id FROM property_categories WHERE id = ?1 LIMIT 1").bind(id).first<{ id: string }>();
    if (existing) {
      return NextResponse.json({ error: "A category with this id already exists" }, { status: 409 });
    }

    await db
      .prepare(
        `INSERT INTO property_categories (id, label_en, label_ar, label_tr, icon, is_active, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .bind(id, labelEn, labelAr, labelTr, icon, sortOrder)
      .run();

    await writeAudit(db, identity.email, "property_category.created", "property_category", id, { label_en: labelEn });
    return NextResponse.json({ id, kind: "category" }, { status: 201 });
  }

  const categoryId = typeof body.category_id === "string" ? body.category_id.trim() : "";
  if (!categoryId) {
    return NextResponse.json({ error: "category_id is required for type" }, { status: 400 });
  }

  const parent = await db.prepare("SELECT id FROM property_categories WHERE id = ?1 LIMIT 1").bind(categoryId).first<{ id: string }>();
  if (!parent) {
    return NextResponse.json({ error: "Parent category not found" }, { status: 404 });
  }

  const id = slugify(labelEn) || crypto.randomUUID().slice(0, 12);
  const icon = typeof body.icon === "string" ? body.icon : null;
  const sortOrder = typeof body.sort_order === "number" ? body.sort_order : 0;
  const showInSearch = typeof body.show_in_search === "boolean" ? (body.show_in_search ? 1 : 0) : 1;
  const showInAddProperty = typeof body.show_in_add_property === "boolean" ? (body.show_in_add_property ? 1 : 0) : 1;

  const existing = await db.prepare("SELECT id FROM property_types WHERE id = ?1 LIMIT 1").bind(id).first<{ id: string }>();
  if (existing) {
    return NextResponse.json({ error: "A type with this id already exists" }, { status: 409 });
  }

  await db
    .prepare(
      `INSERT INTO property_types (id, category_id, label_en, label_ar, label_tr, icon, is_active, sort_order, show_in_search, show_in_add_property, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    )
    .bind(id, categoryId, labelEn, labelAr, labelTr, icon, sortOrder, showInSearch, showInAddProperty)
    .run();

  await writeAudit(db, identity.email, "property_type.created", "property_type", id, { label_en: labelEn, category_id: categoryId });
  return NextResponse.json({ id, kind: "type" }, { status: 201 });
}
