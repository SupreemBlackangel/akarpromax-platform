import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { expireDueVerifications } from "@/lib/amrs/organization-verification";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  await ensurePgIdentitySchema();

  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session?.userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const canExpire =
    session.role === "super_admin" ||
    session.permissions.includes("*") ||
    session.permissions.includes("verification.review");

  if (!canExpire) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const expired = await expireDueVerifications(session.userId);
  return NextResponse.json({ ok: true, expired: expired.length, recordIds: expired.map((row) => row.id) });
}
