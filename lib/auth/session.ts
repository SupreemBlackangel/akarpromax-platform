import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";

import { users } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { getPermissionsForRole } from "@/lib/rbac/check";

const SESSION_COOKIE = "akar_session";
const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET!);

export type SessionPayload = {
  userId: string;
  role: string;
  permissions: string[];
};

type CreateSessionInput = {
  userId: string;
  role: string;
  permissions?: string[];
};

export async function createSession(payload: CreateSessionInput) {
  const token = await new SignJWT({
    userId: payload.userId,
    role: payload.role,
    permissions: getPermissionsForRole(payload.role),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(explicitCookieHeader?: string): Promise<SessionPayload | null> {
  const token = await readSessionCookieValue(explicitCookieHeader);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

async function readSessionCookieValue(explicitCookieHeader?: string): Promise<string | null> {
  if (typeof explicitCookieHeader === "string") {
    const value = parseCookieHeader(explicitCookieHeader)[SESSION_COOKIE];
    if (value) return value;
  }
  try {
    const requestHeaders = await headers();
    const raw = requestHeaders.get("cookie");
    const value = parseCookieHeader(raw ?? "")[SESSION_COOKIE];
    if (value) return value;
  } catch {
    // headers() unavailable: fall through to cookies().
  }
  try {
    return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

function parseCookieHeader(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    result[key] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return result;
}

export async function getSessionUser(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    const userId = (payload as SessionPayload).userId;
    const { db, end } = getDb();
    try {
      const [user] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return null;
      return { email: user.email, fullName: user.name };
    } finally {
      await end();
    }
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
