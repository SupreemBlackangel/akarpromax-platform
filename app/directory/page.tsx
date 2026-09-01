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

type OrgRow = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  nameTr: string | null;
  slug: string;
  type: string;
  classification: string;
  countryCode: string;
  cityId: string | null;
  websiteUrl: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  descriptionTr: string | null;
  status: string;
};

function pickOrg(locale: "ar" | "en" | "tr", item: OrgRow, key: "name" | "description") {
  if (key === "name") {
    if (locale === "tr") return item.nameTr || item.nameEn || item.nameAr || item.slug;
    if (locale === "en") return item.nameEn || item.nameAr || item.nameTr || item.slug;
    return item.nameAr || item.nameEn || item.nameTr || item.slug;
  }
  if (locale === "tr") return item.descriptionTr || item.descriptionEn || item.descriptionAr || "";
  if (locale === "en") return item.descriptionEn || item.descriptionAr || item.descriptionTr || "";
  return item.descriptionAr || item.descriptionEn || item.descriptionTr || "";
}

export default function DirectoryPage() {
  const { locale, viewer, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [organizations, setOrganizations] = useState<OrgRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"providers" | "organizations">("providers");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [providerData, organizationData, categoriesData] = await Promise.all([
          apiFetch<{ profiles?: ProviderRow[]; providers?: ProviderRow[] }>(`/api/service-providers?country=${country.toUpperCase()}&status=approved&limit=100${categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : ""}`),
          apiFetch<{ organizations: OrgRow[] }>(`/api/amrs/organizations?country=${country.toLowerCase()}&limit=100`),
          apiFetch<{ categories: CategoryRow[] }>(`/api/service-categories?country=${country.toUpperCase()}`),
        ]);
        if (controller.signal.aborted) return;
        setProviders(providerData.profiles ?? providerData.providers ?? []);
        setOrganizations(organizationData.organizations ?? []);
        setCategories(categoriesData.categories ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setError(locale === "ar" ? "تعذر تحميل الدليل حالياً" : locale === "tr" ? "Dizin şu anda yüklenemedi" : "The directory could not be loaded right now.");
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

  const filteredOrganizations = useMemo(() => {
    if (!search.trim()) return organizations;
    const term = search.trim().toLowerCase();
    return organizations.filter((organization) => {
      const name = pickOrg(locale, organization, "name").toLowerCase();
      const description = pickOrg(locale, organization, "description").toLowerCase();
      return name.includes(term) || description.includes(term) || organization.slug.toLowerCase().includes(term);
    });
  }, [organizations, search, locale]);

  const items = tab === "providers" ? filteredProviders : filteredOrganizations;

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/directory"
      adLayout={{ mode: "standard", family: "directory" }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
      pageHeader={{
        eyebrow: locale === "ar" ? "الدليل" : locale === "tr" ? "Dizin" : "Directory",
        title: locale === "ar" ? "الدليل المهني والتجاري" : locale === "tr" ? "Profesyonel ve Kurumsal Dizin" : "Professional and Business Directory",
        description:
          locale === "ar"
            ? "اعثر على مقدمي الخدمات والمنظمات العامة في نقطة دخول واحدة، مع بقاء الثقة منفصلة عن أي ترويج مدفوع."
            : locale === "tr"
              ? "Hizmet sağlayıcıları ve halka açık kuruluşları tek bir giriş noktasında bulun; güven, ücretli görünürlükten ayrı kalır."
              : "Find service providers and public organizations from one entry point, with trust kept separate from any paid visibility.",
      }}
    >
      <PageContainer className="py-8" dir={dir}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setTab("providers")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === "providers" ? "bg-[var(--color-primary)] text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}>
              {locale === "ar" ? "المهنيون" : locale === "tr" ? "Profesyoneller" : "Professionals"}
            </button>
            <button type="button" onClick={() => setTab("organizations")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === "organizations" ? "bg-[var(--color-primary)] text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}>
              {locale === "ar" ? "المنظمات" : locale === "tr" ? "Kuruluşlar" : "Organizations"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {tab === "providers" && (
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="rounded-xl border border-gray-200 bg-[var(--color-surface)] px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="">{locale === "ar" ? "كل التصنيفات" : locale === "tr" ? "Tüm kategoriler" : "All categories"}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {nameFor(locale, category.name_ar, category.name_en, category.name_tr, category.code)}
                  </option>
                ))}
              </select>
            )}
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={locale === "ar" ? "ابحث في الدليل..." : locale === "tr" ? "Dizinde ara..." : "Search the directory..."}
              className="w-full sm:w-80"
              aria-label={locale === "ar" ? "ابحث في الدليل" : locale === "tr" ? "Dizinde ara" : "Search the directory"}
            />
          </div>
        </div>

        {error && <div className="mb-6 rounded-xl bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)] dark:bg-red-900/30 dark:text-red-200">{error}</div>}

        <Grid columns={3}>
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))
            : tab === "providers"
              ? (items as ProviderRow[]).map((provider, index) => <ProviderCard key={provider.id} provider={provider} locale={locale} index={index} />)
              : (items as OrgRow[]).map((organization) => (
                  <Link key={organization.id} href={`/organizations/${organization.id}`} className="block rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-primary)]/30 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[var(--color-primary)] dark:bg-[var(--color-primary-soft)]/40 dark:text-[var(--color-primary)]">{organization.type}</span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{organization.classification}</span>
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-[var(--color-text-primary)]">{pickOrg(locale, organization, "name")}</h2>
                    <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{pickOrg(locale, organization, "description") || organization.slug}</p>
                  </Link>
                ))}
          {!loading && items.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              {locale === "ar" ? "لا توجد نتائج مطابقة حالياً." : locale === "tr" ? "Şu anda eşleşen sonuç yok." : "No matching results are available right now."}
            </div>
          )}
        </Grid>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
