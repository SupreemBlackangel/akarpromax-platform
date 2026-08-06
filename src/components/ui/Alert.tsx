import type { HTMLAttributes, ReactNode } from "react";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/src/utils/cn";

type AlertVariant = "info" | "success" | "warning" | "danger";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
  title?: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

const VARIANT_STYLES: Record<AlertVariant, { container: string; iconColor: string }> = {
  info: {
    container: "border-[color:var(--color-info)]/30 bg-[color:var(--color-info-soft)]",
    iconColor: "text-[color:var(--color-info)]",
  },
  success: {
    container: "border-[color:var(--color-success)]/30 bg-[color:var(--color-success-soft)]",
    iconColor: "text-[color:var(--color-success)]",
  },
  warning: {
    container: "border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning-soft)]",
    iconColor: "text-[color:var(--color-warning)]",
  },
  danger: {
    container: "border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger-soft)]",
    iconColor: "text-[color:var(--color-danger)]",
  },
};

export default function Alert({
  variant = "info",
  title,
  icon,
  className = "",
  children,
  ...props
}: AlertProps) {
  const styles = VARIANT_STYLES[variant];
  return (
    <div
      role={variant === "danger" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-[var(--space-3)] rounded-[var(--radius-md)] border p-[var(--space-4)]",
        styles.container,
        className,
      )}
      {...props}
    >
      <span className={cn("mt-[2px] shrink-0", styles.iconColor)} aria-hidden="true">
        {icon ??
          (variant === "danger" ? (
            <CircleAlert className="size-4" />
          ) : variant === "warning" ? (
            <TriangleAlert className="size-4" />
          ) : (
            <Info className="size-4" />
          ))}
      </span>
      <div className="flex flex-col gap-[var(--space-2)] text-[var(--font-size-sm)] text-[color:var(--color-text-primary)]">
        {title && <span className="font-semibold">{title}</span>}
        {children}
      </div>
    </div>
  );
}
