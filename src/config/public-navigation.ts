import type { Translation, TranslationStringKey, ViewerContext } from "@/src/types/site";
import { BriefcaseBusiness, Building, Building2, ClipboardList, Home, LayoutDashboard, MapPinned, Newspaper, Search, UserRound, UsersRound, Wrench, type LucideIcon } from "lucide-react";
import { PERMISSIONS } from "@/src/constants/permissions";

/**
 * Single source of truth for public navigation (desktop sidebar, desktop header,
 * mobile drawer, and breadcrumbs). Only real routes or validated in-page anchors
 * may be listed here.
 */
export type PublicNavSection = "main" | "discover" | "my";

export type PublicNavItem = {
  key: string;
  labelKey: TranslationStringKey;
  href: string;
  icon: LucideIcon;
  section: PublicNavSection;
  activeWhen?: (currentPath: string) => boolean;
  visible?: (viewer: ViewerContext) => boolean;
};

export const PUBLIC_NAV_SECTIONS: Array<{ key: PublicNavSection; labelKey: TranslationStringKey }> = [
  { key: "main", labelKey: "navSectionMain" },
  { key: "discover", labelKey: "navSectionDiscover" },
  { key: "my", labelKey: "navSectionMy" },
];

function splitCurrentPath(currentPath: string): { pathname: string; search: URLSearchParams; hash: string } {
  const [beforeHash, rawHash = ""] = (currentPath || "/").split("#", 2);
  const [rawPathname, rawSearch = ""] = beforeHash.split("?", 2);
  const pathname = rawPathname || "/";
  return { pathname, search: new URLSearchParams(rawSearch), hash: rawHash ? `#${rawHash}` : "" };
}

function normalizeHrefPath(href: string): string {
  const [beforeHash] = href.split("#", 2);
  const [pathname] = beforeHash.split("?", 2);
  return pathname || "/";
}

function hasPathPrefix(target: string, currentPath: string): boolean {
  const { pathname } = splitCurrentPath(currentPath);
  if (target === "/") return pathname === "/" || pathname === "";
  return pathname === target || pathname.startsWith(`${target}/`);
}

function isFindMyLandPath(currentPath: string): boolean {
  const { pathname, search } = splitCurrentPath(currentPath);
  return pathname === "/tools" && search.get("tool") === "findmyland";
}

function isAuthenticated(viewer: ViewerContext): boolean {
  return Boolean(viewer.authenticated);
}

function canOpenProviderWorkspace(viewer: ViewerContext): boolean {
  return Boolean(
    viewer.authenticated && (
      viewer.role === "service_provider" ||
      viewer.permissions.includes(PERMISSIONS.SERVICE_PROVIDERS_APPLY) ||
      viewer.permissions.includes(PERMISSIONS.SERVICE_PROVIDERS_MANAGE) ||
      viewer.permissions.includes(PERMISSIONS.SERVICE_OFFERS_MANAGE_OWN) ||
      viewer.permissions.includes(PERMISSIONS.SERVICE_JOBS_MANAGE_OWN)
    ),
  );
}

export const PUBLIC_NAV: PublicNavItem[] = [
  { key: "home", labelKey: "navHome", href: "/", icon: Home, section: "main" },
  {
    key: "properties",
    labelKey: "navProperties",
    href: "/#properties",
    icon: Building2,
    section: "main",
    activeWhen: (currentPath) => hasPathPrefix("/properties", currentPath) || splitCurrentPath(currentPath).hash === "#properties",
  },
  { key: "services", labelKey: "navServices", href: "/services", icon: BriefcaseBusiness, section: "main" },
  { key: "directory", labelKey: "navDirectory", href: "/directory", icon: Search, section: "main" },
  { key: "organizations", labelKey: "navOrganizations", href: "/organizations", icon: Building, section: "discover" },
  { key: "providers", labelKey: "navProviders", href: "/providers", icon: UsersRound, section: "discover" },
  {
    key: "findmyland",
    labelKey: "navFindMyLand",
    href: "/tools?tool=findmyland",
    icon: MapPinned,
    section: "discover",
    activeWhen: (currentPath) => isFindMyLandPath(currentPath),
  },
  {
    key: "tools",
    labelKey: "navTools",
    href: "/tools",
    icon: Wrench,
    section: "discover",
    activeWhen: (currentPath) => hasPathPrefix("/tools", currentPath) && !isFindMyLandPath(currentPath),
  },
  { key: "news", labelKey: "navNews", href: "/news", icon: Newspaper, section: "discover" },
  {
    key: "workspace",
    labelKey: "navWorkspace",
    href: "/dashboard/services",
    icon: LayoutDashboard,
    section: "my",
    visible: isAuthenticated,
  },
  {
    key: "my-requests",
    labelKey: "navMyRequests",
    href: "/dashboard/services/my-requests",
    icon: ClipboardList,
    section: "my",
    visible: isAuthenticated,
  },
  {
    key: "account",
    labelKey: "navAccount",
    href: "/account/security",
    icon: UserRound,
    section: "my",
    visible: isAuthenticated,
  },
  {
    key: "provider-profile",
    labelKey: "navApply",
    href: "/dashboard/services/provider-profile",
    icon: BriefcaseBusiness,
    section: "my",
    visible: canOpenProviderWorkspace,
  },
];

/** Unified search entry point. Rendered by the header/mobile menu only when set (no /search page exists yet). */
export const SEARCH_ROUTE: string | undefined = undefined;

export function getPublicNav(viewer: ViewerContext): PublicNavItem[] {
  return PUBLIC_NAV.filter((item) => item.visible?.(viewer) ?? true);
}

export function groupPublicNav(items: PublicNavItem[]): Array<{ key: PublicNavSection; labelKey: TranslationStringKey; items: PublicNavItem[] }> {
  return PUBLIC_NAV_SECTIONS.map((section) => ({
    ...section,
    items: items.filter((item) => item.section === section.key),
  })).filter((section) => section.items.length > 0);
}

export function isNavPathActive(href: string, pathname: string): boolean {
  return hasPathPrefix(normalizeHrefPath(href), pathname);
}

export function isNavItemActive(item: PublicNavItem, currentPath: string): boolean {
  return item.activeWhen ? item.activeWhen(currentPath) : isNavPathActive(item.href, currentPath);
}

export function shouldUsePublicSidebar(currentPath: string): boolean {
  const { pathname } = splitCurrentPath(currentPath);
  return !(pathname === "/dashboard" || pathname.startsWith("/dashboard/"));
}

export type BreadcrumbItem = {
  label: string;
  href?: string;
  current?: boolean;
};

export function buildBreadcrumbs(pathname: string, copy: Translation, homeLabel = copy.navHome): BreadcrumbItem[] {
  const cleaned = splitCurrentPath(pathname).pathname;
  if (cleaned === "/" || cleaned === "") return [];
  const segments = cleaned.split("/").filter(Boolean);
  const crumbs: BreadcrumbItem[] = [{ label: homeLabel, href: "/" }];
  let acc = "";
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment) continue;
    acc += `/${segment}`;
    const matched = PUBLIC_NAV.find((item) => normalizeHrefPath(item.href) === acc);
    const label = matched ? copy[matched.labelKey] : decodeURIComponent(segment);
    const isLast = index === segments.length - 1;
    crumbs.push(isLast ? { label, current: true } : { label, href: acc });
  }
  return crumbs;
}
