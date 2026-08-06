"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { apiFetch } from "@services-client";

export default function ServicesDashboardPage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewer.authenticated) return;
    const controller = new AbortController();
    (async () => {
      try {
        const [requests, matched, jobs, offers, notifications] = await Promise.all([
          apiFetch<{ requests: unknown[] }>("/api/service-requests?mine=1&limit=100"),
          apiFetch<{ requests: unknown[] }>("/api/service-providers/me/matched-requests"),
          apiFetch<{ jobs: unknown[] }>("/api/service-jobs?limit=100"),
          apiFetch<{ offers: unknown[] }>("/api/service-offers?mine=1&limit=100"),
          apiFetch<{ notifications: unknown[]; unread: number }>("/api/service-notifications?limit=100"),
        ]);
        if (controller.signal.aborted) return;
        setCounts({
          requests: (requests.requests ?? []).length,
          matched: (matched.requests ?? []).length,
          jobs: (jobs.jobs ?? []).length,
          offers: (offers.offers ?? []).length,
          unread: notifications.unread ?? 0,
        });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [viewer.authenticated]);

  const stats = [
    { label: "طلباتي", value: counts.requests ?? 0, href: "/dashboard/services/my-requests", icon: "📝" },
    { label: "طلبات مناسبة لي", value: counts.matched ?? 0, href: "/dashboard/services/matched-requests", icon: "🎯" },
    { label: "عروضي", value: counts.offers ?? 0, href: "/dashboard/services/offers", icon: "💼" },
    { label: "المهام النشطة", value: counts.jobs ?? 0, href: "/dashboard/services/jobs", icon: "🔧" },
    { label: "رسائل غير مقروءة", value: counts.unread ?? 0, href: "/dashboard/services/inbox", icon: "💬" },
  ];

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
      <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="overview">
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Link
              key={stat.href}
              href={stat.href}
              className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 transition hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{loading ? "…" : stat.value}</span>
              </div>
              <p className="mt-3 font-semibold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">{stat.label}</p>
            </Link>
          ))}

          <Link href="/service-requests/new" className="group flex flex-col justify-center items-center bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5 transition hover:border-blue-300 hover:shadow-md">
            <span className="text-2xl">➕</span>
            <span className="mt-2 font-black text-blue-700 dark:text-blue-300">{t("services.postRequest") ?? "انشر طلباً"}</span>
          </Link>
        </div>
      </ServiceDashboardShell>
      {AccountDialog}
    </PublicPageShell>
  );
}
