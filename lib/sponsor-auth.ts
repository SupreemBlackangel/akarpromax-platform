import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { users as pgUsers } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { mapSessionRole, permissionsForSessionRole } from "@/lib/auth/identity-map";
import type { SponsorRole } from "@/src/constants/roles";

export type { SponsorRole } from "@/src/constants/roles";

export type SponsorIdentity = {
  authenticated: boolean;
  email: string | null;
  displayName: string;
  role: SponsorRole;
  countryCode: string | null;
  permissions: string[];
};

export const GUEST_IDENTITY: SponsorIdentity = {
  authenticated: false,
  email: null,
  displayName: "Guest",
  role: "guest",
  countryCode: null,
  permissions: [],
};

type SessionIdentityResolver = () => Promise<SponsorIdentity | null>;
let identityResolverOverride: SessionIdentityResolver | null = null;

/**
 * Test-only seam: lets deterministic tests inject a fabricated session
 * identity for the services module without faking ChatGPT headers.
 * Passing null clears the override.
 */
export function setSessionIdentityResolverForTests(resolver: SessionIdentityResolver | null): void {
  identityResolverOverride = resolver;
}

/**
 * AkarProMax Identity (session-only).
 * Resolves strictly from the HttpOnly `akar_session` cookie and never
 * consults external LLM identity headers, Bearer tokens, or the legacy
 * auto-admin bypass. Returns GUEST_IDENTITY when there is no valid session.
 */
export async function getSessionIdentity(): Promise<SponsorIdentity> {
  if (identityResolverOverride) {
    const identity = await identityResolverOverride();
    if (identity) return identity;
  }
  const sessionIdentity = await identityFromSession();
  return sessionIdentity ?? GUEST_IDENTITY;
}

export async function getSponsorIdentity(): Promise<SponsorIdentity> {
  return getSessionIdentity();
}

/**
 * Session-only guard for protected (admin/workspace) server pages.
 * Resolves identity strictly from the HttpOnly `akar_session` cookie and
 * redirects to "/" when there is no valid session.
 */
export async function requireSessionUser(returnTo = "/"): Promise<{ email: string; displayName: string }> {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) redirect(`/?next=${encodeURIComponent(returnTo)}`);
  return { email: identity.email, displayName: identity.displayName };
}

async function identityFromSession(): Promise<SponsorIdentity | null> {
  let session;
  try {
    session = await getSession();
  } catch {
    return null;
  }
  if (!session?.userId) return null;

  try {
    const { db, end } = getDb();
    let user: { email: string | null; name: string | null } | undefined;
    try {
      const rows = await db
        .select({ email: pgUsers.email, name: pgUsers.name })
        .from(pgUsers)
        .where(eq(pgUsers.id, session.userId))
        .limit(1);
      user = rows[0];
    } finally {
      await end();
    }
    if (!user?.email) return null;

    const role = mapSessionRole(session.role);
    return {
      authenticated: true,
      email: user.email.trim().toLowerCase(),
      displayName: user.name || user.email,
      role,
      countryCode: null,
      permissions: permissionsForSessionRole(session.role),
    };
  } catch {
    return null;
  }
}

export function hasSponsorPermission(identity: SponsorIdentity, permission: string): boolean {
  return identity.permissions.includes(permission) || identity.permissions.includes("*");
}

export function requireAuthenticatedEmail(identity: SponsorIdentity): string {
  if (!identity.authenticated || !identity.email) {
    throw new Error("AUTH_REQUIRED");
  }
  return identity.email;
}

export function canManageCountry(identity: SponsorIdentity, countryCode: string): boolean {
  if (identity.role === "super_admin" || identity.role === "sponsor_admin" || identity.role === "ad_manager") return true;
  return identity.countryCode?.toLowerCase() === countryCode.toLowerCase();
}
