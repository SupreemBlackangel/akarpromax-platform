import { ROLE_CATALOG, type SponsorRole } from "@/src/constants/roles";

const SESSION_ROLE_TO_SPONSOR: Record<string, SponsorRole> = {
  super_admin: "super_admin",
  user: "viewer",
  service_provider: "service_provider",
  service_supervisor: "service_supervisor",
};

export function mapSessionRole(role: string): SponsorRole {
  const mapped = SESSION_ROLE_TO_SPONSOR[role];
  if (mapped) return mapped;
  return (role as SponsorRole) in ROLE_CATALOG ? (role as SponsorRole) : "viewer";
}

export function permissionsForSessionRole(role: string): string[] {
  const sponsorRole = mapSessionRole(role);
  const catalogPermissions = ROLE_CATALOG[sponsorRole]?.permissions ?? [];
  if (sponsorRole === "super_admin") return [...catalogPermissions, "*"];
  return catalogPermissions;
}
