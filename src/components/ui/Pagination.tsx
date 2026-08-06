import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/src/utils/cn";

type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  nextLabel?: string;
  previousLabel?: string;
  className?: string;
};

function pageItems(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const items: (number | "ellipsis")[] = [1];
  if (page > 3) items.push("ellipsis");
  for (let value = Math.max(2, page - 1); value <= Math.min(totalPages - 1, page + 1); value += 1) {
    items.push(value);
  }
  if (page < totalPages - 2) items.push("ellipsis");
  items.push(totalPages);
  return items;
}

export default function Pagination({
  page,
  totalPages,
  onChange,
  nextLabel = "Next",
  previousLabel = "Previous",
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className={className}>
      <ul className="flex flex-wrap items-center gap-[var(--space-2)]">
        <li>
          <button
            type="button"
            onClick={() => onChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label={previousLabel}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface-muted)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:pointer-events-none disabled:text-[color:var(--color-disabled)]",
            )}
          >
            <ChevronLeft aria-hidden="true" className="size-4 rtl:hidden" />
            <ChevronRight aria-hidden="true" className="hidden size-4 rtl:block" />
          </button>
        </li>
        {pageItems(page, totalPages).map((item, index) =>
          item === "ellipsis" ? (
            <li key={`e${index}`} className="flex h-9 items-center px-[var(--space-2)] text-[color:var(--color-text-muted)]">
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`Page ${item}`}
                className={cn(
                  "inline-flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-md)] px-[var(--space-2)] text-[var(--font-size-sm)] font-medium transition-colors duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                  item === page
                    ? "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]"
                    : "border border-[color:var(--color-border)] text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-muted)]",
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            onClick={() => onChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            aria-label={nextLabel}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface-muted)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:pointer-events-none disabled:text-[color:var(--color-disabled)]",
            )}
          >
            <ChevronLeft aria-hidden="true" className="size-4 rtl:hidden" />
            <ChevronRight aria-hidden="true" className="hidden size-4 rtl:block" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
