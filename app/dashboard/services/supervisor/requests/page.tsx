"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicPageShell from "@/src/components/PublicPageShell";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { apiFetch } from "@services-client";

type RequestRow = Record<string, unknown> & {
  id: string;
  title?: string | null;
  status?: string | null;
  urgency?: string | null;
  city_id?: string | null;
  country_code?: string | null;
  created_at?: string | null;
  contact_phone?: string | null;
};

const STATUS_AR: Record<string, string> = {
  draft: "مسودة", pending: "بانتظار المراجعة", published: "منشور", receiving_offers: "يستقبل عروضاً",
  in_progress: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي", closed: "مغلق", expired: "منتهي",
};

const STATUS_FILTERS = ["", "pending", "published", "receiving_offers", "in_progress", "completed", "cancelled"] as const;

function SupervisorRequestsContent() {
  const { locale, viewer, copy, dir, country, city, t, openLogin, handleLogout, AccountDialog } = useServicesPage();
  const searchParams = useSearchParams();
  const isArabic = locale === "ar";
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback((current: string) => {
    setLoading(true);
    const params = new URLSearchParams({ all: "1", scope: "global", limit: "100" });
    if (current) params.set("status", current);
    apiFetch<{ requests: RequestRow[] }>(`/api/service-requests?${params.toString()}`)
      .then((data) => setRows(data.requests ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => load(status), 0);
    return () => window.clearTimeout(timer);
  }, [status, load]);

  return (
    <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} currentPath="/dashboard/services/supervisor/requests" adLayout={{ mode: "safe-no-ads" }} onLogin={() => openLogin("login")} onLogout={handleLogout}>
      <div dir={dir}>
        <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="all-requests">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-[var(--color-text-primary)]">{isArabic ? "كل طلبات الخدمات" : "All service requests"}</h1>
              <p className="text-sm text-[var(--color-text-muted)]">{isArabic ? "متابعة كل الطلبات في المنصة بأي حالة" : "Every request on the platform, any status"}</p>
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-bold outline-none">
              {STATUS_FILTERS.map((value) => (
                <option key={value || "all"} value={value}>
                  {value === "" ? (isArabic ? "كل الحالات" : "All statuses") : isArabic ? STATUS_AR[value] ?? value : value}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="h-48 animate-pulse rounded-2xl bg-[var(--color-surface-muted)]" />
          ) : rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--color-border)] py-14 text-center text-sm text-[var(--color-text-muted)]">
              {isArabic ? "لا توجد طلبات مطابقة." : "No matching requests."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-start text-[11px] font-black uppercase text-[var(--color-text-muted)]">
                    <th className="px-4 py-3 text-start">{isArabic ? "الطلب" : "Request"}</th>
                    <th className="px-4 py-3 text-start">{isArabic ? "الموقع" : "Location"}</th>
                    <th className="px-4 py-3 text-start">{isArabic ? "الحالة" : "Status"}</th>
                    <th className="px-4 py-3 text-start">{isArabic ? "التاريخ" : "Date"}</th>
                    <th className="px-4 py-3 text-start">{isArabic ? "عرض" : "View"}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-border)]/60">
                      <td className="max-w-[280px] truncate px-4 py-3 font-bold text-[var(--color-text-primary)]">{(row.title as string) || row.id}</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">{[row.city_id, row.country_code].filter(Boolean).join("، ") || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-black text-[var(--color-primary)]">
                          {isArabic ? STATUS_AR[(row.status as string) ?? ""] ?? row.status : row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                        {row.created_at ? new Date(row.created_at as string).toLocaleDateString(isArabic ? "ar" : locale) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/service-requests/${row.id}`} className="text-xs font-black text-[var(--color-primary)] hover:underline">
                          {isArabic ? "فتح" : "Open"}
                        </Link>
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

export default function SupervisorRequestsPage() {
  return (
    <Suspense fallback={<div className="p-6" dir="rtl">...</div>}>
      <SupervisorRequestsContent />
    </Suspense>
  );
}
