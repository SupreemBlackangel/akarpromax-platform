"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import Button from "@/src/components/ui/Button";
import Skeleton from "@/src/components/ui/Skeleton";
import IntegrationStatusBadge, { type IntegrationStatus } from "./IntegrationStatusBadge";

export type IntegrationCardProps = {
  /** The service's mark — an icon or a logo image — rendered inside a soft square. */
  icon: ReactNode;
  name: string;
  description: string;
  status: IntegrationStatus;
  /** A formatted time, or null for "لم تتم المزامنة بعد". */
  lastSync: string | null;
  /** Brief facts: linked account, environment, version… shown as label/value pairs. */
  meta?: { label: string; value: string; dir?: "ltr" | "rtl" }[];
  /** Where "إعداد" takes the admin — an existing section on this page or another admin route. */
  setupHref?: string;
  /** Secondary information, kept out of the card face and revealed on demand. */
  details?: ReactNode;
  /** Optional in-card notice (a short success or error line). */
  notice?: { tone: "success" | "danger"; text: string } | null;
};

/**
 * One integration as a card: mark, name, status, last sync, a few facts, and
 * the actions that have real behaviour behind them. Secondary detail lives in
 * a collapsible section so the card face stays scannable.
 */
export default function IntegrationCard({ icon, name, description, status, lastSync, meta = [], setupHref, details, notice }: IntegrationCardProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <article
      className="group flex flex-col rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(15,23,42,.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,.08)] focus-within:ring-2 focus-within:ring-[color:var(--color-primary)]/40"
      aria-label={name}
    >
      <header className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[color:color-mix(in_oklab,var(--color-primary),transparent_88%)] text-[color:var(--color-primary)]" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="truncate text-[15px] font-black text-[color:var(--color-text-primary)]">{name}</h3>
            <IntegrationStatusBadge status={status} />
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-[color:var(--color-text-secondary)]">{description}</p>
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="col-span-2 flex items-center justify-between rounded-lg bg-[color:var(--color-surface-muted)] px-3 py-2">
          <dt className="font-semibold text-[color:var(--color-text-secondary)]">آخر مزامنة</dt>
          <dd className="font-bold text-[color:var(--color-text-primary)]" dir="ltr">{lastSync ?? <span className="text-[color:var(--color-text-secondary)]" dir="rtl">لم تتم المزامنة بعد</span>}</dd>
        </div>
        {meta.map((m) => (
          <div key={m.label} className="min-w-0">
            <dt className="text-[11px] text-[color:var(--color-text-secondary)]">{m.label}</dt>
            <dd className="truncate font-semibold text-[color:var(--color-text-primary)]" dir={m.dir ?? "auto"} title={m.value}>{m.value}</dd>
          </div>
        ))}
      </dl>

      {notice && (
        <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${notice.tone === "success" ? "bg-[color:color-mix(in_oklab,var(--color-success),transparent_88%)] text-[color:var(--color-success)]" : "bg-[color:color-mix(in_oklab,var(--color-danger),transparent_88%)] text-[color:var(--color-danger)]"}`}>
          {notice.text}
        </p>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-[color:var(--color-border)] pt-3">
        {setupHref && (
          <Button variant="outline" size="sm" onClick={() => { if (typeof window !== "undefined") window.location.assign(setupHref); }}>
            <Settings2 className="size-4" aria-hidden="true" />
            إعداد
          </Button>
        )}
        {details && (
          <Button variant="ghost" size="sm" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)} className="ms-auto">
            التفاصيل
            <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </Button>
        )}
      </footer>
      {details && open && (
        <div id={panelId} className="mt-3 rounded-xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-3 text-xs">
          {details}
        </div>
      )}
    </article>
  );
}

/** The loading twin of the card, sized to the same footprint so the grid does not jump. */
export function IntegrationCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5" aria-hidden="true">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-3.5 w-full" />
          <Skeleton className="mt-1.5 h-3.5 w-4/5" />
        </div>
      </div>
      <Skeleton className="mt-4 h-8 w-full rounded-lg" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    </div>
  );
}
