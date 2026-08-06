import type { Translation } from "@/src/types/site";
import type { PublicNavItem } from "@/src/config/public-navigation";
import { isNavPathActive } from "@/src/config/public-navigation";
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
    <nav aria-label={labels.mainNavAria} className="hidden items-center gap-[var(--space-2)] lg:flex">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavItem
            key={item.key}
            href={item.href}
            active={isNavPathActive(item.href, currentPath)}
            icon={Icon ? <Icon aria-hidden="true" className="size-4" /> : undefined}
          >
            {labels[item.labelKey]}
          </NavItem>
        );
      })}
    </nav>
  );
}
