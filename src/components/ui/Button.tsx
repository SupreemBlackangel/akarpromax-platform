import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/src/utils/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";
type ButtonIconPlacement = "start" | "end";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconPlacement?: ButtonIconPlacement;
  icon?: ReactNode;
  /** Accessible label shown when size="icon" or when children are hidden while loading. */
  "aria-label"?: string;
};

const base = "inline-flex select-none items-center justify-center gap-[var(--space-2)] whitespace-nowrap rounded-[var(--radius-md)] font-medium leading-none transition-[background-color,box-shadow,color,border-color,opacity] duration-[var(--motion-fast)] ease-[var(--easing-standard)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:pointer-events-none disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] hover:bg-[color:var(--color-primary-hover)] active:bg-[color:var(--color-primary-active)]",
  secondary: "bg-[color:var(--color-secondary)] text-[color:var(--color-secondary-foreground)] hover:bg-[color:var(--color-secondary-hover)]",
  outline: "border border-[color:var(--color-border-strong)] bg-transparent text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-muted)]",
  ghost: "bg-transparent text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-muted)]",
  danger: "bg-[color:var(--color-danger)] text-[color:var(--color-danger-foreground)] hover:opacity-90",
  accent: "bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)] hover:brightness-105",
};

const sizes: Record<ButtonSize, string> = {
  xs: "h-6 px-[var(--space-3)] text-[var(--font-size-xs)]",
  sm: "h-8 px-[var(--space-4)] text-[var(--font-size-sm)]",
  md: "h-10 px-[var(--space-5)] text-[var(--font-size-md)]",
  lg: "h-12 px-[var(--space-8)] text-[var(--font-size-lg)]",
  icon: "h-9 w-9",
};

function Loader() {
  return (
    <span aria-hidden="true" className="inline-block size-4 animate-spin rounded-[var(--radius-pill)] border-2 border-current border-t-transparent" />
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    iconPlacement = "start",
    icon,
    className,
    children,
    disabled,
    type = "button",
    "aria-label": ariaLabel,
    ...props
  },
  ref,
) {
  const isIconOnly = size === "icon" || (!!icon && !children);

  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading ? true : undefined}
      aria-label={ariaLabel}
      {...props}
    >
      {loading ? (
        <>
          <Loader />
          {children ? <span aria-hidden="true">{children}</span> : null}
        </>
      ) : (
        <>
          {icon && !isIconOnly && iconPlacement === "start" && <span aria-hidden="true">{icon}</span>}
          {children}
          {icon && !isIconOnly && iconPlacement === "end" && <span aria-hidden="true">{icon}</span>}
          {isIconOnly && icon ? <span aria-hidden="true">{icon}</span> : null}
        </>
      )}
      {isIconOnly && !children && !loading && (
        <span className="sr-only">{ariaLabel ?? "Icon button"}</span>
      )}
    </button>
  );
});

export default Button;
export type { ButtonProps };
