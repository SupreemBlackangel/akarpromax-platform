import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { organizationBranches, organizationMembers, organizations } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { db, end } = getDb();
  try {
    const [company] = await db
      .select()
      .from(organizations)
      .where(
        and(
          eq(organizations.id, id),
          inArray(organizations.type, ["business", "other"]),
          eq(organizations.status, "active"),
        ),
      )
      .limit(1);

    if (!company) return NextResponse.json({ success: false, error: "الشركة غير موجودة" }, { status: 404 });

    const branches = await db
      .select()
      .from(organizationBranches)
      .where(and(eq(organizationBranches.organizationId, id), eq(organizationBranches.status, "active")));

    const activeMembers = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, id), eq(organizationMembers.status, "active")));

    return NextResponse.json(
      { success: true, data: { ...company, branches, membersCount: activeMembers.length } },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } finally {
    await end();
  }
}
