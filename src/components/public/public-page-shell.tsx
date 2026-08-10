"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Locale, ViewerContext } from "@/src/types/site";
import type { Translation } from "@/src/types/site";
import type { DeviceType } from "@/src/constants/advertising";
import { SEARCH_ROUTE, getPublicNav, type BreadcrumbItem } from "@/src/config/public-navigation";
import type { StandardPublicAdLayoutKey } from "@/src/config/standard-public-ad-layout";
import { PublicShellLayout } from "@/src/components/public/public-shell-layout";

const COOKIE_STORAGE_KEY = "akarpromax-cookie-consent";
const SIDEBAR_STORAGE_KEY = "akarpromax-sidebar-collapsed";

type PageHeaderNode = {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
};

type OfficePromotion = {
  cta: string;
  description: string;
  href?: string;
  onCta?: () => void;
};

type PublicAdLayout =
  | { mode: "safe-no-ads" }
  | {
      mode: "standard";
      family: StandardPublicAdLayoutKey;
      entityType?: string;
      entityId?: string | number;
      categoryId?: string | number;
      tags?: string[];
    };

type PublicPageShellProps = {
  locale: Locale;
  copy: Translation;
  viewer: ViewerContext;
  country: string;
  city: string;
  deviceType?: DeviceType;
  onLogin: () => void;
  onLogout: () => void;
  breadcrumbs?: BreadcrumbItem[];
  pageHeader?: PageHeaderNode;
  officePromotion?: OfficePromotion;
  cookieNotice?: boolean;
  currentPath?: string;
  adLayout?: PublicAdLayout;
  children: ReactNode;
};

export default function PublicPageShell({
  locale,
  copy,
  viewer,
  country,
  city,
  deviceType = "desktop",
  onLogin,
  onLogout,
  breadcrumbs,
  pageHeader,
  officePromotion,
  cookieNotice = false,
  currentPath = "/",
  adLayout,
  children,
}: PublicPageShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cookieVisible, setCookieVisible] = useState(() => {
    if (!cookieNotice || typeof window === "undefined") return false;
    try {
      const stored = window.localStorage.getItem(COOKIE_STORAGE_KEY);
      return stored !== "accepted" && stored !== "rejected" && stored !== "managed";
    } catch { return false; }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true"; } catch { return false; }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const persistCookieChoice = (choice: "accepted" | "rejected" | "managed") => {
    try { window.localStorage.setItem(COOKIE_STORAGE_KEY, choice); } catch { /* ignore */ }
    setCookieVisible(false);
  };

  return (
    <PublicShellLayout
      labels={copy}
      locale={locale}
      country={country}
      city={city}
      deviceType={deviceType}
      navItems={getPublicNav()}
      currentPath={currentPath}
      viewer={viewer}
      searchHref={SEARCH_ROUTE}
      onLogin={onLogin}
      onLogout={onLogout}
      mobileMenuOpen={mobileMenuOpen}
      onOpenMenu={() => setMobileMenuOpen(true)}
      onCloseMenu={() => setMobileMenuOpen(false)}
      breadcrumbs={breadcrumbs}
      pageHeader={pageHeader}
      officePromotion={officePromotion}
      adLayout={adLayout}
      cookieNoticeVisible={cookieVisible}
      onCookieAccept={() => persistCookieChoice("accepted")}
      onCookieReject={() => persistCookieChoice("rejected")}
      onCookieManage={() => persistCookieChoice("managed")}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={toggleSidebar}
    >
      {children}
    </PublicShellLayout>
  );
}
