import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { eq, lt } from "drizzle-orm";

import { users, sessionRevocations } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { permissionsForSessionRole } from "@/lib/auth/identity-map";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { logSecurityEvent } from "@/lib/security/audit";

export const SESSION_COOKIE = "akar_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  userId: string;
  role: string;
  permissions: string[];
  jti: string;
};

type CreateSessionInput = {
  userId: string;
  role: string;
  permissions?: string[];
};

// ---------------------------------------------------------------------------
// Pure primitives (testable outside the Next request context)
// ---------------------------------------------------------------------------

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function currentSecret(): string {
  return getRuntimeEnv().sessionSecret;
}

export async function signSessionPayload(
  payload: { userId: string; role: string; permissions?: string[]; jti?: string },
  secret: string,
  options: { expiresInSeconds?: number } = {},
): Promise<string> {
  const jti = payload.jti ?? crypto.randomUUID();
  const expiresInSeconds = options.expiresInSeconds ?? SESSION_MAX_AGE_SECONDS;
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    permissions: payload.permissions ?? permissionsForSessionRole(payload.role),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(secretKey(secret));
}

export async function verifySessionPayload(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    if (!payload.jti || isSessionRevoked(String(payload.jti))) return null;
    return {
      userId: String(payload.userId ?? ""),
      role: String(payload.role ?? ""),
      permissions: Array.isArray(payload.permissions) ? payload.permissions.map(String) : [],
      jti: String(payload.jti),
    };
  } catch {
    return null;
  }
}

// Server-side session invalidation (anti-fixation on logout). In-memory only:
// scoped to the current worker/process lifetime and documented as a limitation
// in ADR-PHASE-0-SESSION-COOKIE.md (shared store needed for horizontal scale).
const REVOKED_MAX_ENTRIES = 10_000;
const revokedSessionJtis = new Set<string>();

export function revokeSessionJti(jti: string): void {
  if (revokedSessionJtis.size >= REVOKED_MAX_ENTRIES) revokedSessionJtis.clear();
  revokedSessionJtis.add(jti);
}

export function isSessionRevoked(jti: string): boolean {
  return revokedSessionJtis.has(jti);
}

export function resetRevokedSessionsForTests(): void {
  revokedSessionJtis.clear();
}

/**
 * Durable revocation: Next bundles route handlers and server pages as separate
 * module graphs (and dev additionally splits request workers), so the in-memory
 * `revokedSessionJtis` set above is NOT shared by the page bundle. Logout would
 * revoke for `/api/*` but still leave SSR pages accepting the old cookie.
 * Persisting the jti in PG makes the check shared across every bundle/process.
 */
export async function persistSessionRevocation(jti: string, userId: string, expiresAt: Date): Promise<void> {
  try {
    const { db, end } = getDb();
    try {
      await db
        .insert(sessionRevocations)
        .values({ jti, userId, revokedAt: new Date(), expiresAt })
        .onConflictDoNothing();
      await db.delete(sessionRevocations).where(lt(sessionRevocations.expiresAt, new Date()));
    } finally {
      await end();
    }
  } catch {
    // Non-fatal: the in-memory set still revokes within the current bundle.
  }
}

async function isPersistedSessionRevoked(jti: string): Promise<boolean> {
  try {
    const { db, end } = getDb();
    try {
      const rows = await db
        .select({ jti: sessionRevocations.jti })
        .from(sessionRevocations)
        .where(eq(sessionRevocations.jti, jti))
        .limit(1);
      return rows.length > 0;
    } finally {
      await end();
    }
  } catch {
    return false;
  }
}

export type SessionCookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
  domain?: string;
};

export function buildSessionCookieOptions(env: NodeJS.ProcessEnv = process.env): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

// ---------------------------------------------------------------------------
// Next request-context wrappers
// ---------------------------------------------------------------------------

export async function createSession(payload: CreateSessionInput) {
  const token = await signSessionPayload(
    { userId: payload.userId, role: payload.role, permissions: payload.permissions },
    currentSecret(),
  );
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, buildSessionCookieOptions());
}

export async function getSession(explicitCookieHeader?: string): Promise<SessionPayload | null> {
  const token = await readSessionCookieValue(explicitCookieHeader);
  if (!token) return null;
  const payload = await verifySessionPayload(token, currentSecret());
  if (!payload) return null;
  if (await isPersistedSessionRevoked(payload.jti)) return null;
  return payload;
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
  const payload = await verifySessionPayload(token, currentSecret());
  if (!payload) return null;
  if (await isPersistedSessionRevoked(payload.jti)) return null;
  try {
    const { db, end } = getDb();
    try {
      const [user] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);
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
  const token = await readSessionCookieValue();
  if (token) {
    const payload = await verifySessionPayload(token, currentSecret());
    if (payload?.jti) {
      revokeSessionJti(payload.jti);
      await persistSessionRevocation(payload.jti, payload.userId, new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000));
      logSecurityEvent("AUTH_SESSION_INVALIDATED", {});
    }
  }
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
