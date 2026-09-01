"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { RequestCard, type RequestRow } from "@services-ui/ServiceCards";
import { apiFetch } from "@services-client";

export default function ServicesDashboardPage() {
  const {
    locale,
    viewer,
    copy,
    dir,
    country,
    city,
    t,
    openLogin,
    handleLogout,
    AccountDialog,
  } = useServicesPage();

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- data fetch on mount/auth change, not derived render state */
    if (!viewer.authenticated) {
      setRequests([]);
      setLoading(false);
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    const controller = new AbortController();

    setLoading(true);

    apiFetch<{ requests: RequestRow[] }>("/api/service-requests?mine=1&limit=6")
      .then((data) => {
        if (!controller.signal.aborted) {
          setRequests(data.requests ?? []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRequests([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [viewer.authenticated]);

  return (
    <>
      <PublicPageShell
        locale={locale}
        copy={copy}
        viewer={viewer}
        country={country}
        city={city}
        currentPath="/dashboard/services"
        onLogin={() => openLogin("login")}
        onLogout={handleLogout}
      >
        <ServiceDashboardShell
          viewer={viewer}
          locale={locale}
          dir={dir}
          t={t}
          active="dashboard"
        >
          {viewer.authenticated && (
            <section>
              <div className="mb-5">
                <h2 className="text-xl font-black text-gray-900 dark:text-[var(--color-text-primary)]">
                  {t("services.myRequests") ?? "طلباتي الأخيرة"}
                </h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  تابع طلباتك والعروض الواردة عليها من مكان واحد.
                </p>
              </div>

              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
                    />
                  ))}
                </div>
              ) : requests.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {requests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      locale={locale}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    لا توجد لديك طلبات خدمات حتى الآن.
                  </p>

                  <Link
                    href="/service-requests/new"
                    className="mt-4 inline-flex rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)]"
                  >
                    طلب خدمة جديد
                  </Link>
                </div>
              )}
            </section>
          )}
        </ServiceDashboardShell>
      </PublicPageShell>

      {AccountDialog}
    </>
  );
}
