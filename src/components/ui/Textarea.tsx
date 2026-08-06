import { useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/src/utils/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

const controlClasses =
  "w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-input)] px-[var(--space-4)] py-[var(--space-3)] text-[var(--font-size-md)] text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--motion-fast)] focus:outline-none focus:shadow-[var(--shadow-focus)] focus:border-[color:var(--color-border-focus)] disabled:bg-[color:var(--color-disabled-surface)] disabled:text-[color:var(--color-disabled)]";

export default function Textarea({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: TextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  const errorId = error ? `${textareaId}-error` : undefined;
  const hintId = hint ? `${textareaId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {label && (
        <label htmlFor={textareaId} className="text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)]">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          controlClasses,
          error && "border-[color:var(--color-danger)]",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
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
