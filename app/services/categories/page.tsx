"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { apiFetch } from "@services-client";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";
import { CategoryCard, type CategoryRow } from "@services-ui/ServiceCards";
import SearchInput from "@/src/components/ui/SearchInput";

export default function ServiceCategoriesPage() {
  const { locale, viewer, t, dir, country, city, isGlobal, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const suffix = !isGlobal && country ? `?country=${encodeURIComponent(country)}` : "";
    apiFetch<{ categories: CategoryRow[] }>(`/api/service-categories${suffix}`)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCategories(data.categories ?? []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t("services.error"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [country, isGlobal, locale, t]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.trim().toLowerCase();
    return categories.filter((c) => {
      const nameAr = (c.name_ar ?? "").toLowerCase();
      const nameEn = (c.name_en ?? "").toLowerCase();
      const nameTr = (c.name_tr ?? "").toLowerCase();
      const code = (c.code ?? "").toLowerCase();
      return nameAr.includes(term) || nameEn.includes(term) || nameTr.includes(term) || code.includes(term);
    });
  }, [search, categories]);

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/services/categories"
      adLayout={{ mode: "standard", family: "services" }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <PageContainer className="py-8" dir={dir}>
        <Link href="/services" className="text-sm font-bold text-[var(--color-primary)] dark:text-[var(--color-primary)] hover:underline">
          ← {t("services.back") ?? "العودة للسوق"}
        </Link>
        <div className="mt-6">
          <h1 className="text-3xl font-black text-gray-900 dark:text-[var(--color-text-primary)]">{t("services.categories") ?? "جميع التصنيفات"}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("services.categoriesSub") ?? "استعرض جميع تصنيفات الخدمات المتاحة واختر ما يناسبك"}</p>
        </div>

        {error && <div className="mt-4 px-4 py-3 bg-[var(--color-error-soft)] dark:bg-red-900/30 text-[var(--color-error)] dark:text-[var(--color-error)] rounded-lg text-sm">{error}</div>}

        <div className="mt-6">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("services.searchCategories") ?? "ابحث عن تصنيف..."}
            className="max-w-md"
            aria-label={t("services.searchCategories") ?? "ابحث عن تصنيف"}
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <Grid columns={3}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </Grid>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-xl font-black text-gray-900 dark:text-[var(--color-text-primary)]">{search ? t("services.noResults") ?? "لا توجد نتائج" : t("services.empty") ?? "لا توجد تصنيفات"}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{search ? t("services.noResultsSub") ?? "جرب كلمات بحث مختلفة" : t("services.emptySub") ?? "لا توجد تصنيفات متاحة حالياً"}</p>
            </div>
          ) : (
            <Grid columns={3}>
              {filteredCategories.map((category) => (
                <CategoryCard key={category.id} category={category} locale={locale} />
              ))}
            </Grid>
          )}
        </div>

      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
