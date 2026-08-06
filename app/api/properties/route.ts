import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PROPERTY_SELECT, serialiseProperty, type PropertyRow } from "@/lib/properties-format";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const country = (request.nextUrl.searchParams.get("country") || "om").toLowerCase();
  const city = request.nextUrl.searchParams.get("city")?.toLowerCase() || "";
  const featured = request.nextUrl.searchParams.get("featured") === "1";
  const limit = Math.max(1, Math.min(50, Number(request.nextUrl.searchParams.get("limit")) || 12));

  const params: unknown[] = [country];
  if (city) params.push(city);
  const cityClause = city ? "AND lower(city_id) = ?2" : "";
  const featuredClause = featured ? "AND is_featured = 1" : "";
  const limitIndex = params.length + 1;
  params.push(limit);

  try {
    const db = await getRuntimeDb();
    const rows = await db
      .prepare(
        `${PROPERTY_SELECT}
         WHERE status = 'active'
           AND lower(country_code) = ?1
           ${cityClause}
           ${featuredClause}
         ORDER BY is_featured DESC, priority ASC, updated_at DESC
         LIMIT ?${limitIndex}`,
      )
      .bind(...params)
      .all<PropertyRow>();
    return NextResponse.json({ properties: rows.results.map(serialiseProperty) });
  } catch {
    return NextResponse.json({ properties: [] });
  }
}
