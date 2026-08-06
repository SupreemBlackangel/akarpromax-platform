import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/src/utils/cn";

type BadgeVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "neutral" | "accent";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
};

const VARIANTS: Record<BadgeVariant, string> = {
  primary: "bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary-hover)]",
  secondary: "bg-[color:var(--color-secondary)] text-[color:var(--color-secondary-foreground)]",
  success: "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]",
  warning: "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]",
  danger: "bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)]",
  info: "bg-[color:var(--color-info-soft)] text-[color:var(--color-info)]",
  neutral: "bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-secondary)]",
  accent: "bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]",
};

export default function Badge({
  variant = "primary",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-1)] text-[var(--font-size-xs)] font-semibold leading-none",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
