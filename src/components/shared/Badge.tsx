import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";
type BadgeSize = "sm" | "md";

type Props = {
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  children: ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "badge-default",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  info: "badge-info",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "badge-sm",
  md: "badge-md",
};

export default function Badge({
  variant = "default",
  size = "md",
  className,
  children,
}: Props) {
  const classes = [
    "shared-badge",
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
