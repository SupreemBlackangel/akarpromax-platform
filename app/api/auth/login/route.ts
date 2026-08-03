import { NextRequest, NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";

import { users } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { mapSessionRole, permissionsForSessionRole } from "@/lib/auth/identity-map";
import type { SQL } from "drizzle-orm";

export const dynamic = "force-dynamic";

type LoginBody = {
  email?: string;
  phone?: string;
  identifier?: string;
  password?: string;
};

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const rawIdentifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const looksLikeEmail = rawIdentifier.includes("@");
  const email = clean(body.email ?? (rawIdentifier && looksLikeEmail ? rawIdentifier : ""), 255).toLowerCase();
  const phone = clean(body.phone ?? (rawIdentifier && !looksLikeEmail ? rawIdentifier : ""), 20);
  const password = typeof body.password === "string" ? body.password : "";

  const identifier = email || phone;
  if (!identifier || !password) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  const conditions: SQL[] = [];
  if (email) conditions.push(eq(users.email, email));
  if (phone) conditions.push(eq(users.phone, phone));

  const { db, end } = getDb();
  let user: (typeof users.$inferSelect) | undefined;
  try {
    const rows = conditions.length
      ? await db.select().from(users).where(or(...conditions)).limit(1)
      : [];
    user = rows[0];
  } finally {
    await end();
  }

  if (!user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  if (!user.isActive) {
    return NextResponse.json({ error: "account_suspended" }, { status: 403 });
  }

  await createSession({ userId: user.id, role: user.role, permissions: [] });

  return NextResponse.json({
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
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "POST, OPTIONS" },
  });
}
