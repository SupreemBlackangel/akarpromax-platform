import type { SponsorRole } from "@/src/constants/roles";
import { PERMISSIONS } from "@/src/constants/permissions";

export type AccountStatus =
  | "pending_verification"
  | "active"
  | "disabled"
  | "suspended"
  | "deleted";

export const ACCOUNT_ACTIVE_STATUSES: AccountStatus[] = ["active"];
export const ACCOUNT_BLOCKED_STATUSES: AccountStatus[] = ["pending_verification", "disabled", "suspended", "deleted"];

export type AccountBlockReason =
  | "not_verified"
  | "account_disabled"
  | "account_suspended"
  | "account_deleted"
  | "inactive";

export const ACCOUNT_BLOCK_REASONS: Record<AccountStatus, AccountBlockReason | null> = {
  pending_verification: "not_verified",
  active: null,
  disabled: "account_disabled",
  suspended: "account_suspended",
  deleted: "account_deleted",
};

export function isAccountUsable(status: string, isActive: boolean): boolean {
  if (isActive === false) return false;
  return ACCOUNT_ACTIVE_STATUSES.includes(status as AccountStatus);
}

export function accountBlockReason(status: string, isActive: boolean): AccountBlockReason | null {
  if (!isActive) return "inactive";
  return ACCOUNT_BLOCK_REASONS[status as AccountStatus] ?? null;
}

const BANNED_SELF_ASSIGN_ROLES = new Set<SponsorRole>([
  "service_supervisor",
  "country_manager",
  "ad_manager",
  "ads_reviewer",
  "sponsor_admin",
  "sponsor_manager",
  "super_admin",
]);

export function isBannedSelfAssignmentRole(role: string): boolean {
  return BANNED_SELF_ASSIGN_ROLES.has(role as SponsorRole);
}

/**
 * Registration must never honor a client-supplied role. The DB role column is
 * always seeded to "user" (mapped to the SponsorRole "viewer" at the identity
 * layer). This guard is the single source of truth for that invariant and is
 * unit-tested independently of the route handlers.
 */
export function sanitizeRegistrationRole(_requestedRole?: string): "user" {
  return "user";
}

export type AdminIdentity = {
  authenticated: boolean;
  role: string;
  permissions: string[];
};

export function canAccessAdminArea(identity: AdminIdentity): boolean {
  if (!identity.authenticated) return false;
  if (identity.role === "super_admin") return true;
  if (identity.permissions.includes("*")) return true;
  return identity.permissions.includes(PERMISSIONS.ADMIN_DASHBOARD_VIEW);
}

export function normalizePasswordPolicy() {
  return {
    minLength: 8,
    maxLength: 128,
  };
}

export function validatePassword(plain: string): { valid: boolean; error?: string } {
  const { minLength, maxLength } = normalizePasswordPolicy();
  if (typeof plain !== "string" || plain.length < minLength) {
    return { valid: false, error: `password must be at least ${minLength} characters` };
  }
  if (plain.length > maxLength) {
    return { valid: false, error: `password must be at most ${maxLength} characters` };
  }
  return { valid: true };
}
