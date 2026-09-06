"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { ProviderCard, RequestCard, ServiceCategoryIcon, type CategoryRow, type ProviderRow, type RequestRow } from "@services-ui/ServiceCards";
import { apiFetch, nameFor } from "@services-client";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";

export default function CategoryDetailPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code ?? "");
  const {
    locale, viewer, t: rawT, dir, country, city, governorate, district,
    latitude, longitude, isGlobal, openLogin, handleLogout, AccountDialog, copy,
  } = useServicesPage();
  const t = (key: string): string | undefined => {
    const value = rawT(key);
    return value && value !== key ? value : undefined;
  };
  const [category, setCategory] = useState<CategoryRow | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const categorySuffix = !isGlobal && country ? `?country=${encodeURIComponent(country)}` : "";
        const categoriesData = await apiFetch<{ categories: CategoryRow[] }>(`/api/service-categories${categorySuffix}`);
        if (controller.signal.aborted) return;
        const found = (categoriesData.categories ?? []).find((c) => c.code === code) ?? null;
        setCategory(found);
        if (found) {
          const providerParams = new URLSearchParams({
            categoryId: found.id,
            limit: "50",
            scope: isGlobal ? "global" : "local",
          });
          if (!isGlobal) {
            providerParams.set("country", country);
            if (governorate) providerParams.set("governorate", governorate);
            if (city) providerParams.set("cityId", city);
            if (district) providerParams.set("districtId", district);
            if (latitude != null && longitude != null) {
              providerParams.set("latitude", String(latitude));
              providerParams.set("longitude", String(longitude));
              providerParams.set("radiusKm", "10");
            }
          }
          const requestParams = new URLSearchParams({ categoryId: found.id, status: "published", limit: "20", scope: isGlobal ? "global" : "local" });
          if (!isGlobal) {
            requestParams.set("country", country);
            if (governorate) requestParams.set("governorate", governorate);
            if (city) requestParams.set("cityId", city);
            if (district) requestParams.set("districtId", district);
          }
          const [providersData, requestsData] = await Promise.all([
            apiFetch<{ profiles: ProviderRow[] }>(`/api/service-providers?${providerParams.toString()}`),
            apiFetch<{ requests: RequestRow[] }>(`/api/service-requests?${requestParams.toString()}`),
          ]);
          if (controller.signal.aborted) return;
          setProviders(providersData.profiles ?? []);
          setRequests(requestsData.requests ?? []);
        }
      } catch {
        setCategory(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [city, code, country, district, governorate, isGlobal, latitude, longitude]);

  // The card resolves a request's category through this; this page shows one
  // category, so that is the whole map it needs. Without it the card had
  // nothing to print but the raw id.
  const categoryMap = useMemo(
    () => (category ? new Map<string, CategoryRow>([[category.id, category]]) : new Map<string, CategoryRow>()),
    [category],
  );

  const name = category ? nameFor(locale, category.name_ar, category.name_en, category.name_tr, code) : code;
  const description = category ? nameFor(locale, category.description_ar, category.description_en, category.description_tr, "") : "";

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath={`/services/catalog/${code}`}
      adLayout={{ mode: "standard", family: "services" }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <PageContainer dir={dir} className="py-8">
        <div className="mb-6">
          <Link href="/services/catalog" className="text-sm font-bold text-[var(--color-primary)] dark:text-blue-400 hover:underline">← {t("services.back") ?? "دليل الخدمات"}</Link>
          <div className="mt-3 flex items-center gap-4">
            <span className="h-16 w-16 grid place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] dark:bg-blue-900/30 dark:text-[var(--color-primary)]"><ServiceCategoryIcon name={category?.icon} className="h-8 w-8" /></span>
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white">{name}</h1>
              {description && <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {loading
              ? "جارٍ التحميل..."
              : category
                ? `${providers.length} ${t("services.providers") ?? "محترف"} • ${requests.length} ${t("services.requests") ?? "طلب"}`
                : t("services.empty") ?? "لا توجد نتائج"}
          </div>
          <div className="flex flex-wrap gap-2">
            {(category?.booking_mode === "instant" || category?.booking_mode === "both") && <Link href={`/providers?categoryId=${encodeURIComponent(category.id)}`} className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-bold transition">احجز مع محترف</Link>}
            {(category?.booking_mode === "quotes" || category?.booking_mode === "both" || !category) && <Link href={`/service-requests/new?category=${encodeURIComponent(category?.id ?? "")}`} className="px-5 py-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-primary)] text-sm font-bold transition">➕ {t("services.postRequest") ?? "انشر طلباً في هذا التصنيف"}</Link>}
          </div>
        </div>

        <section>
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">{t("services.providers") ?? "مقدمو الخدمات"}</h2>
          <Grid columns={3}>
            {providers.map((provider, i) => <ProviderCard key={provider.id} provider={provider} locale={locale} index={i} />)}
            {!loading && providers.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-8">{t("services.empty") ?? "لا توجد نتائج"}</p>
            )}
          </Grid>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">{t("services.requests") ?? "الطلبات المنشورة"}</h2>
          <Grid columns={3}>
            {requests.map((request) => <RequestCard key={request.id} request={request} locale={locale} categoryMap={categoryMap} />)}
            {!loading && requests.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-8">{t("services.empty") ?? "لا توجد نتائج"}</p>
            )}
          </Grid>
        </section>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
