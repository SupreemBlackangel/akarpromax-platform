"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PublicPageShell from "@/src/components/PublicPageShell";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { apiFetch, nameFor } from "@services-client";

type ProviderRow = Record<string, unknown> & {
  id: string;
  status: string;
  display_name_ar?: string | null;
  display_name_en?: string | null;
  business_name?: string | null;
  city_id?: string | null;
  created_at?: string;
};

const STATUSES = ["under_review", "approved", "rejected", "suspended"] as const;

const STATUS_AR: Record<string, string> = {
  under_review: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض", suspended: "موقوف",
};

function SupervisorProvidersContent() {
  const { locale, viewer, copy, dir, country, city, t, openLogin, handleLogout, AccountDialog } = useServicesPage();
  const searchParams = useSearchParams();
  const isArabic = locale === "ar";
  const [status, setStatus] = useState(searchParams.get("status") || "under_review");
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback((current: string) => {
    setLoading(true);
    apiFetch<{ profiles: ProviderRow[] }>(`/api/service-providers?status=${encodeURIComponent(current)}&limit=100`)
      .then((data) => setRows(data.profiles ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => load(status), 0);
    return () => window.clearTimeout(timer);
  }, [status, load]);

  const setProviderStatus = async (id: string, nextStatus: string) => {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/api/service-providers/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      setRows((current) => current.filter((row) => row.id !== id));
      setMessage(isArabic ? "تم تنفيذ الإجراء." : "Done.");
    } catch {
      setMessage(isArabic ? "تعذر تنفيذ الإجراء." : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} currentPath="/dashboard/services/supervisor/providers" adLayout={{ mode: "safe-no-ads" }} onLogin={() => openLogin("login")} onLogout={handleLogout}>
      <div dir={dir}>
        <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="providers">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-[var(--color-text-primary)]">{isArabic ? "مقدمو الخدمات" : "Service providers"}</h1>
              <p className="text-sm text-[var(--color-text-muted)]">{isArabic ? "مراجعة واعتماد وإيقاف ملفات المحترفين" : "Review, approve and suspend professional profiles"}</p>
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-bold outline-none">
              {STATUSES.map((value) => <option key={value} value={value}>{isArabic ? STATUS_AR[value] : value}</option>)}
            </select>
          </div>

          {message && <p className="mb-4 rounded-xl bg-[var(--color-primary-soft)] px-4 py-2.5 text-sm font-bold text-[var(--color-primary)]" role="status">{message}</p>}

          {loading ? (
            <div className="h-48 animate-pulse rounded-2xl bg-[var(--color-surface-muted)]" />
          ) : rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--color-border)] py-14 text-center text-sm text-[var(--color-text-muted)]">
              {isArabic ? "لا توجد ملفات في هذه الحالة." : "No profiles in this status."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-start text-[11px] font-black uppercase text-[var(--color-text-muted)]">
                    <th className="px-4 py-3 text-start">{isArabic ? "المحترف" : "Professional"}</th>
                    <th className="px-4 py-3 text-start">{isArabic ? "المدينة" : "City"}</th>
                    <th className="px-4 py-3 text-start">{isArabic ? "الحالة" : "Status"}</th>
                    <th className="px-4 py-3 text-start">{isArabic ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-border)]/60">
                      <td className="px-4 py-3 font-bold text-[var(--color-text-primary)]">
                        {nameFor(locale, row.display_name_ar as string, row.display_name_en as string, null, (row.business_name as string) || row.id)}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">{(row.city_id as string) || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-black text-[var(--color-primary)]">{isArabic ? STATUS_AR[row.status] ?? row.status : row.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {row.status !== "approved" && (
                            <button onClick={() => void setProviderStatus(row.id, "approved")} disabled={busy} className="rounded-lg bg-[var(--color-success)] px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">{isArabic ? "اعتماد" : "Approve"}</button>
                          )}
                          {row.status !== "rejected" && (
                            <button onClick={() => void setProviderStatus(row.id, "rejected")} disabled={busy} className="rounded-lg bg-[var(--color-error-soft)] px-3 py-1.5 text-xs font-black text-[var(--color-error)] disabled:opacity-50">{isArabic ? "رفض" : "Reject"}</button>
                          )}
                          {row.status === "approved" && (
                            <button onClick={() => void setProviderStatus(row.id, "suspended")} disabled={busy} className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700 disabled:opacity-50">{isArabic ? "إيقاف" : "Suspend"}</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ServiceDashboardShell>
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}

export default function SupervisorProvidersPage() {
  return (
    <Suspense fallback={<div className="p-6" dir="rtl">...</div>}>
      <SupervisorProvidersContent />
    </Suspense>
  );
}
