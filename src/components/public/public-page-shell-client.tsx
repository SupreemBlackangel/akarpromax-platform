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
  /**
   * Starts the page with the navigation rail collapsed without overwriting the
   * visitor's stored preference. Used by full-width tool surfaces.
   */
  defaultSidebarCollapsed?: boolean;
  children: ReactNode;
};

export default function PublicPageShellClient({
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
  defaultSidebarCollapsed = false,
  children,
}: PublicPageShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cookieVisible, setCookieVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Browser storage can only be read after mount, and SSR must not diverge
  // from the first client render. The reads are deferred to a microtask so the
  // effect body itself does not set state and trigger a cascading render.
  useEffect(() => {
    let cancelled = false;

    const readStoredPreferences = () => {
      if (cancelled) return;

      let nextCookieVisible = false;
      if (cookieNotice) {
        try {
          const stored = window.localStorage.getItem(COOKIE_STORAGE_KEY);
          nextCookieVisible = stored !== "accepted" && stored !== "rejected" && stored !== "managed";
        } catch {
          nextCookieVisible = false;
        }
      }
      setCookieVisible(nextCookieVisible);

      let nextSidebarCollapsed = defaultSidebarCollapsed;
      try {
        nextSidebarCollapsed =
          defaultSidebarCollapsed || window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
      } catch {
        nextSidebarCollapsed = defaultSidebarCollapsed;
      }
      setSidebarCollapsed(nextSidebarCollapsed);
    };

    queueMicrotask(readStoredPreferences);

    return () => {
      cancelled = true;
    };
  }, [cookieNotice, defaultSidebarCollapsed]);

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
