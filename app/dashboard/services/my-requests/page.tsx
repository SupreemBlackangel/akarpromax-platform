"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { type RequestRow } from "@services-ui/ServiceCards";
import { RequestStatusPill } from "@services-ui/ServiceStatusBadges";
import { apiFetch, formatMoney, formatDate } from "@services-client";

export default function MyRequestsPage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewer.authenticated) return;
    const controller = new AbortController();
    apiFetch<{ requests: RequestRow[] }>("/api/service-requests?mine=1&limit=100")
      .then((data) => {
        if (!controller.signal.aborted) setRequests(data.requests ?? []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [viewer.authenticated]);

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/dashboard/services/my-requests"
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="my-requests">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900 dark:text-[var(--color-text-primary)]">{t("services.myRequests") ?? "طلباتي"}</h2>
          <Link href="/service-requests/new" className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold transition">➕ {t("services.postRequest") ?? "طلب جديد"}</Link>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
        ) : requests.length === 0 ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-16">{t("services.empty")}</p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/service-requests/${request.id}`} className="font-bold text-gray-900 dark:text-[var(--color-text-primary)] hover:text-[var(--color-primary)] dark:hover:text-blue-400">
                      {request.title || request.reference_number}
                    </Link>
                    <p className="mt-1 text-xs text-gray-400">{request.reference_number} • {formatDate(request.created_at)}</p>
                  </div>
                  <RequestStatusPill status={request.status} locale={locale} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[var(--color-primary)] dark:text-[var(--color-primary)]">{formatMoney(request.budget_min, request.currency)} – {formatMoney(request.budget_max, request.currency)}</span>
                  <div className="flex gap-2">
                    {request.status === "draft" && (
                      <button
                        onClick={() => {
                          void apiFetch(`/api/service-requests/${request.id}/publish`, { method: "POST" }).then(() => window.location.reload());
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold transition"
                      >
                        {t("services.publish") ?? "نشر"}
                      </button>
                    )}
                    {request.status === "draft" && (
                      <button
                        onClick={() => {
                          void apiFetch(`/api/service-requests/${request.id}`, { method: "PATCH", body: JSON.stringify({}) }).then(() => window.location.reload());
                        }}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold"
                      >
                        {t("services.edit") ?? "تعديل"}
                      </button>
                    )}
                    <Link href={`/service-requests/${request.id}`} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                      {t("services.view") ?? "عرض"}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ServiceDashboardShell>
      {AccountDialog}
    </PublicPageShell>
  );
}
