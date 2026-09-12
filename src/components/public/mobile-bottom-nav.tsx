import { isNavItemActive, type PublicNavItem } from "@/src/config/public-navigation";
import type { Translation } from "@/src/types/site";
import { cn } from "@/src/utils/cn";

/**
 * The five destinations a phone keeps within reach.
 *
 * Everything a visitor could go to lived behind the hamburger, which on a phone
 * means every move between sections costs two taps and a full-screen sheet.
 * These five are the sections the platform is actually about; the rest stay in
 * the menu, which is what a menu is for.
 *
 * Five and not more: a sixth item on a 390px screen leaves each target under
 * 64px wide, which is below what a thumb reliably hits.
 */
type MobileBottomNavProps = {
  items: PublicNavItem[];
  currentPath: string;
  labels: Translation;
  locale?: "ar" | "en" | "tr";
};

/** How many fit before the targets stop being thumb-sized. */
const MAX_ITEMS = 5;

/**
 * What each destination is called when there are seventy pixels to say it in.
 *
 * "شركات و مكاتب عقارية" truncated to "شركات و ..." — which is the same three
 * words as "شركات أخرى" truncated, so two of the five buttons read alike. The
 * icon carries the recognition at this size and the word only has to
 * distinguish; these are the shortest forms that still do.
 */
const SHORT_LABELS: Record<string, { ar: string; en: string; tr: string }> = {
  home: { ar: "الرئيسية", en: "Home", tr: "Ana Sayfa" },
  properties: { ar: "العقارات", en: "Properties", tr: "Mülkler" },
  "engineering-tools": { ar: "الأدوات", en: "Tools", tr: "Araçlar" },
  "services-market": { ar: "الخدمات", en: "Services", tr: "Hizmetler" },
  "real-estate-companies": { ar: "المكاتب", en: "Offices", tr: "Ofisler" },
  "other-companies": { ar: "الشركات", en: "Companies", tr: "Şirketler" },
  community: { ar: "المنتدى", en: "Forum", tr: "Forum" },
  knowledge: { ar: "المكتبة", en: "Library", tr: "Kütüphane" },
};

export default function MobileBottomNav({ items, currentPath, labels, locale = "ar" }: MobileBottomNavProps) {
  const visible = items.slice(0, MAX_ITEMS);
  if (visible.length === 0) return null;

  return (
    <nav
      aria-label={labels.mainNavAria}
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {visible.map((item) => {
          const active = isNavItemActive(item, currentPath);
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <a
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-[var(--space-1)] px-1 py-[var(--space-2)] text-[var(--text-xs)] font-medium transition-colors",
                  active
                    ? "text-[color:var(--color-primary)]"
                    : "text-[color:var(--color-text-secondary)]",
                )}
              >
                {Icon ? <Icon aria-hidden="true" className="size-5 shrink-0" /> : null}
                <span className="max-w-full truncate">{SHORT_LABELS[item.key]?.[locale] ?? labels[item.labelKey]}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
