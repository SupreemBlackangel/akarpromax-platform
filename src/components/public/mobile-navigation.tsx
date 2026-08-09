"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import type { Translation, ViewerContext } from "@/src/types/site";
import type { PublicNavItem } from "@/src/config/public-navigation";
import { groupPublicNav, isNavItemActive } from "@/src/config/public-navigation";
import NavItem from "@/src/components/ui/NavItem";
import { trapFocusKeydown } from "@/src/components/ui/focus-trap";

/**
 * Mobile navigation side sheet. Follows Dialog semantics: focus trap, Escape,
 * scroll lock, restore focus, close on route change, aria-modal + label.
 * Direction-aware (sheet opens on the inline-start side, RTL or LTR).
 */
type MobileNavigationProps = {
  open: boolean;
  onClose: () => void;
  items: PublicNavItem[];
  labels: Translation;
  currentPath: string;
  viewer: ViewerContext;
  onLogin: () => void;
  onLogout?: () => void;
  searchHref?: string;
};

export default function MobileNavigation({
  open,
  onClose,
  items,
  labels,
  currentPath,
  viewer,
  onLogin,
  onLogout,
  searchHref,
}: MobileNavigationProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const prevPathRef = useRef(currentPath);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (panelRef.current) trapFocusKeydown(event, panelRef.current);
    },
    [onClose],
  );

  useEffect(() => {
    if (prevPathRef.current !== currentPath) {
      if (open) onClose();
      prevPathRef.current = currentPath;
    }
  }, [currentPath, open, onClose]);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previouslyFocusedRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const sections = groupPublicNav(items);

  const account: ReactNode = viewer.authenticated ? (
    <>
      <span className="truncate text-[var(--font-size-sm)] font-semibold text-[color:var(--color-text-primary)]">
        {viewer.displayName || viewer.email}
      </span>
      {onLogout ? (
        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-transparent px-[var(--space-4)] py-[var(--space-3)] text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface-muted)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        >
          {labels.logout}
        </button>
      ) : (
        <a
          href="/account/security"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-transparent px-[var(--space-4)] py-[var(--space-3)] text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface-muted)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        >
          {labels.navAccount}
        </a>
      )}
    </>
  ) : (
    <>
      <button
        type="button"
        onClick={onLogin}
        className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-transparent px-[var(--space-4)] py-[var(--space-3)] text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface-muted)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        {labels.login}
      </button>
      <button
        type="button"
        onClick={onLogin}
        className="w-full rounded-[var(--radius-md)] bg-[color:var(--color-primary)] px-[var(--space-4)] py-[var(--space-3)] text-[var(--font-size-sm)] font-semibold text-[color:var(--color-primary-foreground)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-primary-hover)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        {labels.register}
      </button>
    </>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-[var(--layer-overlay)] bg-[color:var(--color-overlay)] md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-block-0 inset-inline-start-0 z-[var(--layer-dialog)] flex w-full max-w-[320px] flex-col overflow-y-auto border-e border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-overlay)] focus:outline-none md:hidden"
      >
        <div className="flex items-center justify-between gap-[var(--space-4)] border-b border-[color:var(--color-border)] p-[var(--space-5)]">
          <h2 id={titleId} className="text-[var(--font-size-lg)] font-semibold text-[color:var(--color-text-primary)]">
            {labels.mainNavAria}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.closeMenu}
            className="shrink-0 rounded-[var(--radius-sm)] p-[var(--space-2)] text-[color:var(--color-text-muted)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-[var(--space-5)] p-[var(--space-5)]">
          {sections.map((section) => (
            <div key={section.key}>
              <p className="mb-[var(--space-2)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-muted)]">
                {labels[section.labelKey]}
              </p>
              <nav aria-label={labels[section.labelKey]} className="flex flex-col gap-[var(--space-2)]">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavItem
                      key={item.key}
                      href={item.href}
                      active={isNavItemActive(item, currentPath)}
                      icon={Icon ? <Icon aria-hidden="true" className="size-4" /> : undefined}
                      title={labels[item.labelKey]}
                      aria-label={labels[item.labelKey]}
                      className="min-h-11"
                    >
                      {labels[item.labelKey]}
                    </NavItem>
                  );
                })}
              </nav>
            </div>
          ))}
          {searchHref && (
            <a
              href={searchHref}
              className="inline-flex min-h-11 items-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-muted)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              <span aria-hidden="true">🔍</span>
              <span>{labels.searchAria}</span>
            </a>
          )}
        </div>
        <div className="mt-auto flex flex-col gap-[var(--space-3)] border-t border-[color:var(--color-border)] p-[var(--space-5)]">
          {account}
        </div>
      </div>
    </>
  );
}
