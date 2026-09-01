import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/src/utils/cn";

/**
 * Token-based table primitives. One vocabulary for every data table so headers,
 * rows, borders and hover states stay consistent and survive light/dark via
 * var(--color-*). Horizontal overflow is owned by <Table> so wide tables never
 * push the page. Compose: Table > THead > Row > HeadCell ; TBody > Row > Cell.
 */

export function Table({ className = "", children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <table className={cn("w-full border-collapse text-start text-[var(--font-size-sm)]", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("bg-[var(--color-surface-muted)]", className)} {...props}>
      {children}
    </thead>
  );
}

export function TBody({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props}>{children}</tbody>;
}

type RowProps = HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean };

export function Row({ className = "", interactive = false, children, ...props }: RowProps) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--color-border)] last:border-b-0",
        interactive && "cursor-pointer transition-colors hover:bg-[var(--color-surface-muted)]",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function HeadCell({ className = "", children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-[var(--space-4)] py-[var(--space-3)] text-start text-[var(--font-size-xs)] font-bold uppercase tracking-wide text-[var(--color-text-muted)] whitespace-nowrap",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Cell({ className = "", children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-[var(--space-4)] py-[var(--space-3)] align-middle text-[var(--color-text-secondary)]",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/** Full-width empty/placeholder row spanning all columns. */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-[var(--space-4)] py-[var(--space-12)] text-center text-[var(--font-size-sm)] text-[var(--color-text-muted)]">
        {children}
      </td>
    </tr>
  );
}
