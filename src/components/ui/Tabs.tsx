"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/src/utils/cn";

type TabsProps = {
  items: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  children?: ReactNode;
};

export default function Tabs({ items, activeId, onSelect, ariaLabel, className = "", children }: TabsProps) {
  const tablistId = useId();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.id === activeId);
    if (index === -1) return;
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    onSelect(items[next].id);
    document.getElementById(`${tablistId}-tab-${items[next].id}`)?.focus();
  };

  return (
    <div>
      <div
        id={tablistId}
        role="tablist"
        aria-label={ariaLabel ?? "tabs"}
        onKeyDown={onKeyDown}
        className={cn(
          "inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-[var(--space-2)]",
          className,
        )}
      >
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              id={`${tablistId}-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(item.id)}
              className={cn(
                "rounded-[var(--radius-sm)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--font-size-sm)] font-medium transition-colors duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                active
                  ? "bg-[color:var(--color-surface)] text-[color:var(--color-text-primary)] shadow-[var(--shadow-sm)]"
                  : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)]",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}

export function TabPanel({
  id,
  active,
  tabId,
  className = "",
  children,
}: {
  id: string;
  active: boolean;
  tabId?: string;
  className?: string;
  children: ReactNode;
}) {
  if (!active) return null;
  return (
    <div
      id={id}
      role="tabpanel"
      aria-labelledby={tabId}
      tabIndex={0}
      className={cn("pt-[var(--space-6)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]", className)}
    >
      {children}
    </div>
  );
}
