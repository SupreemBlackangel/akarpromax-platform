import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getRuntimeDb } from "@/lib/runtime-db";

export type SponsorRole =
  | "guest"
  | "viewer"
  | "analyst"
  | "content_editor"
  | "country_manager"
  | "sponsor_admin"
  | "super_admin";

export type SponsorIdentity = {
  authenticated: boolean;
  email: string | null;
  displayName: string;
  role: SponsorRole;
  countryCode: string | null;
  permissions: string[];
};

const permissionsByRole: Record<SponsorRole, string[]> = {
  guest: [],
  viewer: [],
  analyst: ["sponsors:read", "analytics:read"],
  content_editor: ["sponsors:read", "sponsors:edit"],
  country_manager: ["sponsors:read", "sponsors:edit", "sponsors:publish", "analytics:read"],
  sponsor_admin: ["sponsors:read", "sponsors:edit", "sponsors:publish", "analytics:read", "access:read"],
  super_admin: ["sponsors:read", "sponsors:edit", "sponsors:publish", "analytics:read", "access:read", "access:write"],
};

type AccessRow = {
  email: string;
  display_name: string | null;
  role: SponsorRole;
  country_code: string | null;
  status: string;
};

export async function getSponsorIdentity(): Promise<SponsorIdentity> {
  const user = await getChatGPTUser();
  if (!user) {
    return {
      authenticated: false,
      email: null,
      displayName: "Guest",
      role: "guest",
      countryCode: null,
      permissions: [],
    };
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

  const role = access?.status === "active" ? access.role : "viewer";
  return {
    authenticated: true,
    email,
    displayName: access?.display_name || user.displayName,
    role,
    countryCode: access?.country_code ?? null,
    permissions: permissionsByRole[role] ?? [],
  };
}

export function hasSponsorPermission(identity: SponsorIdentity, permission: string): boolean {
  return identity.permissions.includes(permission);
}

export function canManageCountry(identity: SponsorIdentity, countryCode: string): boolean {
  if (identity.role === "super_admin" || identity.role === "sponsor_admin") return true;
  return identity.countryCode?.toLowerCase() === countryCode.toLowerCase();
}
