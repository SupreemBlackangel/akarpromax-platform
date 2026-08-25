import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { verificationRecords } from "@/lib/db/schema";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";

export const dynamic = "force-dynamic";

function canReview(session: { role: string; permissions: string[] }): boolean {
  return (
    session.role === "super_admin" ||
    session.permissions.includes("*") ||
    session.permissions.includes("verification.review")
  );
}

export async function GET(request: NextRequest) {
  await ensurePgIdentitySchema();

  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session?.userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!canReview(session)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const status = request.nextUrl.searchParams.get("status") ?? "pending";
  if (!["pending", "verified", "failed", "expired", "revoked"].includes(status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  const parsedLimit = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 50;

  const { db, end } = getDb();
  try {
    const records = await db
      .select()
      .from(verificationRecords)
      .where(eq(verificationRecords.status, status))
      .orderBy(desc(verificationRecords.createdAt))
      .limit(limit);

    return NextResponse.json(
      { records, total: records.length },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } finally {
    await end();
  }
}
