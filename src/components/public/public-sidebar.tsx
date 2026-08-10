import { type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Translation } from "@/src/types/site";
import type { PublicNavItem } from "@/src/config/public-navigation";
import { isNavItemActive } from "@/src/config/public-navigation";
import { cn } from "@/src/utils/cn";

type PublicSidebarProps = {
  labels: Translation;
  items: PublicNavItem[];
  currentPath: string;
  footer?: ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
};

export default function PublicSidebar({ labels, items, currentPath, footer, collapsed = false, onToggle, className = "" }: PublicSidebarProps) {
  const isRtl = labels.metaTitle?.includes("عقار") ?? true;

  return (
    <aside
      data-public-sidebar-state={collapsed ? "collapsed" : "expanded"}
      className={cn(
        "hidden shrink-0 border-e border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] md:flex md:flex-col transition-all duration-200",
        collapsed ? "md:w-[68px]" : "md:w-64",
        className,
      )}
    >
      <div className="sticky top-0 flex h-[100dvh] flex-col overflow-hidden">
        {/* Toggle button */}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-10 items-center justify-center border-b border-[color:var(--color-border)] text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-text-primary)] transition-colors"
            aria-label={collapsed ? (isRtl ? "توسيع" : "Expand sidebar") : (isRtl ? "طي" : "Collapse sidebar")}
          >
            {collapsed
              ? (isRtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />)
              : (isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />)
            }
          </button>
        )}

        {/* Brand */}
        <div className={cn("border-b border-[color:var(--color-border)] py-[var(--space-4)]", collapsed ? "px-2" : "px-[var(--space-5)]")}>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- presentational SSR-safe brand link */}
          <a href="/" aria-label={labels.brandTitle} className={cn("inline-flex items-center gap-[var(--space-3)] focus-visible:outline-none focus-visible:rounded-[var(--radius-sm)] focus-visible:shadow-[var(--shadow-focus)]", collapsed && "justify-center w-full")}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-primary)] font-bold text-[color:var(--color-primary-foreground)]" aria-hidden="true">
              A
            </span>
            {!collapsed && (
              <span className="flex flex-col leading-tight min-w-0">
                <strong className="text-sm font-bold text-[color:var(--color-text-primary)] truncate">{labels.brandTitle}</strong>
                <small className="text-xs text-[color:var(--color-text-muted)] truncate">{labels.brandSubtitle}</small>
              </span>
            )}
          </a>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-[var(--space-3)] py-[var(--space-4)]">
          <nav aria-label={labels.mainNavAria} className="sidebar-public-nav flex flex-col gap-1">
            {items.map((item) => {
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
                    "inline-flex min-h-[44px] items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                    collapsed && "justify-center px-0",
                    active
                      ? "border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary-hover)] font-semibold"
                      : "border-transparent text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-border)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-text-primary)]",
                  )}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        {footer && !collapsed && (
          <div className="border-t border-[color:var(--color-border)] p-[var(--space-4)]">{footer}</div>
        )}
      </div>
    </aside>
  );
}
