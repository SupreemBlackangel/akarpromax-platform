"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import type { Locale, ViewerContext } from "@/src/types/site";
import type { Translation } from "@/src/types/site";
import type { DeviceType } from "@/src/constants/advertising";
import type { BreadcrumbItem } from "@/src/config/public-navigation";
import type { StandardPublicAdLayoutKey } from "@/src/config/standard-public-ad-layout";
import PublicPageShellImpl from "@/src/components/public/public-page-shell";

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

/**
 * Canonical public shell entry point. Import path unchanged for ~20 pages;
 * implementation lives in src/components/public/*.
 */
type Props = {
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

function subscribeToLocation(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  window.addEventListener("hashchange", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("hashchange", callback);
  };
}

function getLocationSnapshot(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

const EMPTY_SERVER_PATH = "";

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
  currentPath: explicitPath,
  adLayout,
  children,
}: Props) {
  const [path] = useSyncExternalStore(subscribeToLocation, getLocationSnapshot, () => EMPTY_SERVER_PATH);

  const resolvedPath = explicitPath ?? path;

  return (
    <PublicPageShellImpl
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      deviceType={deviceType}
      onLogin={onLogin}
      onLogout={onLogout}
      breadcrumbs={breadcrumbs}
      pageHeader={pageHeader}
      officePromotion={officePromotion}
      adLayout={adLayout}
      cookieNotice={cookieNotice}
      currentPath={resolvedPath}
    >
      {children}
    </PublicPageShellImpl>
  );
}
