"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { type RequestRow } from "@services-ui/ServiceCards";
import { RequestStatusPill } from "@services-ui/ServiceStatusBadges";
import { apiFetch, formatMoney, formatDate } from "@services-client";

export default function MatchedRequestsPage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewer.authenticated) return;
    const controller = new AbortController();
    (async () => {
      try {
        const [profileData, matchedData] = await Promise.all([
          apiFetch<{ profile: Record<string, unknown> | null }>("/api/service-providers/me"),
          apiFetch<{ requests: RequestRow[] }>("/api/service-providers/me/matched-requests"),
        ]);
        if (controller.signal.aborted) return;
        setHasProfile(Boolean(profileData.profile));
        setRequests(matchedData.requests ?? []);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [viewer.authenticated]);

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="matched-requests">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4">{t("services.matchedRequests") ?? "طلبات مناسبة لي"}</h2>

        {!loading && hasProfile === false && (
          <div className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-5 text-sm text-amber-700 dark:text-amber-300">
            {t("services.applyToMatch") ?? "للاستفادة من نظام المطابقة تحتاج لإنشاء ملف مقدم خدمة والموافقة عليه."}
            <Link href="/dashboard/services/provider-profile" className="mt-2 inline-block font-bold underline">← {t("services.applyProvider") ?? "قدم الآن"}</Link>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
        ) : requests.length === 0 ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-16">{t("services.empty")}</p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/service-requests/${request.id}`} className="font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                      {request.title || request.reference_number}
                    </Link>
                    <p className="mt-1 text-xs text-gray-400">{request.reference_number} • {formatDate(request.created_at)}</p>
                  </div>
                  <RequestStatusPill status={request.status} locale={locale} />
                </div>
                {request.description && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{request.description}</p>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formatMoney(request.budget_min, request.currency)} – {formatMoney(request.budget_max, request.currency)}</span>
                  <Link href={`/service-requests/${request.id}/offer`} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition">
                    {t("services.makeOffer") ?? "تقديم عرض"}
                  </Link>
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
