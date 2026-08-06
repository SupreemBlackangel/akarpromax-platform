"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { trapFocusKeydown } from "./focus-trap";
import { cn } from "@/src/utils/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  closeLabel?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
};

const SIZES: Record<NonNullable<DialogProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export default function Dialog({
  open,
  onClose,
  title,
  description,
  closeLabel = "Close",
  size = "md",
  className = "",
  children,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (dialogRef.current) trapFocusKeydown(event, dialogRef.current);
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previouslyFocusedRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--layer-overlay)] flex items-center justify-center p-[var(--space-5)] bg-[color:var(--color-overlay)]"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "w-full overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-overlay)]",
          SIZES[size],
          className,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-[var(--space-4)] border-b border-[color:var(--color-border)] p-[var(--space-6)]">
            <div className="flex flex-col gap-[var(--space-2)]">
              {title && (
                <h2 id={titleId} className="text-[var(--font-size-lg)] font-semibold text-[color:var(--color-text-primary)]">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descriptionId} className="text-[var(--font-size-sm)] text-[color:var(--color-text-muted)]">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="shrink-0 rounded-[var(--radius-sm)] p-[var(--space-2)] text-[color:var(--color-text-muted)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}
        <div className="p-[var(--space-6)]">{children}</div>
      </div>
    </div>
  );
}
