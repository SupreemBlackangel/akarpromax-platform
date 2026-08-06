import type { ReactNode } from "react";
import { cn } from "@/src/utils/cn";

type InputGroupProps = {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

export default function InputGroup({ label, hint, error, className = "", children }: InputGroupProps) {
  return (
    <div className={cn("flex flex-col gap-[var(--space-2)]", className)}>
      {label && (
        <span className="text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)]">{label}</span>
      )}
      <div className="flex items-stretch overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-input)] transition-[border-color,box-shadow] duration-[var(--motion-fast)] focus-within:border-[color:var(--color-border-focus)] focus-within:shadow-[var(--shadow-focus)]">
        {children}
      </div>
      {hint && <span className="text-[var(--font-size-xs)] text-[color:var(--color-text-muted)]">{hint}</span>}
      {error && (
        <span role="alert" className="text-[var(--font-size-xs)] font-medium text-[color:var(--color-danger)]">
          {error}
        </span>
      )}
    </div>
  );
}

export function InputGroupAddon({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center border-e border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-muted)] px-[var(--space-4)] text-[var(--font-size-sm)] text-[color:var(--color-text-muted)] last:border-e-0 last:border-s", className)}>
      {children}
    </span>
  );
}

export function InputGroupInput({ className = "", children }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 flex-1", className)}>{children}</div>;
}
