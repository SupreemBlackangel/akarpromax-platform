import type { ReactNode } from "react";
import { cn } from "@/src/utils/cn";

type AdVariant = "horizontal" | "vertical" | "leaderboard" | "box";

type AdFrameProps = {
  label: string;
  variant?: AdVariant;
  className?: string;
  children?: ReactNode;
};

const VARIANTS: Record<AdVariant, { frame: string; body: string }> = {
  horizontal: {
    frame: "",
    body: "flex items-center justify-center gap-[var(--space-4)]",
  },
  vertical: {
    frame: "max-w-[300px]",
    body: "flex min-h-[250px] flex-col items-center justify-center gap-[var(--space-4)]",
  },
  leaderboard: {
    frame: "",
    body: "flex min-h-[90px] items-center justify-center gap-[var(--space-4)]",
  },
  box: {
    frame: "max-w-[360px]",
    body: "flex min-h-[220px] flex-col items-center justify-center gap-[var(--space-4)]",
  },
};

export default function AdFrame({
  label,
  variant = "horizontal",
  className = "",
  children,
}: AdFrameProps) {
  const styles = VARIANTS[variant];
  return (
    <aside
      aria-label={label}
      className={cn(
        "overflow-hidden rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-muted)]/60",
        styles.frame,
        className,
      )}
    >
      <div className={cn("p-[var(--space-6)]", styles.body)}>{children}</div>
      <div className="flex items-center justify-center gap-[var(--space-2)] border-t border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-[var(--space-3)] py-[var(--space-2)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">{label}</span>
      </div>
    </aside>
  );
}
