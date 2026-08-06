import { sql, eq } from "drizzle-orm";

import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { getMySqlDb } from "@/lib/mysql-db";
import { users as mysqlUsers } from "@/db/mysql/schema";
import { users as pgUsers } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { mapSessionRole, permissionsForSessionRole } from "@/lib/auth/identity-map";
import { ROLE_CATALOG, type SponsorRole } from "@/src/constants/roles";

export type { SponsorRole } from "@/src/constants/roles";

export type SponsorIdentity = {
  authenticated: boolean;
  email: string | null;
  displayName: string;
  role: SponsorRole;
  countryCode: string | null;
  permissions: string[];
};

const permissionsByRole: Record<SponsorRole, string[]> = Object.fromEntries(
  (Object.keys(ROLE_CATALOG) as SponsorRole[]).map((role) => [
    role,
    role === "super_admin" ? [...ROLE_CATALOG[role].permissions, "*"] : ROLE_CATALOG[role].permissions,
  ]),
) as Record<SponsorRole, string[]>;

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
 * AkarProMax Identity (session-only) for the services module.
 * Resolves strictly from the HttpOnly `akar_session` cookie and never
 * consults external LLM identity headers, Bearer tokens, or the legacy
 * auto-admin bypass (which remains confined to `getSponsorIdentity`
 * for the sponsor module). Returns GUEST_IDENTITY when there is no
 * valid session.
 */
export async function getSessionIdentity(): Promise<SponsorIdentity> {
  if (identityResolverOverride) {
    const identity = await identityResolverOverride();
    if (identity) return identity;
  }
  const sessionIdentity = await identityFromSession();
  return sessionIdentity ?? GUEST_IDENTITY;
}

type AccessRow = {
  email: string;
  display_name: string | null;
  role: SponsorRole;
  country_code: string | null;
  status: string;
};

export async function getSponsorIdentity(): Promise<SponsorIdentity> {
  const sessionIdentity = await identityFromSession();
  if (sessionIdentity) return sessionIdentity;

  const user = await getChatGPTUser();
  if (!user) {
    return GUEST_IDENTITY;
  }

  const email = user.email.trim().toLowerCase();
  const db = await getRuntimeDb();
  let access = await db.prepare(
    `SELECT email, display_name, role, country_code, status
     FROM sponsor_access
     WHERE lower(email) = ?1
     LIMIT 1`,
  )
    .bind(email)
    .first<AccessRow>();

  if (!access) {
    const countRow = await db.prepare(
      "SELECT COUNT(*) AS total FROM sponsor_access WHERE status = 'active'",
    ).first<{ total: number }>();

    if (Number(countRow?.total ?? 0) === 0) {
      await db.prepare(
        `INSERT OR IGNORE INTO sponsor_access
          (id, email, display_name, role, country_code, status)
         VALUES (?1, ?2, ?3, 'super_admin', NULL, 'active')`,
      )
        .bind(crypto.randomUUID(), email, user.displayName)
        .run();

      access = await db.prepare(
        `SELECT email, display_name, role, country_code, status
         FROM sponsor_access
         WHERE lower(email) = ?1
         LIMIT 1`,
      )
        .bind(email)
        .first<AccessRow>();
    }
  }

  let role: SponsorRole = access?.status === "active" ? access.role : "viewer";

  if (role === "viewer") {
    try {
      const mysqlUser = await getMySqlDb()
        .select({ roleId: mysqlUsers.roleId })
        .from(mysqlUsers)
        .where(sql`lower(${mysqlUsers.email}) = ${email}`)
        .limit(1);
      if (mysqlUser[0]?.roleId === "admin") role = "super_admin";
    } catch {
      // MySQL unreachable: keep sponsor_access-based role.
    }
  }

  return {
    authenticated: true,
    email,
    displayName: access?.display_name || user.displayName,
    role,
    countryCode: access?.country_code ?? null,
    permissions: permissionsByRole[role] ?? [],
  };
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
