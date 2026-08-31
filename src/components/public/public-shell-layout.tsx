"use client";

import { useCallback, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import type { Locale, Translation, ViewerContext } from "@/src/types/site";
import type { DeviceType } from "@/src/constants/advertising";
import { PUBLIC_BOTTOM_AD, PUBLIC_TOP_AD, type PublicAdSlotConfig } from "@/src/config/ad-placements";
import AdRequestDialog from "@/src/components/AdRequestDialog";
import PageContainer from "@/src/components/layout/PageContainer";
import Breadcrumbs from "@/src/components/ui/Breadcrumbs";
import PageHeader from "@/src/components/ui/PageHeader";
import PublicHeader from "@/src/components/public/public-header";
import PublicFooter from "@/src/components/public/public-footer";
import PublicSidebar from "@/src/components/public/public-sidebar";
import MobileNavigation from "@/src/components/public/mobile-navigation";
import OfficeAppPromotion from "@/src/components/public/office-app-promotion";
import CookieNotice from "@/src/components/public/cookie-notice";
import ToastRegion from "@/src/components/public/toast-region";
import type { StandardPublicAdLayoutKey } from "@/src/config/standard-public-ad-layout";
import StandardPublicAdLayout from "@/src/components/ads/standard-public-ad-layout";
import { shouldShowHeaderPublicNavigation, shouldUsePublicSidebar, type PublicNavItem, type BreadcrumbItem } from "@/src/config/public-navigation";
import { PERMISSIONS } from "@/src/constants/permissions";

const PwaManager = dynamic(() => import("@/src/components/public/PwaManager"), { ssr: false });
const NewsTicker = dynamic(() => import("@/src/components/NewsTicker"), { ssr: false });
const AdSlotFrame = dynamic(() => import("@/src/components/ads/ad-slot-frame"), { ssr: false });

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
 * Pure shell composition (SSR-safe, unit-testable via renderToStaticMarkup).
 * Holds no state; the client wrapper (public-page-shell-client.tsx) owns mobile menu
 * and cookie-consent state and passes it in. All nav/footer/ad data comes from
 * src/config/* single sources of truth.
 */
export type PublicShellLayoutProps = {
  labels: Translation;
  locale: Locale;
  country: string;
  city: string;
  deviceType: DeviceType;
  navItems: PublicNavItem[];
  currentPath: string;
  viewer: ViewerContext;
  searchHref?: string;
  onLogin: () => void;
  onLogout: () => void;
  mobileMenuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  breadcrumbs?: BreadcrumbItem[];
  pageHeader?: PageHeaderNode;
  officePromotion?: OfficePromotion;
  adLayout?: PublicAdLayout;
  cookieNoticeVisible: boolean;
  onCookieAccept: () => void;
  onCookieReject: () => void;
  onCookieManage: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  children: ReactNode;
};

export function PublicShellLayout({
  labels,
  locale,
  country,
  city,
  deviceType,
  navItems,
  currentPath,
  viewer,
  searchHref,
  onLogin,
  onLogout,
  mobileMenuOpen,
  onOpenMenu,
  onCloseMenu,
  breadcrumbs,
  pageHeader,
  officePromotion,
  adLayout,
  cookieNoticeVisible,
  onCookieAccept,
  onCookieReject,
  onCookieManage,
  sidebarCollapsed,
  onToggleSidebar,
  children,
}: PublicShellLayoutProps) {
  const showPublicSidebar = shouldUsePublicSidebar(currentPath);
  const showHeaderNav = shouldShowHeaderPublicNavigation(currentPath);

  // Ad-request flow: clicking an empty ad frame opens the request dialog
  // pre-bound to that exact slot (placement + canonical + page family).
  const [adRequestSlot, setAdRequestSlot] = useState<PublicAdSlotConfig | null>(null);
  const handleRequestAd = useCallback((config: PublicAdSlotConfig) => {
    setAdRequestSlot(config);
  }, []);
  const closeAdRequest = useCallback(() => setAdRequestSlot(null), []);
  const usesStandardAdLayout = adLayout?.mode === "standard";
  const hidesPublicAds = adLayout?.mode === "safe-no-ads";
  const isPlatformAdmin =
    viewer.authenticated &&
    (viewer.permissions.includes("*") || viewer.permissions.includes(PERMISSIONS.ADMIN_DASHBOARD_VIEW));
  // These pages stay reachable from the footer; the side rail keeps only the
  // main browsing destinations.
  const sidebarNavItems = navItems.filter((item) => item.key !== "advertise" && item.key !== "about" && item.key !== "contact");
  const sidebarExtraItems = isPlatformAdmin
    ? [{
        key: "admin-dashboard",
        label: locale === "ar" ? "لوحة التحكم" : locale === "tr" ? "Yönetim Paneli" : "Admin Panel",
        href: "/admin",
        icon: LayoutDashboard,
      }]
    : undefined;
  const sidebarFooter = viewer.authenticated ? (
    <div className="min-w-0">
      <p className="truncate text-[var(--font-size-sm)] font-semibold text-[color:var(--color-text-primary)]">{viewer.displayName || viewer.email}</p>
      <p className="text-[var(--font-size-xs)] text-[color:var(--color-text-muted)]">{labels.navAccount}</p>
    </div>
  ) : (
    <div className="flex flex-col gap-[var(--space-3)]">
      <button
        type="button"
        onClick={onLogin}
        className="w-full rounded-[var(--radius-md)] bg-[color:var(--color-primary)] px-[var(--space-4)] py-[var(--space-3)] text-[var(--font-size-sm)] font-semibold text-[color:var(--color-primary-foreground)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-primary-hover)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        {labels.login}
      </button>
    </div>
  );

  const content = (
    <>
      {breadcrumbs && (
        <PageContainer className="pt-[var(--space-6)]">
          <Breadcrumbs items={breadcrumbs} ariaLabel={labels.breadcrumbAria} homeLabel={labels.navHome} />
        </PageContainer>
      )}

      {pageHeader && (
        <PageContainer className="pt-[var(--space-8)]">
          <PageHeader title={pageHeader.title} description={pageHeader.description} eyebrow={pageHeader.eyebrow} actions={pageHeader.actions} />
        </PageContainer>
      )}

      {children}
    </>
  );

  return (
    <div className="public-page-shell" data-sidebar-state={sidebarCollapsed ? "collapsed" : "expanded"}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:inset-x-0 focus:top-0 focus:z-[var(--layer-toast)] focus:bg-[color:var(--color-primary)] focus:px-[var(--space-5)] focus:py-[var(--space-3)] focus:text-center focus:text-[var(--font-size-md)] focus:font-semibold focus:text-[color:var(--color-primary-foreground)]"
      >
        {labels.skipToContent}
      </a>

      <MobileNavigation
        open={mobileMenuOpen}
        onClose={onCloseMenu}
        items={navItems}
        labels={labels}
        currentPath={currentPath}
        viewer={viewer}
        onLogin={onLogin}
        onLogout={onLogout}
        searchHref={searchHref}
      />

      <div className="flex min-h-[100dvh] flex-col">
        {/* Floating panel — fixed positioned; when pinned open on desktop it
            pushes/shrinks the content column via .public-shell-content below
            instead of floating over it. */}
        {showPublicSidebar && <PublicSidebar labels={labels} items={sidebarNavItems} extraItems={sidebarExtraItems} currentPath={currentPath} footer={sidebarFooter} collapsed={sidebarCollapsed} onToggle={onToggleSidebar} />}

        <div className="public-shell-content flex min-w-0 flex-1 flex-col">
          {/* Header + news ticker pin together as one sticky block. */}
          <div className="sticky top-0 z-[var(--layer-header)]">
          <PublicHeader
            labels={labels}
            locale={locale}
            navItems={navItems}
            currentPath={currentPath}
            viewer={viewer}
            searchHref={searchHref}
            onLogin={onLogin}
            onLogout={onLogout}
            onOpenMenu={onOpenMenu}
            onToggleSidebar={showPublicSidebar ? onToggleSidebar : undefined}
            showDesktopNavigation={showHeaderNav}
          />

          <NewsTicker copy={labels} locale={locale} country={country} city={city} />
          </div>

          <PwaManager />

          <main id="main-content" tabIndex={-1} className="public-main outline-none">
            {!usesStandardAdLayout && !hidesPublicAds && PUBLIC_TOP_AD.used && (
              <PageContainer className="pt-[var(--space-4)]">
                <AdSlotFrame
                  config={PUBLIC_TOP_AD}
                  label={labels.adLabel}
                  locale={locale}
                  country={country}
                  city={city}
                  deviceType={deviceType}
                  onRequestAd={handleRequestAd}
                />
              </PageContainer>
            )}

            {usesStandardAdLayout ? (
              <StandardPublicAdLayout
                family={adLayout.family}
                label={labels.adLabel}
                locale={locale}
                country={country}
                city={city}
                deviceType={deviceType}
                path={currentPath}
                entityType={adLayout.entityType}
                entityId={adLayout.entityId}
                categoryId={adLayout.categoryId}
                tags={adLayout.tags}
                onRequestAd={handleRequestAd}
              >
                {content}
              </StandardPublicAdLayout>
            ) : (
              content
            )}

            {!usesStandardAdLayout && !hidesPublicAds && PUBLIC_BOTTOM_AD.used && (
              <PageContainer className="pb-[var(--space-6)]">
                <AdSlotFrame
                  config={PUBLIC_BOTTOM_AD}
                  label={labels.adLabel}
                  locale={locale}
                  country={country}
                  city={city}
                  deviceType={deviceType}
                  onRequestAd={handleRequestAd}
                />
              </PageContainer>
            )}
          </main>

          {officePromotion && (
            <OfficeAppPromotion
              labels={labels}
              cta={officePromotion.cta}
              description={officePromotion.description}
              href={officePromotion.href}
              onCta={officePromotion.onCta}
            />
          )}

          <PublicFooter labels={labels} />
        </div>
      </div>

      <Link className="floating-chat" href="/messages" aria-label={labels.chatAria}>⌁</Link>

      <CookieNotice labels={labels} visible={cookieNoticeVisible} onAccept={onCookieAccept} onReject={onCookieReject} onManage={onCookieManage} />

      <ToastRegion labels={labels} />

      {adRequestSlot && (
        <AdRequestDialog
          locale={locale}
          open
          placement={adRequestSlot.placement}
          canonical={adRequestSlot.canonical}
          family={usesStandardAdLayout ? adLayout.family : undefined}
          countryCode={country || "om"}
          city={city}
          path={currentPath}
          onClose={closeAdRequest}
        />
      )}
    </div>
  );
}
