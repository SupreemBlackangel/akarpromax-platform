import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { users as pgUsers } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { mapSessionRole, permissionsForSessionRole } from "@/lib/auth/identity-map";
import type { SponsorRole } from "@/src/constants/roles";
import { augmentPermissionsForServiceProviderCapability } from "@/lib/services/identity";

export type { SponsorRole } from "@/src/constants/roles";

/**
 * Canonical session identity. `SponsorRole` (in `src/constants/roles`) is the
 * role id vocabulary; its `sponsor_admin`/`sponsor_manager` members are
 * deprecated storage-compat values kept for already-persisted rows.
 */
export type UserIdentity = {
  authenticated: boolean;
  email: string | null;
  displayName: string;
  role: SponsorRole;
  countryCode: string | null;
  permissions: string[];
};

export const GUEST_IDENTITY: UserIdentity = {
  authenticated: false,
  email: null,
  displayName: "Guest",
  role: "guest",
  countryCode: null,
  permissions: [],
};

type SessionIdentityResolver = () => Promise<UserIdentity | null>;
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
export async function getSessionIdentity(): Promise<UserIdentity> {
  if (identityResolverOverride) {
    const identity = await identityResolverOverride();
    if (identity) return identity;
  }
  const sessionIdentity = await identityFromSession();
  return sessionIdentity ?? GUEST_IDENTITY;
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

async function identityFromSession(): Promise<UserIdentity | null> {
  let session;
  try {
    session = await getSession();
  } catch {
    return null;
  }
  if (!session?.userId) return null;

  try {
    const { db, end } = getDb();
    let user: { email: string | null; name: string | null; role: string | null } | undefined;
    try {
      const rows = await db
        .select({ email: pgUsers.email, name: pgUsers.name, role: pgUsers.role })
        .from(pgUsers)
        .where(eq(pgUsers.id, session.userId))
        .limit(1);
      user = rows[0];
    } finally {
      await end();
    }
    if (!user?.email) return null;

    /*
     * The role comes from the ROW, not from the cookie.
     *
     * It used to come from `session.role` — stamped into the session when the
     * person signed in and never looked at again. So promoting somebody to
     * super_admin did nothing until they happened to log out: they were an
     * administrator in the database, carrying a token that said otherwise, and
     * the console told them they had no permission. Nothing anywhere said the
     * cure was to sign out and back in.
     *
     * The row is already being read, three lines up, for the email and the
     * name. Reading the role from it costs nothing and means a role change
     * takes effect on the next request. The session's own role remains the
     * fallback for a row that somehow carries none.
     */
    const storedRole = (user.role ?? "").trim();
    const effectiveRole = storedRole || session.role;
    const role = mapSessionRole(effectiveRole);
    const permissions = await augmentPermissionsForServiceProviderCapability(
      user.email.trim().toLowerCase(),
      permissionsForSessionRole(effectiveRole),
    );
    return {
      authenticated: true,
      email: user.email.trim().toLowerCase(),
      displayName: user.name || user.email,
      role,
      countryCode: null,
      permissions,
    };
  } catch {
    return null;
  }
}

export function hasPermission(identity: UserIdentity, permission: string): boolean {
  return identity.permissions.includes(permission) || identity.permissions.includes("*");
}

export function requireAuthenticatedEmail(identity: UserIdentity): string {
  if (!identity.authenticated || !identity.email) {
    throw new Error("AUTH_REQUIRED");
  }
  return identity.email;
}

export function canManageCountry(identity: UserIdentity, countryCode: string): boolean {
  if (identity.role === "super_admin" || identity.role === "sponsor_admin" || identity.role === "ad_manager") return true;
  return identity.countryCode?.toLowerCase() === countryCode.toLowerCase();
}
