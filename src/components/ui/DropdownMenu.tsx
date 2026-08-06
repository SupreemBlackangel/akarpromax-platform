"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/src/utils/cn";

type DropdownMenuProps = {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  menuLabel?: string;
  className?: string;
};

export default function DropdownMenu({
  trigger,
  children,
  align = "end",
  menuLabel,
  className = "",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`.trim()}>
      <span
        role="button"
        aria-haspopup="menu"
        aria-expanded={open}
        tabIndex={0}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex focus-visible:outline-none focus-visible:rounded-[var(--radius-sm)] focus-visible:shadow-[var(--shadow-focus)]"
      >
        {trigger}
      </span>
      {open && (
        <div
          role="menu"
          aria-label={menuLabel}
          className={cn(
            "absolute z-[var(--layer-dropdown)] mt-[var(--space-2)] min-w-44 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] p-[var(--space-2)] shadow-[var(--shadow-lg)]",
            align === "start" ? "start-0" : "end-0",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

type DropdownMenuItemProps = {
  onSelect?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

export function DropdownMenuItem({ onSelect, disabled, className = "", children }: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      tabIndex={-1}
      onClick={onSelect}
      className={cn(
        "block w-full rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-2)] text-start text-[var(--font-size-sm)] text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface-muted)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:pointer-events-none disabled:text-[color:var(--color-disabled)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DropdownMenuDivider({ className = "" }: { className?: string }) {
  return <div role="separator" aria-hidden="true" className={`my-[var(--space-2)] h-px bg-[color:var(--color-border)] ${className}`.trim()} />;
}
