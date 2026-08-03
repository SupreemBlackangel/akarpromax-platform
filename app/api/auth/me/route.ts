import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { users } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { mapSessionRole, permissionsForSessionRole } from "@/lib/auth/identity-map";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { db, end } = getDb();
  let user: (typeof users.$inferSelect) | undefined;
  try {
    const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    user = rows[0];
  } finally {
    await end();
  }

  if (!user) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: mapSessionRole(user.role),
        isActive: user.isActive,
        createdAt: user.createdAt,
        permissions: permissionsForSessionRole(user.role),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "GET, OPTIONS" },
  });
}
