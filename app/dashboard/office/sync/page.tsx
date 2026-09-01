"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";
import { apiFetch } from "@services-client";

type SyncRow = Record<string, unknown> & { id: string; status: string; operation_type: string; entity_id?: string | null; attempts: number; conflict_reason?: string | null; client_updated_at?: string | null; created_at: string };

const STATUS_TONES: Record<string, string> = {
  synced: "bg-emerald-100 text-[var(--color-success)] dark:bg-[var(--color-success-soft)]/40 dark:text-[var(--color-success)]",
  conflict: "bg-red-100 text-[var(--color-error)] dark:bg-red-900/40 dark:text-[var(--color-error)]",
  failed: "bg-red-100 text-[var(--color-error)] dark:bg-red-900/40 dark:text-[var(--color-error)]",
  retrying: "bg-amber-100 text-[var(--accent)] dark:bg-amber-900/40 dark:text-[var(--accent)]",
  dead_letter: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  queued: "bg-[var(--color-primary-soft)] text-[var(--color-primary)] dark:bg-[var(--color-primary-soft)]/40 dark:text-[var(--color-primary)]",
};

export default function OfficeSyncPage() {
  return (
    <Suspense>
      <OfficeSyncPageInner />
    </Suspense>
  );
}

function OfficeSyncPageInner() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? undefined;
  const [operations, setOperations] = useState<SyncRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    (controller?: AbortController) => {
      const url = statusFilter
        ? `/api/office/v1/sync?action=operations&status=${encodeURIComponent(statusFilter)}`
        : "/api/office/v1/sync?action=operations";
      return apiFetch<{ operations: SyncRow[] }>(url, { signal: controller?.signal })
        .then((data) => {
          if (!controller?.signal.aborted) setOperations(data.operations ?? []);
        })
        .catch(() => {
          if (controller?.signal.aborted) return;
        })
        .finally(() => {
          if (!controller?.signal.aborted) setLoading(false);
        });
    },
    [statusFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller);
    return () => controller.abort();
  }, [load]);

  const retry = async () => {
    try {
      await apiFetch("/api/office/v1/sync?action=retry", { method: "POST" });
      void load();
    } catch {
      /* ignore */
    }
  };

  return (
    <OfficeWorkspaceShell activeTab="sync">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-black text-gray-900 dark:text-[var(--color-text-primary)]">عمليات المزامنة</h2>
        <button type="button" onClick={() => void retry()} className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-black text-white hover:bg-[var(--color-primary-hover)]">
          إعادة محاولة الفاشلة
        </button>
      </div>

      {loading ? (
        <p className="rounded-2xl bg-[var(--color-surface)] px-5 py-10 text-center text-sm text-gray-500 dark:bg-gray-900">جارٍ التحميل…</p>
      ) : operations.length === 0 ? (
        <p className="rounded-2xl bg-[var(--color-surface)] px-5 py-10 text-center text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          لا توجد عمليات مزامنة بعد. سجّلها من تطبيق المكتب عبر POST /api/office/v1/sync.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[var(--color-surface)] dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-black uppercase text-gray-400 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-3 text-start">العملية</th>
                <th className="px-4 py-3 text-start">الحالة</th>
                <th className="px-4 py-3 text-start">المحاولات</th>
                <th className="px-4 py-3 text-start">التعارض</th>
                <th className="px-4 py-3 text-start">الوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {operations.map((op) => (
                <tr key={op.id}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-800 dark:text-gray-200">{op.operation_type}</p>
                    <p className="text-xs text-gray-400">{op.entity_id ? op.entity_id.slice(0, 24) : "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${STATUS_TONES[op.status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
                      {op.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{op.attempts}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{op.conflict_reason || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{op.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OfficeWorkspaceShell>
  );
}
