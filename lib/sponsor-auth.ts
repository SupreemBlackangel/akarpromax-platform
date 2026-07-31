import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export type SponsorRole =
  | "guest"
  | "viewer"
  | "analyst"
  | "content_editor"
  | "country_manager"
  | "ad_manager"
  | "sponsor_admin"
  | "sponsor_manager"
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
  analyst: [PERMISSIONS.SPONSORS_VIEW, PERMISSIONS.ADS_VIEW, PERMISSIONS.ADS_ANALYTICS, PERMISSIONS.REPORTS_VIEW],
  content_editor: [PERMISSIONS.SPONSORS_VIEW, PERMISSIONS.SPONSORS_CREATE, PERMISSIONS.SPONSORS_UPDATE, PERMISSIONS.ADS_VIEW, PERMISSIONS.ADS_CREATE, PERMISSIONS.ADS_UPDATE, PERMISSIONS.MEDIA_UPLOAD],
  country_manager: [PERMISSIONS.SPONSORS_VIEW, PERMISSIONS.SPONSORS_CREATE, PERMISSIONS.SPONSORS_UPDATE, PERMISSIONS.SPONSORS_APPROVE, PERMISSIONS.ADS_VIEW, PERMISSIONS.ADS_CREATE, PERMISSIONS.ADS_UPDATE, PERMISSIONS.ADS_PUBLISH, PERMISSIONS.ADS_ANALYTICS, PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.REPORTS_VIEW],
  ad_manager: [PERMISSIONS.ADS_VIEW, PERMISSIONS.ADS_CREATE, PERMISSIONS.ADS_UPDATE, PERMISSIONS.ADS_PUBLISH, PERMISSIONS.ADS_ANALYTICS, PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.USERS_VIEW],
  sponsor_admin: [PERMISSIONS.SPONSORS_VIEW, PERMISSIONS.SPONSORS_CREATE, PERMISSIONS.SPONSORS_UPDATE, PERMISSIONS.SPONSORS_APPROVE, PERMISSIONS.ADS_VIEW, PERMISSIONS.ADS_ANALYTICS, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.USERS_VIEW],
  sponsor_manager: [PERMISSIONS.SPONSORS_VIEW, PERMISSIONS.SPONSORS_CREATE, PERMISSIONS.SPONSORS_UPDATE, PERMISSIONS.SPONSORS_APPROVE, PERMISSIONS.SPONSORS_REJECT, PERMISSIONS.SPONSORS_SUSPEND, PERMISSIONS.SPONSORS_ACTIVATE, PERMISSIONS.SPONSORS_DELETE, PERMISSIONS.SPONSOR_USERS_MANAGE, PERMISSIONS.SPONSOR_BRANCHES_MANAGE, PERMISSIONS.SPONSOR_CONTRACTS_MANAGE, PERMISSIONS.SPONSOR_SUBSCRIPTIONS_MANAGE, PERMISSIONS.SPONSOR_PAYMENTS_MANAGE, PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_UPDATE, PERMISSIONS.OFFICE_LINK, PERMISSIONS.OFFICE_UNLINK, PERMISSIONS.REPORTS_VIEW],
  super_admin: [PERMISSIONS.SPONSORS_VIEW, PERMISSIONS.SPONSORS_CREATE, PERMISSIONS.SPONSORS_UPDATE, PERMISSIONS.SPONSORS_APPROVE, PERMISSIONS.SPONSORS_REJECT, PERMISSIONS.SPONSORS_SUSPEND, PERMISSIONS.SPONSORS_ACTIVATE, PERMISSIONS.SPONSORS_DELETE, PERMISSIONS.SPONSOR_USERS_MANAGE, PERMISSIONS.SPONSOR_BRANCHES_MANAGE, PERMISSIONS.SPONSOR_CONTRACTS_MANAGE, PERMISSIONS.SPONSOR_SUBSCRIPTIONS_MANAGE, PERMISSIONS.SPONSOR_PAYMENTS_MANAGE, PERMISSIONS.ADS_VIEW, PERMISSIONS.ADS_CREATE, PERMISSIONS.ADS_UPDATE, PERMISSIONS.ADS_PUBLISH, PERMISSIONS.ADS_DELETE, PERMISSIONS.ADS_ANALYTICS, PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_DELETE, PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_MANAGE, PERMISSIONS.PROPERTIES_VIEW, PERMISSIONS.PROPERTIES_MANAGE, PERMISSIONS.OFFICE_LINK, PERMISSIONS.OFFICE_UNLINK, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.ADMIN_DASHBOARD_VIEW],
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
  if (identity.role === "super_admin" || identity.role === "sponsor_admin" || identity.role === "ad_manager") return true;
  return identity.countryCode?.toLowerCase() === countryCode.toLowerCase();
}
