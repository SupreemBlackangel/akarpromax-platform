import { NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";

export const dynamic = "force-dynamic";

type CategoryRow = {
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

type TypeRow = {
  id: string;
  category_id: string;
  label_ar: string;
  label_en: string;
  label_tr: string;
  icon: string | null;
  is_active: number;
  sort_order: number;
  show_in_search: number;
  show_in_add_property: number;
  created_at: string;
  updated_at: string;
};

export async function GET() {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.PROPERTIES_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getRuntimeDb();

  const categoryRows = await db
    .prepare("SELECT * FROM property_categories ORDER BY sort_order ASC, created_at ASC")
    .all<CategoryRow>();

  const typeRows = await db
    .prepare("SELECT * FROM property_types ORDER BY sort_order ASC, created_at ASC")
    .all<TypeRow>();

  const typesByCategory = new Map<string, TypeRow[]>();
  for (const row of typeRows.results) {
    const list = typesByCategory.get(row.category_id) ?? [];
    list.push(row);
    typesByCategory.set(row.category_id, list);
  }

  const categories = categoryRows.results.map((cat) => ({
    id: cat.id,
    label_en: cat.label_en,
    label_ar: cat.label_ar,
    label_tr: cat.label_tr,
    icon: cat.icon,
    is_active: Boolean(cat.is_active),
    sort_order: cat.sort_order,
    created_at: cat.created_at,
    updated_at: cat.updated_at,
    types: (typesByCategory.get(cat.id) ?? []).map((t) => ({
      id: t.id,
      category_id: t.category_id,
      label_en: t.label_en,
      label_ar: t.label_ar,
      label_tr: t.label_tr,
      icon: t.icon,
      is_active: Boolean(t.is_active),
      sort_order: t.sort_order,
      show_in_search: Boolean(t.show_in_search),
      show_in_add_property: Boolean(t.show_in_add_property),
      created_at: t.created_at,
      updated_at: t.updated_at,
    })),
  }));

  return NextResponse.json({ categories }, { headers: { "Cache-Control": "no-store" } });
}
