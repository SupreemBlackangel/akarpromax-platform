"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";
import SearchInput from "@/src/components/ui/SearchInput";

type OrganizationRow = {
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
};

function pick(locale: "ar" | "en" | "tr", item: OrganizationRow, key: "name" | "description"): string {
  if (key === "name") {
    if (locale === "tr") return item.nameTr || item.nameEn || item.nameAr || item.slug;
    if (locale === "en") return item.nameEn || item.nameAr || item.nameTr || item.slug;
    return item.nameAr || item.nameEn || item.nameTr || item.slug;
  }
  if (locale === "tr") return item.descriptionTr || item.descriptionEn || item.descriptionAr || "";
  if (locale === "en") return item.descriptionEn || item.descriptionAr || item.descriptionTr || "";
  return item.descriptionAr || item.descriptionEn || item.descriptionTr || "";
}

export default function OrganizationsDirectoryPage() {
  const { locale, viewer, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [items, setItems] = useState<OrganizationRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/amrs/organizations?country=${encodeURIComponent(country)}&limit=100`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as { organizations?: OrganizationRow[] };
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!controller.signal.aborted) setItems(data.organizations ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setError(locale === "ar" ? "تعذر تحميل المنظمات حالياً" : locale === "tr" ? "Kuruluşlar şu anda yüklenemedi" : "Organizations could not be loaded right now");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [country, locale]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const name = pick(locale, item, "name").toLowerCase();
      const description = pick(locale, item, "description").toLowerCase();
      return name.includes(term) || description.includes(term) || item.slug.toLowerCase().includes(term);
    });
  }, [items, locale, search]);

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/organizations"
      adLayout={{ mode: "standard", family: "organizations" }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
      pageHeader={{
        eyebrow: locale === "ar" ? "الحضور المؤسسي" : locale === "tr" ? "Kurumsal Varlık" : "Business Presence",
        title: locale === "ar" ? "المنظمات والشركات" : locale === "tr" ? "Kuruluşlar ve Şirketler" : "Organizations and Companies",
        description:
          locale === "ar"
            ? "تصفح ملفات المنظمات المعروضة للعامة، وتحقق من تخصصها وحضورها التجاري في المنصة."
            : locale === "tr"
              ? "Halka açık kuruluş profillerini inceleyin ve uzmanlık ile ticari varlıklarını görün."
              : "Browse public organization profiles and review their specialty and business presence on the platform.",
      }}
    >
      <PageContainer className="py-8" dir={dir}>
        <div className="mb-6 flex justify-end">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={locale === "ar" ? "ابحث عن منظمة..." : locale === "tr" ? "Kuruluş ara..." : "Search organizations..."}
            className="w-full sm:w-80"
            aria-label={locale === "ar" ? "ابحث عن منظمة" : locale === "tr" ? "Kuruluş ara" : "Search organizations"}
          />
        </div>

        {error && <div className="mb-6 rounded-xl bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)] dark:bg-red-900/30 dark:text-red-200">{error}</div>}

        <Grid columns={3}>
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))
            : filtered.map((item) => (
                <Link key={item.id} href={`/organizations/${item.id}`} className="block rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-primary)]/30 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[var(--color-primary)] dark:bg-[var(--color-primary-soft)]/40 dark:text-[var(--color-primary)]">{item.type}</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{item.classification}</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-[var(--color-text-primary)]">{pick(locale, item, "name")}</h2>
                  <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{pick(locale, item, "description") || item.slug}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{item.countryCode}{item.cityId ? ` • ${item.cityId}` : ""}</span>
                    <span>{item.websiteUrl ? (locale === "ar" ? "موقع إلكتروني" : locale === "tr" ? "Web sitesi" : "Website") : (locale === "ar" ? "بلا موقع" : locale === "tr" ? "Site yok" : "No website")}</span>
                  </div>
                </Link>
              ))}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              {locale === "ar" ? "لا توجد منظمات عامة مطابقة حالياً." : locale === "tr" ? "Şu anda eşleşen halka açık kuruluş yok." : "No matching public organizations are available right now."}
            </div>
          )}
        </Grid>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
