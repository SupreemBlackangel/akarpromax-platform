import { useId, type ReactNode } from "react";
import { cn } from "@/src/utils/cn";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  children?: ReactNode;
};

export default function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  className = "",
  "aria-label": ariaLabel,
  children,
}: SwitchProps) {
  const autoId = useId();
  const switchId = `switch-${autoId}`;

  const control = (
    <span
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={label && !ariaLabel ? switchId : undefined}
      tabIndex={disabled ? -1 : 0}
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => !disabled && onCheckedChange(!checked)}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onCheckedChange(!checked);
        }
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-[var(--radius-pill)] border border-transparent transition-colors duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "bg-[color:var(--color-primary)]" : "bg-[color:var(--color-border-strong)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none block size-[18px] rounded-[var(--radius-pill)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] transition-transform duration-[var(--motion-fast)]",
          "translate-x-0.5 rtl:-translate-x-0.5",
          "data-[state=checked]:translate-x-[calc(100%-2px)] rtl:data-[state=checked]:-translate-x-[calc(100%-2px)]",
        )}
      />
    </span>
  );

  if (!label) return control;

  return (
    <label htmlFor={switchId} className={`inline-flex items-center gap-[var(--space-3)] ${disabled ? "cursor-not-allowed" : "cursor-pointer"} ${className}`.trim()}>
      <span id={switchId} className="text-[var(--font-size-md)] text-[color:var(--color-text-primary)]">
        {label}
      </span>
      {control}
      {children}
    </label>
  );
}
