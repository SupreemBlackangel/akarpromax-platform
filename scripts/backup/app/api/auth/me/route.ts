import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { users } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { mapSessionRole, permissionsForSessionRole } from "@/lib/auth/identity-map";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { augmentPermissionsForServiceProviderCapability } from "@/lib/services/identity";
import { createRequestId } from "@/lib/security/audit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { assertSafeOrigin } from "@/lib/security/origin";

export const dynamic = "force-dynamic";

// Validate the production environment at worker boot, before any request.
getRuntimeEnv();

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  assertSafeOrigin(request);
  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session) {
    return NextResponse.json(
      { authenticated: false, requestId },
      applySecurityHeaders({
        status: 401,
        headers: { "Cache-Control": "private, no-store" },
      }),
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

  if (!user || !user.isActive) {
    return NextResponse.json(
      { authenticated: false, requestId },
      applySecurityHeaders({
        status: 401,
        headers: { "Cache-Control": "private, no-store" },
      }),
    );
  }

  const permissions = await augmentPermissionsForServiceProviderCapability(
    user.email?.trim().toLowerCase() ?? null,
    permissionsForSessionRole(user.role),
  );

  return NextResponse.json(
    {
      authenticated: true,
      requestId,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: mapSessionRole(user.role),
        status: user.status,
        emailVerified: user.emailVerifiedAt !== null ? true : user.email !== null ? false : null,
        isActive: user.isActive,
        onboardingCompleted: user.onboardingCompletedAt !== null,
        preferredLanguage: user.preferredLanguage,
        createdAt: user.createdAt,
        permissions,
      },
    },
    applySecurityHeaders({ headers: { "Cache-Control": "private, no-store" } }),
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "GET, OPTIONS", ...applySecurityHeaders().headers },
  });
}
