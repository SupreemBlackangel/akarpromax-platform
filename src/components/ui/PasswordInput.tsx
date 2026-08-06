import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/src/utils/cn";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  hint?: string;
  error?: string;
  showToggle?: boolean;
  /** Accessible labels for the visibility toggle. Required when showToggle is true (primitives ship no copy). */
  showAriaLabel?: string;
  hideAriaLabel?: string;
};

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { label, hint, error, showToggle = true, showAriaLabel, hideAriaLabel, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {label && (
        <label htmlFor={inputId} className="text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)]">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? "text" : "password"}
          className={cn(
            "h-10 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-input)] px-[var(--space-4)] pe-[var(--space-10)] text-[var(--font-size-md)] text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--motion-fast)] focus:outline-none focus:shadow-[var(--shadow-focus)] focus:border-[color:var(--color-border-focus)] disabled:bg-[color:var(--color-disabled-surface)] disabled:text-[color:var(--color-disabled)]",
            error && "border-[color:var(--color-danger)]",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? hideAriaLabel : showAriaLabel}
            aria-pressed={visible}
            className="absolute end-[var(--space-3)] top-1/2 -translate-y-1/2 rounded-[var(--radius-sm)] p-1 text-[color:var(--color-text-muted)] transition-colors duration-[var(--motion-fast)] hover:text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
          </button>
        )}
      </div>
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
});

export default PasswordInput;
