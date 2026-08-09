import { Menu } from "lucide-react";
import type { Translation, ViewerContext } from "@/src/types/site";
import type { PublicNavItem } from "@/src/config/public-navigation";
import Button from "@/src/components/ui/Button";
import PageContainer from "@/src/components/layout/PageContainer";
import DesktopNavigation from "@/src/components/public/desktop-navigation";
import SearchTrigger from "@/src/components/public/search-trigger";

/**
 * Public header: brand (→ `/`), unified nav, search entry, account actions,
 * and the mobile menu trigger. Pure (no hooks); mobile menu state lives in the
 * shell wrapper.
 */
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
      <PageContainer className="flex min-h-16 items-center justify-between gap-[var(--space-4)]">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- presentational SSR-safe brand link; pages opt into currentPath */}
        <a href="/" aria-label={labels.brandTitle} className="inline-flex shrink-0 items-center gap-[var(--space-3)] focus-visible:outline-none focus-visible:rounded-[var(--radius-sm)] focus-visible:shadow-[var(--shadow-focus)]">
          <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-primary)] font-bold text-[color:var(--color-primary-foreground)]" aria-hidden="true">
            A
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <strong className="text-[var(--font-size-md)] font-semibold text-[color:var(--color-text-primary)]">{labels.brandTitle}</strong>
            <small className="text-[var(--font-size-xs)] text-[color:var(--color-text-muted)]">{labels.brandSubtitle}</small>
          </span>
        </a>

        {showDesktopNavigation && <DesktopNavigation items={navItems} labels={labels} currentPath={currentPath} />}

        <div className="flex shrink-0 items-center gap-[var(--space-2)]">
          {searchHref && <SearchTrigger href={searchHref} label={labels.searchAria} />}
          <div className="hidden items-center gap-[var(--space-2)] md:flex">
            {viewer.authenticated ? (
              <>
                <span className="max-w-[160px] truncate text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)]">
                  {viewer.displayName || viewer.email}
                </span>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  {labels.logout}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={onLogin}>
                  {labels.login}
                </Button>
                <Button variant="primary" size="sm" onClick={onLogin}>
                  {labels.register}
                </Button>
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" aria-label={labels.showMenu} onClick={onOpenMenu} className="md:hidden">
            <Menu aria-hidden="true" className="size-5" />
          </Button>
        </div>
      </PageContainer>
    </header>
  );
}
