"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Pin, PinOff, type LucideIcon } from "lucide-react";
import type { Translation } from "@/src/types/site";
import type { PublicNavItem } from "@/src/config/public-navigation";
import { isNavItemActive } from "@/src/config/public-navigation";
import { cn } from "@/src/utils/cn";

export type PublicSidebarExtraItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

type PublicSidebarProps = {
  labels: Translation;
  items: PublicNavItem[];
  /** Viewer-specific entries (e.g. admin dashboard) appended to the nav in the same style. */
  extraItems?: PublicSidebarExtraItem[];
  currentPath: string;
  footer?: ReactNode;
  /** True = unpinned (auto-hide). The prop name is kept for the shell contract. */
  collapsed?: boolean;
  /** Toggles the pinned state (persisted by the shell client). */
  onToggle?: () => void;
  className?: string;
};

const HOVER_CLOSE_DELAY_MS = 350;

/**
 * Floating, self-hiding public navigation panel (desktop). It consumes no
 * layout width: a fixed overlay card on the inline-start edge. Unpinned, it
 * stays off-canvas and slides in while the cursor is over its edge handle or
 * the panel itself; pinning (edge handle click or the pin button) keeps it
 * open. Mobile navigation stays in mobile-navigation.tsx.
 */
export default function PublicSidebar({ labels, items, extraItems, currentPath, footer, collapsed = false, onToggle, className = "" }: PublicSidebarProps) {
  const isRtl = labels.metaTitle?.includes("عقار") ?? true;
  const [hovering, setHovering] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const pinned = !collapsed;

  const handleEnter = useCallback(() => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setHovering(true);
  }, []);

  const handleLeave = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setHovering(false), HOVER_CLOSE_DELAY_MS);
  }, []);

  const pinLabel = pinned
    ? (isRtl ? "إلغاء تثبيت القائمة" : "Unpin navigation")
    : (isRtl ? "تثبيت القائمة" : "Pin navigation");

  return (
    <aside
      data-public-sidebar-state={collapsed ? "collapsed" : "expanded"}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      className={cn(
        "public-floating-sidebar fixed inset-y-3 start-0 z-[60] hidden w-[min(272px,86vw)] md:block",
        "transition-transform duration-300 ease-out",
        hovering && "is-peek-open",
        className,
      )}
    >
      {/* Edge handle — overhangs the panel on the viewport side so it stays
          visible (and hoverable) while the panel is off-canvas. Click pins.
          Hidden once pinned: the panel's own header button takes over, and
          the handle would otherwise overhang into the shifted content. */}
      {onToggle && !pinned && (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={pinned}
          aria-label={pinLabel}
          title={pinLabel}
          className="absolute start-full top-1/2 z-[61] flex h-16 w-6 -translate-y-1/2 items-center justify-center rounded-e-xl border border-s-0 border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-primary)] shadow-[var(--shadow-md)] transition-colors hover:bg-[color:var(--color-primary-soft)]"
        >
          {pinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
      )}

      <div className="flex h-full flex-col overflow-hidden rounded-e-2xl border border-s-0 border-[color:var(--color-border)] bg-[color:var(--color-surface)]/95 shadow-[var(--shadow-xl)] backdrop-blur-md">
        {/* Brand + pin */}
        <div className="flex items-center justify-between gap-2 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/60 px-[var(--space-4)] py-[var(--space-4)]">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- presentational SSR-safe brand link */}
          <a href="/" aria-label={labels.brandTitle} className="inline-flex min-w-0 items-center gap-[var(--space-3)] focus-visible:outline-none focus-visible:rounded-[var(--radius-sm)] focus-visible:shadow-[var(--shadow-focus)]">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-primary)] font-bold text-[color:var(--color-primary-foreground)] shadow-[inset_0_-4px_0_rgba(0,0,0,.14)]" aria-hidden="true">
              A
            </span>
            <span className="flex flex-col leading-tight min-w-0">
              <strong className="text-sm font-bold text-[color:var(--color-text-primary)] truncate">{labels.brandTitle}</strong>
              <small className="text-[10px] font-semibold text-[color:var(--color-primary)] truncate">{labels.brandSubtitle}</small>
            </span>
          </a>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-pressed={pinned}
              aria-label={pinLabel}
              title={pinLabel}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                pinned
                  ? "border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]"
                  : "border-[color:var(--color-border)] bg-transparent text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)]",
              )}
            >
              {pinned ? <Pin size={14} /> : <PinOff size={14} />}
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-[var(--space-3)] py-[var(--space-3)]">
          <nav aria-label={labels.mainNavAria} className="sidebar-public-nav flex flex-col gap-0.5">
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
                    "inline-flex min-h-[42px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                    active
                      ? "bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary-hover)] font-semibold"
                      : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text-primary)]",
                  )}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0 text-[color:var(--color-primary)]" />
                  <span className="truncate">{label}</span>
                </a>
              );
            })}
            {extraItems?.map((item) => {
              const Icon = item.icon;
              const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
              return (
                <a
                  key={item.key}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-[42px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                    active
                      ? "bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary-hover)] font-semibold"
                      : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text-primary)]",
                  )}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0 text-[color:var(--color-primary)]" />
                  <span className="truncate">{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/60 p-[var(--space-4)]">{footer}</div>
        )}
      </div>
    </aside>
  );
}
