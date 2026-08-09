import type { Translation } from "@/src/types/site";
import type { PublicNavItem } from "@/src/config/public-navigation";
import { isNavItemActive } from "@/src/config/public-navigation";
import NavItem from "@/src/components/ui/NavItem";

/**
 * Desktop horizontal navigation. Pure (no hooks) so it is SSR/test-safe.
 * Rendered only on lg+ breakpoints; mobile uses MobileNavigation (same data source).
 */
type DesktopNavigationProps = {
  items: PublicNavItem[];
  labels: Translation;
  currentPath: string;
};

export default function DesktopNavigation({ items, labels, currentPath }: DesktopNavigationProps) {
  return (
    <nav aria-label={labels.mainNavAria} className="hidden flex-1 flex-wrap items-center justify-center gap-[var(--space-1)] md:flex xl:gap-[var(--space-2)]">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavItem
            key={item.key}
            href={item.href}
            active={isNavItemActive(item, currentPath)}
            icon={Icon ? <Icon aria-hidden="true" className="size-4" /> : undefined}
            title={labels[item.labelKey]}
            aria-label={labels[item.labelKey]}
            className="px-[var(--space-3)] py-[var(--space-2)]"
          >
            {labels[item.labelKey]}
          </NavItem>
        );
      })}
    </nav>
  );
}
