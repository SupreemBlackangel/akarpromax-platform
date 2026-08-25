import { hasPermission, type UserIdentity } from "@/lib/identity-auth";
import { PERMISSIONS } from "@/src/constants/permissions";

export function canAccessAmrsAdmin(identity: UserIdentity): boolean {
  if (!identity.authenticated || !identity.email) return false;
  return (
    hasPermission(identity, PERMISSIONS.ADMIN_DASHBOARD_VIEW) ||
    hasPermission(identity, PERMISSIONS.USERS_UPDATE) ||
    (hasPermission(identity, PERMISSIONS.USERS_VIEW) && hasPermission(identity, PERMISSIONS.ADVERTISERS_APPROVE))
  );
}
