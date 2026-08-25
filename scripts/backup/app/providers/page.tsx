"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { apiFetch, nameFor } from "@services-client";
import { ProviderCard, type CategoryRow, type ProviderRow } from "@services-ui/ServiceCards";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";
import SearchInput from "@/src/components/ui/SearchInput";

export default function ProvidersDirectoryPage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [categoriesData, providersData] = await Promise.all([
          apiFetch<{ categories: CategoryRow[] }>(`/api/service-categories?country=${country.toUpperCase()}`),
          apiFetch<{ profiles?: ProviderRow[]; providers?: ProviderRow[] }>(`/api/service-providers?country=${country.toUpperCase()}&status=approved&limit=100${categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : ""}`),
        ]);
        if (controller.signal.aborted) return;
        setCategories(categoriesData.categories ?? []);
        setProviders((providersData.profiles ?? providersData.providers ?? []));
      } catch {
        if (!controller.signal.aborted) {
          setError(locale === "ar" ? "تعذر تحميل الدليل حالياً" : locale === "tr" ? "Dizin şu anda yüklenemedi" : "The directory could not be loaded right now");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [categoryId, country, locale]);

  const filteredProviders = useMemo(() => {
    if (!search.trim()) return providers;
    const term = search.trim().toLowerCase();
    return providers.filter((provider) => {
      const name = (provider.business_name || nameFor(locale, provider.display_name_ar, provider.display_name_en, null, "")).toLowerCase();
      const bio = nameFor(locale, provider.bio_ar, provider.bio_en, null, "").toLowerCase();
      return name.includes(term) || bio.includes(term);
    });
  }, [providers, search, locale]);

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/providers"
      adLayout={{ mode: "standard", family: "providers" }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
      pageHeader={{
        eyebrow: locale === "ar" ? "الدليل المهني" : locale === "tr" ? "Profesyonel Dizin" : "Professional Directory",
        title: locale === "ar" ? "مقدمو الخدمات المعتمدون" : locale === "tr" ? "Onaylı Hizmet Sağlayıcılar" : "Approved Service Providers",
        description:
          locale === "ar"
            ? "ابحث عن مقدمي الخدمات بحسب التخصص والموقع، وراجع الملفات المهنية قبل طلب الخدمة."
            : locale === "tr"
              ? "Uzmanlık ve konuma göre hizmet sağlayıcıları bulun, hizmet istemeden önce profilleri inceleyin."
              : "Find service providers by specialty and location, and review professional profiles before requesting service.",
      }}
    >
      <PageContainer className="py-8" dir={dir}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/services" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
              ← {locale === "ar" ? "العودة لسوق الخدمات" : locale === "tr" ? "Hizmetler pazarına dön" : "Back to services"}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">{locale === "ar" ? "كل التصنيفات" : locale === "tr" ? "Tüm kategoriler" : "All categories"}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {nameFor(locale, category.name_ar, category.name_en, category.name_tr, category.code)}
                </option>
              ))}
            </select>
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={locale === "ar" ? "ابحث عن مقدم خدمة..." : locale === "tr" ? "Hizmet sağlayıcı ara..." : "Search providers..."}
              className="w-full sm:w-72"
              aria-label={locale === "ar" ? "ابحث عن مقدم خدمة" : locale === "tr" ? "Hizmet sağlayıcı ara" : "Search providers"}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        <Grid columns={3}>
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))
            : filteredProviders.map((provider, index) => (
                <ProviderCard key={provider.id} provider={provider} locale={locale} index={index} />
              ))}
          {!loading && filteredProviders.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              {locale === "ar"
                ? "لا يوجد مقدمو خدمات مطابقون الآن."
                : locale === "tr"
                  ? "Şu anda eşleşen hizmet sağlayıcı yok."
                  : "No matching providers are available right now."}
            </div>
          )}
        </Grid>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
