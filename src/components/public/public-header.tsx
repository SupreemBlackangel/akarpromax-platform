import { Menu } from "lucide-react";
import type { Translation, ViewerContext } from "@/src/types/site";
import type { PublicNavItem } from "@/src/config/public-navigation";
import Button from "@/src/components/ui/Button";
import PageContainer from "@/src/components/layout/PageContainer";
import SearchTrigger from "@/src/components/public/search-trigger";
import CountrySwitcher from "@/src/components/public/CountrySwitcher";
import ThemeSwitcher from "@/src/components/public/ThemeSwitcher";
import CurrencyChip from "@/src/components/public/CurrencyChip";

type PublicHeaderProps = {
  labels: Translation;
  navItems: PublicNavItem[];
  currentPath: string;
  viewer: ViewerContext;
  searchHref?: string;
  onLogin: () => void;
  onLogout: () => void;
  onOpenMenu: () => void;
  showDesktopNavigation?: boolean;
};

export default function PublicHeader({
  labels,
  navItems,
  currentPath,
  viewer,
  searchHref,
  onLogin,
  onLogout,
  onOpenMenu,
  showDesktopNavigation = true,
}: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-[var(--layer-header)] border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/95 backdrop-blur-sm">
      <PageContainer className="flex min-h-14 items-center justify-between gap-4">
        {/* Mobile menu trigger + brand (mobile only) */}
        <div className="flex items-center gap-2 md:hidden">
          <Button variant="ghost" size="icon" aria-label={labels.showMenu} onClick={onOpenMenu}>
            <Menu aria-hidden="true" className="size-5" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- mobile-only brand */}
          <a href="/" aria-label={labels.brandTitle} className="inline-flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color:var(--color-primary)] font-bold text-white text-xs">A</span>
            <span className="text-sm font-bold text-[color:var(--color-text-primary)]">{labels.brandTitle}</span>
          </a>
        </div>

        {/* Desktop: right side controls */}
        <div className="flex items-center gap-2 ml-auto">
          <CountrySwitcher />
          <CurrencyChip />
          <ThemeSwitcher labels={labels} />
          {searchHref && <SearchTrigger href={searchHref} label={labels.searchAria} />}
          <div className="hidden items-center gap-2 md:flex">
            {viewer.authenticated ? (
              <>
                <span className="max-w-[140px] truncate text-sm font-medium text-[color:var(--color-text-primary)]">
                  {viewer.displayName || viewer.email}
                </span>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  {labels.logout}
                </Button>
              </>
            ) : (
              <Button variant="primary" size="sm" onClick={onLogin}>
                {labels.login}
              </Button>
            )}
          </div>
        </div>
      </PageContainer>
    </header>
  );
}
