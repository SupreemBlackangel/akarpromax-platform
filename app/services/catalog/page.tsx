"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { CategoryCard, ProviderCard, type CategoryRow, type ProviderRow } from "@services-ui/ServiceCards";
import { apiFetch, nameFor } from "@services-client";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";

export default function ServicesCatalogPage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [categoriesData, providersData] = await Promise.all([
          apiFetch<{ categories: CategoryRow[] }>("/api/service-categories?country=OM"),
          apiFetch<{ providers: ProviderRow[] }>("/api/service-providers?status=approved&limit=100"),
        ]);
        if (controller.signal.aborted) return;
        setCategories(categoriesData.categories ?? []);
        setProviders(providersData.providers ?? []);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const filteredProviders = useMemo(() => {
    if (!query.trim()) return providers;
    const q = query.trim().toLowerCase();
    return providers.filter((p) => {
      const name = (p.business_name || nameFor(locale, p.display_name_ar, p.display_name_en, null, "")).toLowerCase();
      const bio = nameFor(locale, p.bio_ar, p.bio_en, null, "").toLowerCase();
      return name.includes(q) || bio.includes(q);
    });
  }, [providers, query, locale]);

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
        <div className="mb-6">
          <Link href="/services" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← {t("services.back") ?? "العودة للسوق"}</Link>
          <h1 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{t("services.catalogTitle") ?? "دليل الخدمات"}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("services.catalogSub") ?? "تصفح التصنيفات ومقدمي الخدمات."}</p>
        </div>

        <section>
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">{t("services.categories") ?? "التصنيفات"}</h2>
          {loading ? (
            <Grid columns={3}>
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
            </Grid>
          ) : (
            <Grid columns={3}>
              {categories.map((category) => <CategoryCard key={category.id} category={category} locale={locale} />)}
            </Grid>
          )}
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">{t("services.providers") ?? "مقدمو الخدمات"}</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("services.searchProviders") ?? "ابحث عن مقدم خدمة..."}
              className="w-full sm:w-72 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Grid columns={3}>
            {filteredProviders.map((provider, i) => <ProviderCard key={provider.id} provider={provider} locale={locale} index={i} />)}
            {!loading && filteredProviders.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-10">{t("services.empty")}</p>
            )}
          </Grid>
        </section>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
