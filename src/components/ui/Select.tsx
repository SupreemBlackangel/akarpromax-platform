import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/src/utils/cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  children: ReactNode;
};

export default function Select({
  label,
  hint,
  error,
  placeholder,
  className,
  id,
  children,
  ...props
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const errorId = error ? `${selectId}-error` : undefined;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {label && (
        <label htmlFor={selectId} className="text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)]">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "select-arrow h-10 w-full appearance-none rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-input)] px-[var(--space-4)] pe-[var(--space-10)] text-[var(--font-size-md)] text-[color:var(--color-text-primary)] transition-[border-color,box-shadow] duration-[var(--motion-fast)] focus:outline-none focus:shadow-[var(--shadow-focus)] focus:border-[color:var(--color-border-focus)] disabled:bg-[color:var(--color-disabled-surface)] disabled:text-[color:var(--color-disabled)]",
          error && "border-[color:var(--color-danger)]",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      {hint && (
        <span id={hintId} className="text-[var(--font-size-xs)] text-[color:var(--color-text-muted)]">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} role="alert" className="text-[var(--font-size-xs)] font-medium text-[color:var(--color-danger)]">
          {error}
        </span>
      )}
    </div>
  );
}
