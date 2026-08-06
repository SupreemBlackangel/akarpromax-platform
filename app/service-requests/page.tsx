"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@/src/components/services/useServicesPage";
import { RequestCard, type CategoryRow, type RequestRow } from "@/src/components/services/ServiceCards";
import { apiFetch } from "@/src/lib/services-client";

export default function ServiceRequestsListPage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [requestsData, categoriesData] = await Promise.all([
          apiFetch<{ requests: RequestRow[] }>("/api/service-requests?status=published&limit=60"),
          apiFetch<{ categories: CategoryRow[] }>("/api/service-categories?country=OM"),
        ]);
        if (controller.signal.aborted) return;
        setRequests(requestsData.requests ?? []);
        setCategories(categoriesData.categories ?? []);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const filtered = categoryFilter ? requests.filter((r) => r.category_id === categoryFilter) : requests;

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
      <div dir={dir} className="container py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">{t("services.requests") ?? "طلبات الخدمات"}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("services.requestsSub") ?? "استعرض الطلبات المنشورة من العملاء."}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t("services.allCategories") ?? "كل التصنيفات"}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c as { name_en?: string | null }).name_en || (c as { name_ar?: string | null }).name_ar || c.code}
                </option>
              ))}
            </select>
            <Link
              href="/service-requests/new"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition"
            >
              ➕ {t("services.postRequest") ?? "انشر طلباً"}
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)
            : filtered.map((request) => <RequestCard key={request.id} request={request} locale={locale} categoryMap={categoryMap} />)}
          {!loading && filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-16">{t("services.empty")}</p>
          )}
        </div>
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
