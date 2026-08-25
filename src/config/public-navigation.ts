import type { Translation, TranslationStringKey } from "@/src/types/site";
import { BriefcaseBusiness, Building2, Hammer, Home, Info, LibraryBig, Megaphone, MessagesSquare, Phone, Wrench, type LucideIcon } from "lucide-react";
import { PUBLIC_ROUTE_AD_POLICIES, type PublicAdPolicy } from "@/src/config/public-ad-policy";

export type PrimaryPublicNavId =
  | "home"
  | "properties"
  | "engineering-tools"
  | "services-market"
  | "real-estate-companies"
  | "other-companies"
  | "community"
  | "knowledge"
  | "advertise"
  | "about"
  | "contact";

export type PublicNavAdPolicy = PublicAdPolicy;

export type PublicNavItem = {
  key: PrimaryPublicNavId;
  labelKey: TranslationStringKey;
  href: string;
  icon: LucideIcon;
  pageFamily: string;
  componentPath: string;
  adPolicy: PublicNavAdPolicy;
  activeWhen: (currentPath: string) => boolean;
};

export const PUBLIC_NAV_CONSTITUTION_IDS: PrimaryPublicNavId[] = [
  "home",
  "properties",
  "engineering-tools",
  "services-market",
  "real-estate-companies",
  "other-companies",
  "community",
  "knowledge",
  "advertise",
  "about",
  "contact",
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

export const PUBLIC_NAV: PublicNavItem[] = [
  {
    key: "home",
    labelKey: "navHome",
    href: "/",
    icon: Home,
    pageFamily: "home",
    componentPath: "app/page.tsx",
    adPolicy: PUBLIC_ROUTE_AD_POLICIES["/"],
    activeWhen: (currentPath) => hasPathPrefix("/", currentPath),
  },
  {
    key: "properties",
    labelKey: "navProperties",
    href: "/properties",
    icon: Building2,
    pageFamily: "properties",
    componentPath: "app/properties/page.tsx",
    adPolicy: PUBLIC_ROUTE_AD_POLICIES["/properties"],
    activeWhen: (currentPath) => hasPathPrefix("/properties", currentPath),
  },
  {
    key: "engineering-tools",
    labelKey: "navEngineeringTools",
    href: "/tools",
    icon: Wrench,
    pageFamily: "engineering-tools",
    componentPath: "app/tools/page.tsx",
    adPolicy: PUBLIC_ROUTE_AD_POLICIES["/tools"],
    activeWhen: (currentPath) => hasPathPrefix("/tools", currentPath),
  },
  {
    key: "services-market",
    labelKey: "navServices",
    href: "/services",
    icon: Hammer,
    pageFamily: "services",
    componentPath: "app/services/page.tsx",
    adPolicy: PUBLIC_ROUTE_AD_POLICIES["/services"],
    activeWhen: (currentPath) => {
      const { pathname } = splitCurrentPath(currentPath);
      return pathname === "/services" || pathname.startsWith("/services/") || pathname.startsWith("/service-requests") || pathname.startsWith("/providers/") || pathname === "/providers/apply";
    },
  },
  {
    key: "real-estate-companies",
    labelKey: "navRealEstateCompanies",
    href: "/offices",
    icon: Building2,
    pageFamily: "real-estate-companies",
    componentPath: "app/offices/page.tsx",
    adPolicy: PUBLIC_ROUTE_AD_POLICIES["/offices"],
    activeWhen: (currentPath) => hasPathPrefix("/offices", currentPath),
  },
  {
    key: "other-companies",
    labelKey: "navOtherCompanies",
    href: "/companies",
    icon: BriefcaseBusiness,
    pageFamily: "other-companies",
    componentPath: "app/companies/page.tsx",
    adPolicy: PUBLIC_ROUTE_AD_POLICIES["/companies"],
    activeWhen: (currentPath) => hasPathPrefix("/companies", currentPath),
  },
  {
    key: "community",
    labelKey: "navCommunity",
    href: "/community",
    icon: MessagesSquare,
    pageFamily: "community",
    componentPath: "app/community/page.tsx",
    adPolicy: PUBLIC_ROUTE_AD_POLICIES["/community"],
    activeWhen: (currentPath) => hasPathPrefix("/community", currentPath),
  },
  {
    key: "knowledge",
    labelKey: "navKnowledge",
    href: "/knowledge",
    icon: LibraryBig,
    pageFamily: "knowledge",
    componentPath: "app/knowledge/page.tsx",
    adPolicy: PUBLIC_ROUTE_AD_POLICIES["/knowledge"],
    activeWhen: (currentPath) => hasPathPrefix("/knowledge", currentPath),
  },
  {
    key: "advertise",
    labelKey: "navAdvertise",
    href: "/advertise",
    icon: Megaphone,
    pageFamily: "advertise",
    componentPath: "app/advertise/page.tsx",
    adPolicy: PUBLIC_ROUTE_AD_POLICIES["/advertise"],
    activeWhen: (currentPath) => hasPathPrefix("/advertise", currentPath),
  },
  {
    key: "about",
    labelKey: "navAbout",
    href: "/about",
    icon: Info,
    pageFamily: "about",
    componentPath: "app/about/page.tsx",
    adPolicy: PUBLIC_ROUTE_AD_POLICIES["/about"],
    activeWhen: (currentPath) => hasPathPrefix("/about", currentPath),
  },
  {
    key: "contact",
    labelKey: "navContact",
    href: "/contact",
    icon: Phone,
    pageFamily: "contact",
    componentPath: "app/contact/page.tsx",
    adPolicy: PUBLIC_ROUTE_AD_POLICIES["/contact"],
    activeWhen: (currentPath) => hasPathPrefix("/contact", currentPath),
  },
];

export const SEARCH_ROUTE: string | undefined = undefined;

export function getPublicNav(): PublicNavItem[] {
  return PUBLIC_NAV;
}

export function isNavPathActive(href: string, pathname: string): boolean {
  return hasPathPrefix(normalizeHrefPath(href), pathname);
}

export function isNavItemActive(item: PublicNavItem, currentPath: string): boolean {
  return item.activeWhen(currentPath);
}

export function shouldUsePublicSidebar(currentPath: string): boolean {
  const { pathname } = splitCurrentPath(currentPath);
  return !(pathname === "/dashboard" || pathname.startsWith("/dashboard/"));
}

export function shouldShowHeaderPublicNavigation(currentPath: string): boolean {
  const { pathname } = splitCurrentPath(currentPath);
  return pathname !== "/dashboard" && !pathname.startsWith("/dashboard/");
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
