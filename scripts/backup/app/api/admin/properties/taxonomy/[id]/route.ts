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

type Row = {
  id: string;
  label_ar: string;
  label_en: string;
  label_tr: string;
  icon: string | null;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type TypeRow = Row & {
  category_id: string;
  show_in_search: number;
  show_in_add_property: number;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.PROPERTIES_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getRuntimeDb();

  const cat = await db
    .prepare("SELECT * FROM property_categories WHERE id = ?1 LIMIT 1")
    .bind(id)
    .first<Row>();

  if (cat) {
    const types = await db
      .prepare("SELECT * FROM property_types WHERE category_id = ?1 ORDER BY sort_order ASC")
      .bind(id)
      .all<TypeRow>();

    return NextResponse.json({
      kind: "category",
      item: {
        ...cat,
        is_active: Boolean(cat.is_active),
        types: types.results.map((t) => ({
          ...t,
          is_active: Boolean(t.is_active),
          show_in_search: Boolean(t.show_in_search),
          show_in_add_property: Boolean(t.show_in_add_property),
        })),
      },
    });
  }

  const typ = await db
    .prepare("SELECT * FROM property_types WHERE id = ?1 LIMIT 1")
    .bind(id)
    .first<TypeRow>();

  if (typ) {
    return NextResponse.json({
      kind: "type",
      item: {
        ...typ,
        is_active: Boolean(typ.is_active),
        show_in_search: Boolean(typ.show_in_search),
        show_in_add_property: Boolean(typ.show_in_add_property),
      },
    });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.PROPERTIES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const db = await getRuntimeDb();

  const cat = await db
    .prepare("SELECT id FROM property_categories WHERE id = ?1 LIMIT 1")
    .bind(id)
    .first<{ id: string }>();

  if (cat) {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (typeof body.label_en === "string") { sets.push("label_en = ?"); values.push(body.label_en); }
    if (typeof body.label_ar === "string") { sets.push("label_ar = ?"); values.push(body.label_ar); }
    if (typeof body.label_tr === "string") { sets.push("label_tr = ?"); values.push(body.label_tr); }
    if (typeof body.icon === "string" || body.icon === null) { sets.push("icon = ?"); values.push(body.icon); }
    if (typeof body.is_active === "boolean") { sets.push("is_active = ?"); values.push(body.is_active ? 1 : 0); }
    if (typeof body.sort_order === "number") { sets.push("sort_order = ?"); values.push(body.sort_order); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    sets.push("updated_at = CURRENT_TIMESTAMP");
    await db
      .prepare(`UPDATE property_categories SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...values, id)
      .run();

    await writeAudit(db, identity.email, "property_category.updated", "property_category", id, { fields: Object.keys(body) });
    return NextResponse.json({ ok: true });
  }

  const typ = await db
    .prepare("SELECT id FROM property_types WHERE id = ?1 LIMIT 1")
    .bind(id)
    .first<{ id: string }>();

  if (typ) {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (typeof body.label_en === "string") { sets.push("label_en = ?"); values.push(body.label_en); }
    if (typeof body.label_ar === "string") { sets.push("label_ar = ?"); values.push(body.label_ar); }
    if (typeof body.label_tr === "string") { sets.push("label_tr = ?"); values.push(body.label_tr); }
    if (typeof body.icon === "string" || body.icon === null) { sets.push("icon = ?"); values.push(body.icon); }
    if (typeof body.is_active === "boolean") { sets.push("is_active = ?"); values.push(body.is_active ? 1 : 0); }
    if (typeof body.sort_order === "number") { sets.push("sort_order = ?"); values.push(body.sort_order); }
    if (typeof body.show_in_search === "boolean") { sets.push("show_in_search = ?"); values.push(body.show_in_search ? 1 : 0); }
    if (typeof body.show_in_add_property === "boolean") { sets.push("show_in_add_property = ?"); values.push(body.show_in_add_property ? 1 : 0); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    sets.push("updated_at = CURRENT_TIMESTAMP");
    await db
      .prepare(`UPDATE property_types SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...values, id)
      .run();

    await writeAudit(db, identity.email, "property_type.updated", "property_type", id, { fields: Object.keys(body) });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.PROPERTIES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getRuntimeDb();

  const cat = await db
    .prepare("SELECT id FROM property_categories WHERE id = ?1 LIMIT 1")
    .bind(id)
    .first<{ id: string }>();

  if (cat) {
    const typeCount = await db
      .prepare("SELECT COUNT(*) AS count FROM property_types WHERE category_id = ?1")
      .bind(id)
      .first<{ count: number }>();
    if (typeCount && Number(typeCount.count) > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with associated types. Remove types first." },
        { status: 409 },
      );
    }

    const listingCount = await db
      .prepare("SELECT COUNT(*) AS count FROM property_listings WHERE property_type IN (SELECT id FROM property_types WHERE category_id = ?1)")
      .bind(id)
      .first<{ count: number }>();
    if (listingCount && Number(listingCount.count) > 0) {
      return NextResponse.json(
        { error: "Cannot delete category referenced by property listings." },
        { status: 409 },
      );
    }

    await db.prepare("DELETE FROM property_categories WHERE id = ?1").bind(id).run();
    await writeAudit(db, identity.email, "property_category.deleted", "property_category", id, {});
    return NextResponse.json({ ok: true });
  }

  const typ = await db
    .prepare("SELECT id FROM property_types WHERE id = ?1 LIMIT 1")
    .bind(id)
    .first<{ id: string }>();

  if (typ) {
    const listingCount = await db
      .prepare("SELECT COUNT(*) AS count FROM property_listings WHERE property_type = ?1")
      .bind(id)
      .first<{ count: number }>();
    if (listingCount && Number(listingCount.count) > 0) {
      return NextResponse.json(
        { error: "Cannot delete type referenced by property listings." },
        { status: 409 },
      );
    }

    await db.prepare("DELETE FROM property_types WHERE id = ?1").bind(id).run();
    await writeAudit(db, identity.email, "property_type.deleted", "property_type", id, {});
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
