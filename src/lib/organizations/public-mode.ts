export type OrganizationPublicMode = "offices" | "companies";

export function matchesOrganizationPublicMode(mode: OrganizationPublicMode, type: string): boolean {
  if (mode === "offices") return type === "real_estate";
  return type === "law_office" || type === "business" || type === "other";
}
