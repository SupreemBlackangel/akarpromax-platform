import type { ReactNode } from "react";
import type { Locale, Translation, ViewerContext } from "@/src/types/site";
import type { DeviceType } from "@/src/constants/advertising";
import type { BreadcrumbItem, PublicNavItem } from "@/src/config/public-navigation";
import { PUBLIC_BOTTOM_AD, PUBLIC_TOP_AD } from "@/src/config/ad-placements";
import PageContainer from "@/src/components/layout/PageContainer";
import Breadcrumbs from "@/src/components/ui/Breadcrumbs";
import PageHeader from "@/src/components/ui/PageHeader";
import NewsTicker from "@/src/components/NewsTicker";
import AdSlotFrame from "@/src/components/ads/ad-slot-frame";
import PublicHeader from "@/src/components/public/public-header";
import PublicFooter from "@/src/components/public/public-footer";
import PublicSidebar from "@/src/components/public/public-sidebar";
import MobileNavigation from "@/src/components/public/mobile-navigation";
import OfficeAppPromotion from "@/src/components/public/office-app-promotion";
import CookieNotice from "@/src/components/public/cookie-notice";
import ToastRegion from "@/src/components/public/toast-region";
import type { StandardPublicAdLayoutKey } from "@/src/config/standard-public-ad-layout";
import StandardPublicAdLayout from "@/src/components/ads/standard-public-ad-layout";
import { shouldShowHeaderPublicNavigation, shouldUsePublicSidebar } from "@/src/config/public-navigation";

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
 * Holds no state; the client wrapper (public-page-shell.tsx) owns mobile menu
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
  const usesStandardAdLayout = adLayout?.mode === "standard";
  const hidesPublicAds = adLayout?.mode === "safe-no-ads";
  const sidebarFooter = viewer.authenticated ? (
    <div className="flex flex-col gap-[var(--space-3)]">
      <div className="min-w-0">
        <p className="truncate text-[var(--font-size-sm)] font-semibold text-[color:var(--color-text-primary)]">{viewer.displayName || viewer.email}</p>
        <p className="text-[var(--font-size-xs)] text-[color:var(--color-text-muted)]">{labels.navAccount}</p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-transparent px-[var(--space-4)] py-[var(--space-3)] text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        {labels.logout}
      </button>
    </div>
  ) : (
    <div className="flex flex-col gap-[var(--space-3)]">
      <button
        type="button"
        onClick={onLogin}
        className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-transparent px-[var(--space-4)] py-[var(--space-3)] text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        {labels.login}
      </button>
      <button
        type="button"
        onClick={onLogin}
        className="w-full rounded-[var(--radius-md)] bg-[color:var(--color-primary)] px-[var(--space-4)] py-[var(--space-3)] text-[var(--font-size-sm)] font-semibold text-[color:var(--color-primary-foreground)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-primary-hover)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        {labels.register}
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

      <div className="flex min-h-[100dvh] flex-col md:flex-row">
        {showPublicSidebar && <PublicSidebar labels={labels} items={navItems} currentPath={currentPath} footer={sidebarFooter} collapsed={sidebarCollapsed} onToggle={onToggleSidebar} />}

        <div className="flex min-w-0 flex-1 flex-col">
          <PublicHeader
            labels={labels}
            navItems={navItems}
            currentPath={currentPath}
            viewer={viewer}
            searchHref={searchHref}
            onLogin={onLogin}
            onLogout={onLogout}
            onOpenMenu={onOpenMenu}
            showDesktopNavigation={showHeaderNav && !showPublicSidebar}
          />

          <NewsTicker copy={labels} locale={locale} country={country} city={city} />

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

      <CookieNotice labels={labels} visible={cookieNoticeVisible} onAccept={onCookieAccept} onReject={onCookieReject} onManage={onCookieManage} />

      <ToastRegion labels={labels} />
    </div>
  );
}
