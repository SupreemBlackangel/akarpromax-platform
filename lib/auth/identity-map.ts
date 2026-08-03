import { ROLE_CATALOG, type SponsorRole } from "@/src/constants/roles";

const SESSION_ROLE_TO_SPONSOR: Record<string, SponsorRole> = {
  super_admin: "super_admin",
  user: "viewer",
};

export function mapSessionRole(role: string): SponsorRole {
  const mapped = SESSION_ROLE_TO_SPONSOR[role];
  if (mapped) return mapped;
  return (role as SponsorRole) in ROLE_CATALOG ? (role as SponsorRole) : "viewer";
}

export function permissionsForSessionRole(role: string): string[] {
  const sponsorRole = mapSessionRole(role);
  return ROLE_CATALOG[sponsorRole]?.permissions ?? [];
}
