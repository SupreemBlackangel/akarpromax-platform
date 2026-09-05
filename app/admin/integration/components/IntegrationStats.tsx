import type { ReactNode } from "react";
import { Activity, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import Skeleton from "@/src/components/ui/Skeleton";

export type StatTone = "success" | "neutral" | "primary" | "warning" | "danger";

export type IntegrationStat = {
  key: string;
  label: string;
  /** A formatted value, or null when the data is simply not available. */
  value: string | number | null;
  tone: StatTone;
  icon: ReactNode;
  /** Small secondary line under the value. */
  hint?: string;
};

const TONE: Record<StatTone, string> = {
  success: "bg-[color:color-mix(in_oklab,var(--color-success),transparent_86%)] text-[color:var(--color-success)]",
  neutral: "bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-secondary)]",
  primary: "bg-[color:color-mix(in_oklab,var(--color-primary),transparent_86%)] text-[color:var(--color-primary)]",
  warning: "bg-[color:color-mix(in_oklab,var(--color-warning),transparent_86%)] text-[color:var(--color-warning)]",
  danger: "bg-[color:color-mix(in_oklab,var(--color-danger),transparent_86%)] text-[color:var(--color-danger)]",
};

/**
 * The summary strip above the cards. A stat whose data is not available shows
 * "لا توجد بيانات" in place of a number rather than a misleading zero.
 */
export default function IntegrationStats({ stats, loading = false }: { stats: IntegrationStat[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true" aria-label="جارٍ تحميل الملخص">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-2 h-3.5 w-24" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.key} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 transition-shadow hover:shadow-sm">
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${TONE[s.tone]}`} aria-hidden="true">{s.icon}</span>
          {s.value === null ? (
            <p className="mt-3 text-[15px] font-bold text-[color:var(--color-text-secondary)]">لا توجد بيانات</p>
          ) : (
            <p className="mt-3 text-2xl font-black leading-none text-[color:var(--color-text-primary)]">{s.value}</p>
          )}
          <p className="mt-1.5 text-xs font-semibold text-[color:var(--color-text-secondary)]">{s.label}</p>
          {s.hint && <p className="mt-0.5 text-[11px] text-[color:var(--color-text-secondary)]" dir="auto">{s.hint}</p>}
        </div>
      ))}
    </div>
  );
}

/** Ready-made icons for the four standard stats, so callers stay short. */
export const STAT_ICONS = {
  active: <CheckCircle2 className="size-[18px]" />,
  inactive: <XCircle className="size-[18px]" />,
  lastSync: <RefreshCw className="size-[18px]" />,
  system: <Activity className="size-[18px]" />,
};
