import type { ReactNode } from "react";
import type { Translation } from "@/src/types/site";
import type { PublicNavItem } from "@/src/config/public-navigation";
import { groupPublicNav, isNavItemActive } from "@/src/config/public-navigation";
import { cn } from "@/src/utils/cn";

type PublicSidebarProps = {
  labels: Translation;
  items: PublicNavItem[];
  currentPath: string;
  footer?: ReactNode;
  className?: string;
};

export default function PublicSidebar({ labels, items, currentPath, footer, className = "" }: PublicSidebarProps) {
  const sections = groupPublicNav(items);

  return (
    <aside
      data-public-sidebar-state="expanded"
      className={cn(
        "hidden shrink-0 border-e border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] md:flex md:w-64 md:flex-col",
        className,
      )}
    >
      <div className="sticky top-0 flex h-[100dvh] flex-col overflow-hidden">
        <div className="border-b border-[color:var(--color-border)] px-[var(--space-5)] py-[var(--space-5)]">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- presentational SSR-safe brand link */}
          <a href="/" aria-label={labels.brandTitle} className="inline-flex items-center gap-[var(--space-3)] focus-visible:outline-none focus-visible:rounded-[var(--radius-sm)] focus-visible:shadow-[var(--shadow-focus)]">
            <span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-primary)] font-bold text-[color:var(--color-primary-foreground)]" aria-hidden="true">
              A
            </span>
            <span className="flex flex-col leading-tight">
              <strong className="text-[var(--font-size-md)] font-semibold text-[color:var(--color-text-primary)]">{labels.brandTitle}</strong>
              <small className="text-[var(--font-size-xs)] text-[color:var(--color-text-muted)]">{labels.brandSubtitle}</small>
            </span>
          </a>
        </div>

        <div className="flex-1 overflow-y-auto px-[var(--space-4)] py-[var(--space-5)]">
          {sections.map((section) => (
            <div key={section.key} className="mb-[var(--space-6)] last:mb-0">
              <p className="mb-[var(--space-2)] px-[var(--space-3)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-muted)]">
                {labels[section.labelKey]}
              </p>
              <nav aria-label={labels[section.labelKey]} className="sidebar-public-nav flex flex-col gap-[var(--space-1)]">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const label = labels[item.labelKey];
                  const active = isNavItemActive(item, currentPath);
                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      title={label}
                      aria-label={label}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-[var(--space-3)] rounded-[var(--radius-lg)] border px-[var(--space-3)] py-[var(--space-2)] text-[var(--font-size-sm)] font-medium transition-colors duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                        active
                          ? "border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary-hover)]"
                          : "border-transparent text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-border)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-text-primary)]",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-5 shrink-0" />
                      <span className="truncate">{label}</span>
                    </a>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {footer && <div className="border-t border-[color:var(--color-border)] p-[var(--space-4)]">{footer}</div>}
      </div>
    </aside>
  );
}
