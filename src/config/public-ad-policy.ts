import type { StandardPublicAdLayoutKey } from "@/src/config/standard-public-ad-registry";

export type PublicAdPolicy =
  | { mode: "safe-no-ads" }
  | { mode: "standard"; family: StandardPublicAdLayoutKey };

export type StandardPublicRoute =
  | "/"
  | "/properties"
  | "/tools"
  | "/services"
  | "/offices"
  | "/companies"
  | "/community"
  | "/knowledge"
  | "/advertise"
  | "/about"
  | "/contact";

/**
 * Product-governed ad policy for top-level public routes.
 * Keep this decision in one place so navigation and destination content cannot drift.
 */
export const PUBLIC_ROUTE_AD_POLICIES = {
  "/": { mode: "standard", family: "home" },
  "/properties": { mode: "standard", family: "properties" },
  "/tools": { mode: "standard", family: "tools" },
  "/services": { mode: "standard", family: "services" },
  "/offices": { mode: "standard", family: "offices" },
  "/companies": { mode: "standard", family: "companies" },
  "/community": { mode: "standard", family: "community" },
  "/knowledge": { mode: "standard", family: "knowledge" },
  "/advertise": { mode: "standard", family: "advertise" },
  "/about": { mode: "standard", family: "about" },
  "/contact": { mode: "standard", family: "contact" },
} as const satisfies Record<StandardPublicRoute, PublicAdPolicy>;
