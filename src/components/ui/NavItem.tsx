import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/src/utils/cn";

type NavItemProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  active?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

export default function NavItem({
  active = false,
  icon,
  className = "",
  children,
  ...props
}: NavItemProps) {
  return (
    <a
      className={cn(
        "relative inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--font-size-sm)] font-medium transition-colors duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        active
          ? "bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary-hover)]"
          : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text-primary)]",
        className,
      )}
      aria-current={active ? "page" : undefined}
      {...props}
    >
      {icon && (
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      )}
      <span className="truncate">{children}</span>
    </a>
  );
}
