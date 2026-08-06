import type { Translation, TranslationStringKey } from "@/src/types/site";
import { Home, LayoutGrid, Store, ClipboardList, Wrench, Briefcase, type LucideIcon } from "lucide-react";

/**
 * Single source of truth for public navigation (desktop + mobile + breadcrumbs).
 * Only routes that actually exist may be listed (see docs/verification/PHASE_2_BASELINE.md).
 */
export type PublicNavItem = {
  key: string;
  labelKey: TranslationStringKey;
  href: string;
  icon?: LucideIcon;
  children?: PublicNavItem[];
  requiredFeature?: string;
  external?: boolean;
  badge?: boolean;
};

export const PUBLIC_NAV: PublicNavItem[] = [
  { key: "home", labelKey: "navHome", href: "/", icon: Home },
  { key: "services", labelKey: "navServices", href: "/services", icon: Store },
  { key: "catalog", labelKey: "navCatalog", href: "/services/catalog", icon: LayoutGrid },
  { key: "requests", labelKey: "navRequests", href: "/service-requests", icon: ClipboardList },
  { key: "tools", labelKey: "navTools", href: "/tools", icon: Wrench },
  { key: "apply", labelKey: "navApply", href: "/providers/apply", icon: Briefcase },
];

/** Unified search entry point. Rendered by the header/mobile menu only when set (no /search page exists yet). */
export const SEARCH_ROUTE: string | undefined = undefined;

export function isNavPathActive(href: string, pathname: string): boolean {
  const cleaned = pathname.split("?")[0] ?? "";
  if (href === "/") return cleaned === "/" || cleaned === "";
  return cleaned === href || cleaned.startsWith(`${href}/`);
}

export type BreadcrumbItem = {
  label: string;
  href?: string;
  current?: boolean;
};

export function buildBreadcrumbs(pathname: string, copy: Translation, homeLabel = copy.navHome): BreadcrumbItem[] {
  const cleaned = pathname.split("?")[0] ?? "";
  if (cleaned === "/" || cleaned === "") return [];
  const segments = cleaned.split("/").filter(Boolean);
  const crumbs: BreadcrumbItem[] = [{ label: homeLabel, href: "/" }];
  let acc = "";
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment) continue;
    acc += `/${segment}`;
    const matched = PUBLIC_NAV.find((item) => item.href === acc);
    const label = matched ? copy[matched.labelKey] : decodeURIComponent(segment);
    const isLast = index === segments.length - 1;
    crumbs.push(isLast ? { label, current: true } : { label, href: acc });
  }
  return crumbs;
}
