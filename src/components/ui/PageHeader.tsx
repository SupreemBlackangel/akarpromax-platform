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
  return (
    <header className={`flex flex-col gap-[var(--space-4)] ${className}`.trim()}>
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-4)]">
        <div className="flex min-w-0 flex-col gap-[var(--space-2)]">
          {eyebrow && (
            <span className="text-[var(--font-size-xs)] font-semibold uppercase tracking-wide text-[color:var(--color-primary-hover)]">
              {eyebrow}
            </span>
          )}
          <h1 id={id} className="text-[var(--font-size-2xl)] font-bold leading-[var(--line-height-tight)] text-[color:var(--color-text-primary)]">
            {title}
          </h1>
          {description && (
            <p className="max-w-prose text-[var(--font-size-md)] text-[color:var(--color-text-secondary)]">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-[var(--space-3)]">{actions}</div>}
      </div>
    </header>
  );
}
