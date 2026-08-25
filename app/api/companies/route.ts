import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { organizations } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const country = sp.get("country");
  const city = sp.get("city");
  const q = sp.get("q")?.trim();
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.max(1, Math.min(100, Number.parseInt(sp.get("limit") ?? "20", 10) || 20));
  const offset = (page - 1) * limit;

  const conditions = [inArray(organizations.type, ["business", "other"]), eq(organizations.status, "active")];
  if (country) conditions.push(eq(organizations.countryCode, country));
  if (city) conditions.push(eq(organizations.cityId, city));
  if (q) {
    conditions.push(or(ilike(organizations.nameAr, `%${q}%`), ilike(organizations.nameEn, `%${q}%`))!);
  }

  const { db, end } = getDb();
  try {
    const where = and(...conditions);
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(organizations).where(where);
    const data = await db
      .select()
      .from(organizations)
      .where(where)
      .orderBy(desc(organizations.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ success: true, data, total: count ?? 0, page, limit });
  } finally {
    await end();
  }
}
