import { Menu } from "lucide-react";
import type { Translation, ViewerContext } from "@/src/types/site";
import { isNavItemActive, type PublicNavItem } from "@/src/config/public-navigation";
import { cn } from "@/src/utils/cn";
import Button from "@/src/components/ui/Button";
import PageContainer from "@/src/components/layout/PageContainer";
import SearchTrigger from "@/src/components/public/search-trigger";
import CountrySwitcher from "@/src/components/public/CountrySwitcher";
import ThemeSwitcher from "@/src/components/public/ThemeSwitcher";
import LanguageSwitcher from "@/src/components/public/LanguageSwitcher";
import LocationCluster from "@/src/components/public/LocationCluster";
import type { Locale } from "@/src/types/site";

type PublicHeaderProps = {
  labels: Translation;
  locale?: Locale;
  navItems: PublicNavItem[];
  currentPath: string;
  viewer: ViewerContext;
  searchHref?: string;
  onLogin: () => void;
  onLogout: () => void;
  onOpenMenu: () => void;
  onToggleSidebar?: () => void;
  showDesktopNavigation?: boolean;
};

export default function PublicHeader({
  labels,
  locale = "ar",
  navItems,
  currentPath,
  viewer,
  searchHref,
  onLogin,
  onLogout,
  onOpenMenu,
  onToggleSidebar,
  showDesktopNavigation = true,
}: PublicHeaderProps) {
  return (
    // relative z-30: the backdrop-blur creates a stacking context that traps
    // the dropdowns; without an explicit z-index the news ticker (a later
    // sibling in the sticky block) paints over them.
    <header className="relative z-30 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/95 backdrop-blur-sm">
      {/* Row 1 — menu trigger + brand */}
      <PageContainer size="wide" className="flex min-h-14 flex-wrap items-center gap-x-2 gap-y-2 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden rounded-lg bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]" aria-label={labels.showMenu} onClick={onOpenMenu}>
            <Menu aria-hidden="true" className="size-5" />
          </Button>
          {onToggleSidebar && (
            <Button variant="ghost" size="icon" className="hidden md:inline-flex rounded-lg bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]" aria-label={labels.showMenu} onClick={onToggleSidebar}>
              <Menu aria-hidden="true" className="size-5" />
            </Button>
          )}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- presentational SSR-safe brand link */}
          <a href="/" aria-label={labels.brandTitle} className="inline-flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px_11px_2px_11px] bg-[color:var(--color-primary)] font-black text-white shadow-[inset_0_-4px_0_rgba(0,0,0,.14)]" aria-hidden="true">A</span>
            <span className="flex min-w-0 flex-col leading-tight">
              <strong className="truncate text-[15px] font-black text-[color:var(--color-text-primary)]">{labels.brandTitle}</strong>
              <small className="hidden truncate text-[10px] font-bold text-[color:var(--color-primary)] sm:block">{labels.brandSubtitle}</small>
            </span>
          </a>
        </div>
      </PageContainer>

      {/* Row 2 — primary navigation strip */}
      {showDesktopNavigation && (
        <div className="hidden border-t border-[color:var(--color-border)]/60 lg:block">
          <PageContainer>
            <nav aria-label={labels.mainNavAria} className="flex items-center justify-center gap-1 py-1.5">
              {navItems.slice(0, 6).map((item) => {
                const active = isNavItemActive(item, currentPath);
                return (
                  <a
                    key={item.key}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors",
                      active
                        ? "bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]"
                        : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text-primary)]",
                    )}
                  >
                    {labels[item.labelKey]}
                  </a>
                );
              })}
            </nav>
          </PageContainer>
        </div>
      )}

      {/* Row 3 — tool clusters + account actions, under the nav strip as requested */}
      <div className="border-t border-[color:var(--color-border)]/60">
        <PageContainer size="wide" className="flex flex-wrap items-center justify-center gap-2 py-1.5">
          <div className="header-tool-cluster">
            <CountrySwitcher />
            <LocationCluster locale={locale} />
          </div>
          <div className="header-tool-cluster">
            <LanguageSwitcher labels={labels} />
            <ThemeSwitcher labels={labels} />
          </div>
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
        </PageContainer>
      </div>
    </header>
  );
}
