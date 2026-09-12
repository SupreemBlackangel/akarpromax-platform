import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/src/utils/cn";

/**
 * Nothing here, said once and the same way everywhere.
 *
 * Sixteen screens drew this by hand as an emoji at `text-5xl` above a heading,
 * and the emoji was the only picture: 🔒 for a permission, ⚠️ for a failure,
 * 🏚️ for a listing that is gone, 🧑‍💼 for a professional. An emoji renders as
 * whatever the reader's operating system decides — a different drawing, a
 * different colour, sometimes a tofu box — so the one image in an otherwise
 * empty screen was the one thing the design did not control. It is also read
 * aloud by a screen reader as its CLDR name ("locked", "house with cracks"),
 * which is noise in front of a heading that already says the thing.
 *
 * A lucide icon in a soft square instead: one size, one radius, one tint, and
 * `aria-hidden` because the heading is the message.
 */
export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** The one thing to do about it. */
  action?: ReactNode;
  /** A quieter footnote below the action — who to ask, which permission. */
  hint?: ReactNode;
  /** `danger` for a failure, `default` for an absence. */
  tone?: "default" | "danger";
  className?: string;
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  hint,
  tone = "default",
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("mx-auto flex max-w-sm flex-col items-center px-[var(--space-4)] py-[var(--space-8)] text-center", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "mb-[var(--space-4)] grid size-14 shrink-0 place-items-center rounded-[var(--radius-card)]",
          tone === "danger"
            ? "bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)]"
            : "bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]",
        )}
      >
        <Icon size={26} strokeWidth={1.75} />
      </span>
      <h2 className="font-[family-name:var(--font-heading-stack)] text-[var(--text-md)] font-bold text-[color:var(--color-text-primary)]">
        {title}
      </h2>
      {description ? (
        <p className="mt-[var(--space-2)] text-[var(--text-sm)] leading-[var(--leading-md)] text-[color:var(--color-text-secondary)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-[var(--space-5)] flex flex-wrap items-center justify-center gap-[var(--space-2)]">{action}</div> : null}
      {hint ? <p className="mt-[var(--space-3)] text-[var(--text-xs)] text-[color:var(--color-text-muted)]">{hint}</p> : null}
    </div>
  );
}
