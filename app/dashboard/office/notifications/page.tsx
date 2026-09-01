"use client";

import { useCallback, useEffect, useState } from "react";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";
import { apiFetch } from "@services-client";

type DeliveryRow = Record<string, unknown> & { id: string; status: string; event_type: string; channel: string; title?: string | null; body?: string | null; created_at: string };

const STATUS_TONES: Record<string, string> = {
  queued: "bg-[var(--color-primary-soft)] text-[var(--color-primary)] dark:bg-[var(--color-primary-soft)]/40 dark:text-[var(--color-primary)]",
  delivered: "bg-emerald-100 text-[var(--color-success)] dark:bg-[var(--color-success-soft)]/40 dark:text-[var(--color-success)]",
  deferred: "bg-amber-100 text-[var(--accent)] dark:bg-amber-900/40 dark:text-[var(--accent)]",
  failed: "bg-red-100 text-[var(--color-error)] dark:bg-red-900/40 dark:text-[var(--color-error)]",
};

export default function OfficeNotificationsPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"deliveries" | "rules">("deliveries");

  const load = useCallback((controller?: AbortController) => {
    return Promise.all([
      apiFetch<{ deliveries: DeliveryRow[] }>("/api/office/v1/notifications", { signal: controller?.signal }),
      apiFetch<{ rules: Array<Record<string, unknown>> }>("/api/office/v1/notifications?view=rules", { signal: controller?.signal }),
    ])
      .then(([d, r]) => {
        if (controller?.signal.aborted) return;
        setDeliveries(d.deliveries ?? []);
        setRules(r.rules ?? []);
      })
      .catch(() => {
        if (controller?.signal.aborted) return;
      })
      .finally(() => {
        if (!controller?.signal.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller);
    return () => controller.abort();
  }, [load]);

  return (
    <OfficeWorkspaceShell activeTab="notifications">
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView("deliveries")}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            view === "deliveries" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface)] text-gray-600 dark:bg-gray-900 dark:text-gray-300 border border-gray-200 dark:border-gray-800"
          }`}
        >
          سجل التسليم
        </button>
        <button
          type="button"
          onClick={() => setView("rules")}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            view === "rules" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface)] text-gray-600 dark:bg-gray-900 dark:text-gray-300 border border-gray-200 dark:border-gray-800"
          }`}
        >
          القواعد
        </button>
      </div>

      {loading ? (
        <p className="rounded-2xl bg-[var(--color-surface)] px-5 py-10 text-center text-sm text-gray-500 dark:bg-gray-900">جارٍ التحميل…</p>
      ) : view === "deliveries" ? (
        deliveries.length === 0 ? (
          <p className="rounded-2xl bg-[var(--color-surface)] px-5 py-10 text-center text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">لا توجد تنبيهات بعد.</p>
        ) : (
          <ul className="space-y-3">
            {deliveries.map((d) => (
              <li key={d.id} className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-gray-900 dark:text-[var(--color-text-primary)]">{d.title || d.event_type}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${STATUS_TONES[d.status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
                    {d.status}
                  </span>
                </div>
                {d.body && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{d.body}</p>}
                <p className="mt-1 text-xs text-gray-400">
                  {d.channel} · {d.event_type} · {d.created_at}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : rules.length === 0 ? (
        <p className="rounded-2xl bg-[var(--color-surface)] px-5 py-10 text-center text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          لا توجد قواعد تنبيه. تُنشأ افتراضيًا لكل حدث.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[var(--color-surface)] dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-black uppercase text-gray-400 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-3 text-start">الحدث</th>
                <th className="px-4 py-3 text-start">القناة</th>
                <th className="px-4 py-3 text-start">مفعّل</th>
                <th className="px-4 py-3 text-start">ساعات الهدوء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rules.map((rule) => (
                <tr key={String(rule.id)}>
                  <td className="px-4 py-3 font-bold text-gray-800 dark:text-gray-200">{String(rule.event_type)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{String(rule.channel)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${Number(rule.enabled) === 1 ? "bg-emerald-100 text-[var(--color-success)] dark:bg-[var(--color-success-soft)]/40 dark:text-[var(--color-success)]" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {Number(rule.enabled) === 1 ? "نعم" : "لا"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {rule.quiet_start && rule.quiet_end ? `${String(rule.quiet_start)}–${String(rule.quiet_end)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OfficeWorkspaceShell>
  );
}
