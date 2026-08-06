import type { InputHTMLAttributes } from "react";

type InputVariant = "default" | "search";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  variant?: InputVariant;
  label?: string;
  error?: string;
};

const variantClasses: Record<InputVariant, string> = {
  default: "input-default",
  search: "input-search",
};

export default function Input({
  variant = "default",
  label,
  error,
  className,
  id,
  ...props
}: Props) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const inputClasses = [
    "shared-input",
    variantClasses[variant],
    error ? "input-error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const errorId = inputId ? `${inputId}-error` : undefined;

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={inputClasses}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span id={errorId} role="alert" className="input-error-text">
          {error}
        </span>
      )}
    </div>
  );
}
