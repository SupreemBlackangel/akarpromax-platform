import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/src/utils/cn";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  label?: string;
  error?: string;
  hint?: string;
};

export default function Checkbox({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: CheckboxProps) {
  const autoId = useId();
  const checkboxId = id ?? autoId;
  const errorId = error ? `${checkboxId}-error` : undefined;
  const hintId = hint ? `${checkboxId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <label
        htmlFor={checkboxId}
        className={cn(
          "inline-flex items-start gap-[var(--space-3)] text-[var(--font-size-md)] text-[color:var(--color-text-primary)]",
          props.disabled && "cursor-not-allowed text-[color:var(--color-disabled)]",
        )}
      >
        <input
          id={checkboxId}
          type="checkbox"
          className={cn(
            "mt-[2px] size-[18px] shrink-0 cursor-pointer appearance-none rounded-[var(--radius-sm)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-input)] transition-[border-color,box-shadow,background-color] duration-[var(--motion-fast)] focus:outline-none focus:shadow-[var(--shadow-focus)] checked:border-[color:var(--color-primary)] checked:bg-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-disabled-surface)]",
            "checked:bg-[url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 13 4 4L19 7'/%3E%3C/svg%3E\")] checked:bg-center checked:bg-no-repeat",
            error && "border-[color:var(--color-danger)]",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {label && <span className="select-none leading-normal">{label}</span>}
      </label>
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
