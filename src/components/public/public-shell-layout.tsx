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
import MobileNavigation from "@/src/components/public/mobile-navigation";
import OfficeAppPromotion from "@/src/components/public/office-app-promotion";
import CookieNotice from "@/src/components/public/cookie-notice";
import ToastRegion from "@/src/components/public/toast-region";

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
  cookieNoticeVisible: boolean;
  onCookieAccept: () => void;
  onCookieReject: () => void;
  onCookieManage: () => void;
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
  cookieNoticeVisible,
  onCookieAccept,
  onCookieReject,
  onCookieManage,
  children,
}: PublicShellLayoutProps) {
  return (
    <div className="public-page-shell">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:inset-x-0 focus:top-0 focus:z-[var(--layer-toast)] focus:bg-[color:var(--color-primary)] focus:px-[var(--space-5)] focus:py-[var(--space-3)] focus:text-center focus:text-[var(--font-size-md)] focus:font-semibold focus:text-[color:var(--color-primary-foreground)]"
      >
        {labels.skipToContent}
      </a>

      <PublicHeader
        labels={labels}
        navItems={navItems}
        currentPath={currentPath}
        viewer={viewer}
        searchHref={searchHref}
        onLogin={onLogin}
        onLogout={onLogout}
        onOpenMenu={onOpenMenu}
      />

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

      <NewsTicker copy={labels} locale={locale} country={country} city={city} />

      <main id="main-content" tabIndex={-1} className="outline-none">
        {PUBLIC_TOP_AD.used && (
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

        {PUBLIC_BOTTOM_AD.used && (
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

      <CookieNotice labels={labels} visible={cookieNoticeVisible} onAccept={onCookieAccept} onReject={onCookieReject} onManage={onCookieManage} />

      <ToastRegion labels={labels} />
    </div>
  );
}
