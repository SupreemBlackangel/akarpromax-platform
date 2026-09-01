"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { RequestCard, type CategoryRow, type RequestRow } from "@services-ui/ServiceCards";
import { apiFetch } from "@services-client";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";

export default function ServiceRequestsListPage() {
  const { locale, viewer, t, dir, country, city, governorate, district, isGlobal, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const requestParams = new URLSearchParams({ status: "published", limit: "60", scope: isGlobal ? "global" : "local" });
        if (!isGlobal) {
          requestParams.set("country", country);
          if (governorate) requestParams.set("governorate", governorate);
          if (city) requestParams.set("cityId", city);
          if (district) requestParams.set("districtId", district);
        }
        const categorySuffix = !isGlobal && country ? `?country=${encodeURIComponent(country)}` : "";
        const [requestsData, categoriesData] = await Promise.all([
          apiFetch<{ requests: RequestRow[] }>(`/api/service-requests?${requestParams.toString()}`),
          apiFetch<{ categories: CategoryRow[] }>(`/api/service-categories${categorySuffix}`),
        ]);
        if (controller.signal.aborted) return;
        setRequests(requestsData.requests ?? []);
        setCategories(categoriesData.categories ?? []);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [city, country, district, governorate, isGlobal]);

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
      <PageContainer className="py-8" dir={dir}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-[var(--color-text-primary)]">{t("services.requests") ?? "طلبات الخدمات"}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("services.requestsSub") ?? "استعرض الطلبات المنشورة من العملاء."}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
              className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-bold transition"
            >
              ➕ {t("services.postRequest") ?? "انشر طلباً"}
            </Link>
          </div>
        </div>

        <Grid columns={3}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)
            : filtered.map((request) => <RequestCard key={request.id} request={request} locale={locale} categoryMap={categoryMap} />)}
          {!loading && filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-16">{t("services.empty")}</p>
          )}
        </Grid>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
