import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";

type Crumb = {
  label: string;
  href?: string;
  current?: boolean;
};

type BreadcrumbsProps = {
  items: Crumb[];
  homeLabel?: string;
  ariaLabel?: string;
  className?: string;
  children?: ReactNode;
};

export default function Breadcrumbs({ items, homeLabel, ariaLabel, className = "", children }: BreadcrumbsProps) {
  return (
    <nav aria-label={ariaLabel ?? homeLabel ?? "Breadcrumb"} className={className}>
      <ol className="flex flex-wrap items-center gap-[var(--space-2)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="inline-flex items-center gap-[var(--space-2)]">
              {isLast ? (
                <span
                  aria-current={item.current ? "page" : undefined}
                  className="font-medium text-[color:var(--color-text-primary)]"
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="inline-flex items-center gap-[var(--space-2)] text-[color:var(--color-text-muted)] transition-colors duration-[var(--motion-fast)] hover:text-[color:var(--color-primary)] focus-visible:outline-none focus-visible:rounded-[var(--radius-sm)] focus-visible:shadow-[var(--shadow-focus)]"
                >
                  {index === 0 && homeLabel ? (
                    <Home aria-hidden="true" className="size-4" />
                  ) : null}
                  {item.label}
                </a>
              )}
              {!isLast && (
                <ChevronRight aria-hidden="true" className="size-4 text-[color:var(--color-text-muted)] rtl:hidden" />
              )}
              {!isLast && (
                <ChevronLeft aria-hidden="true" className="hidden size-4 text-[color:var(--color-text-muted)] rtl:block" />
              )}
            </li>
          );
        })}
      </ol>
      {children}
    </nav>
  );
}
