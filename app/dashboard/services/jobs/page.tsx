"use client";

import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { JobCard, type JobRow } from "@services-ui/ServiceCards";
import { apiFetch } from "@services-client";

const FILTERS = ["all", "pending_provider", "confirmed", "declined", "created", "accepted", "scheduled", "in_progress", "waiting_customer_confirmation", "delivered", "completed", "cancelled", "disputed"] as const;

export default function MyJobsPage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewer.authenticated) return;
    const controller = new AbortController();
    const params = filter === "all" ? "" : `&status=${encodeURIComponent(filter)}`;
    apiFetch<{ jobs: JobRow[] }>(`/api/service-jobs?limit=100${params}`)
      .then((data) => {
        if (!controller.signal.aborted) setJobs(data.jobs ?? []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filter, viewer.authenticated]);

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/dashboard/services/jobs"
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="jobs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-black text-gray-900 dark:text-[var(--color-surface)]">{t("services.jobs") ?? "المهام"}</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
            {FILTERS.map((f) => (
              <option key={f} value={f}>{f.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
        ) : jobs.length === 0 ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-16">{t("services.empty")}</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {jobs.map((job) => <JobCard key={job.id} job={job} locale={locale} viewerEmail={viewer.email} />)}
          </div>
        )}
      </ServiceDashboardShell>
      {AccountDialog}
    </PublicPageShell>
  );
}
