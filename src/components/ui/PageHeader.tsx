import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
  id?: string;
};

export default function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className = "",
  id,
}: PageHeaderProps) {
  // An eyebrow that repeats the title is the title said twice in two sizes.
  // Several pages passed the same string to both, so the heading arrived with
  // its own name printed above it in small caps.
  const showEyebrow = Boolean(eyebrow) && eyebrow!.trim().toLowerCase() !== title.trim().toLowerCase();

  return (
    <header className={`flex flex-col gap-[var(--space-4)] ${className}`.trim()}>
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-4)]">
        <div className="flex min-w-0 flex-col gap-[var(--space-2)]">
          {showEyebrow && (
            <span className="text-[var(--text-xs)] font-semibold uppercase tracking-wide text-[color:var(--color-primary-hover)]">
              {eyebrow}
            </span>
          )}
          {/* 26px on a phone, 32px on a desktop, and nothing in between to
              tune: a 36px heading on a 390px screen takes three lines before
              the page has said anything. */}
          <h1
            id={id}
            className="text-[clamp(26px,4.4vw,32px)] font-bold leading-[var(--line-height-tight)] text-[color:var(--color-text-primary)]"
          >
            {title}
          </h1>
          {description && (
            <p className="max-w-prose text-[var(--text-sm)] text-[color:var(--color-text-secondary)]">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-[var(--space-3)]">{actions}</div>}
      </div>
    </header>
  );
}
