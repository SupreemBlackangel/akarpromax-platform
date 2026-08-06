import { cloneElement, isValidElement, useId, type ReactNode } from "react";

type RadioGroupProps = {
  name: string;
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

export default function RadioGroup({
  name,
  label,
  error,
  hint,
  className = "",
  children,
}: RadioGroupProps) {
  const autoId = useId();
  const groupId = `${name}-${autoId}`;
  const errorId = error ? `${groupId}-error` : undefined;
  const hintId = hint ? `${groupId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-[var(--space-2)]" role="radiogroup" aria-labelledby={label ? `${groupId}-label` : undefined} aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}>
      {label && (
        <span id={`${groupId}-label`} className="text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)]">
          {label}
        </span>
      )}
      <div className={`flex flex-col gap-[var(--space-3)] ${className}`.trim()}>
        {isValidElement(children)
          ? cloneElement(children, { name } as never)
          : children}
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
}

type RadioOptionProps = {
  value: string;
  label: string;
  name?: string;
  disabled?: boolean;
  className?: string;
};

export function RadioOption({ value, label, name, disabled, className = "" }: RadioOptionProps) {
  const autoId = useId();
  const optionId = `radio-${value}-${autoId}`;

  return (
    <label
      htmlFor={optionId}
      className={`inline-flex cursor-pointer items-center gap-[var(--space-3)] text-[var(--font-size-md)] text-[color:var(--color-text-primary)] ${disabled ? "cursor-not-allowed text-[color:var(--color-disabled)]" : ""} ${className}`.trim()}
    >
      <input
        id={optionId}
        type="radio"
        name={name}
        value={value}
        disabled={disabled}
        className="size-[18px] shrink-0 cursor-pointer appearance-none rounded-[var(--radius-pill)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-input)] transition-[border-color,box-shadow,background-color] duration-[var(--motion-fast)] focus:outline-none focus:shadow-[var(--shadow-focus)] checked:border-[6px] checked:border-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-disabled-surface)]"
      />
      <span className="select-none leading-normal">{label}</span>
    </label>
  );
}
