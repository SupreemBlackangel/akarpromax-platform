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
      <PageContainer className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 py-2">
        {/* Menu trigger (mobile sheet) + brand — always visible */}
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden rounded-lg bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]" aria-label={labels.showMenu} onClick={onOpenMenu}>
            <Menu aria-hidden="true" className="size-5" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- presentational SSR-safe brand link */}
          <a href="/" aria-label={labels.brandTitle} className="inline-flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px_11px_2px_11px] bg-[color:var(--color-primary)] font-black text-white shadow-[inset_0_-4px_0_rgba(0,0,0,.14)]" aria-hidden="true">A</span>
            <span className="flex min-w-0 flex-col leading-tight">
              <strong className="truncate text-[15px] font-black text-[color:var(--color-text-primary)]">{labels.brandTitle}</strong>
              <small className="hidden truncate text-[10px] font-bold text-[color:var(--color-primary)] sm:block">{labels.brandSubtitle}</small>
            </span>
          </a>
        </div>

        {/* Tool clusters + actions */}
        <div className="ms-auto flex flex-wrap items-center justify-end gap-2">
          <div className="header-tool-cluster flex items-center rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/60 shadow-[var(--shadow-xs)] [&>*+*]:border-s [&>*+*]:border-[color:var(--color-border)]">
            <CountrySwitcher />
            <CurrencyChip />
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
        </div>
      </PageContainer>
    </header>
  );
}
