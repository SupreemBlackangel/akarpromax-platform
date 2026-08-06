import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PROPERTY_SELECT, serialiseProperty, type PropertyRow } from "@/lib/properties-format";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = await getRuntimeDb();
    const row = await db
      .prepare(
        `${PROPERTY_SELECT}
         WHERE (id = ?1 OR lower(slug) = lower(?1))
           AND status = 'active'
         LIMIT 1`,
      )
      .bind(id)
      .first<PropertyRow>();
    if (!row) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    return NextResponse.json({ property: serialiseProperty(row) });
  } catch {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }
}
