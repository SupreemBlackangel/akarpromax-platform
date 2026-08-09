import { hasSponsorPermission, type SponsorIdentity } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";

export function canAccessAmrsAdmin(identity: SponsorIdentity): boolean {
  if (!identity.authenticated || !identity.email) return false;
  return (
    hasSponsorPermission(identity, PERMISSIONS.ADMIN_DASHBOARD_VIEW) ||
    hasSponsorPermission(identity, PERMISSIONS.USERS_UPDATE) ||
    (hasSponsorPermission(identity, PERMISSIONS.USERS_VIEW) && hasSponsorPermission(identity, PERMISSIONS.SPONSORS_APPROVE))
  );
}
