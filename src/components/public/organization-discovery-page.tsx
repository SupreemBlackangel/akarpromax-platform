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

type Mode = "offices" | "companies";

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

function matchesMode(mode: Mode, type: string): boolean {
  return mode === "offices" ? type === "real_estate" : type === "business" || type === "other";
}

const COPY = {
  offices: {
    currentPath: "/offices",
    detailBasePath: "/offices",
    adFamily: "offices" as const,
    eyebrow: { ar: "شركات و مكاتب عقارية", en: "Real Estate Companies & Offices", tr: "Emlak Sirketleri ve Ofisleri" },
    title: { ar: "شركات و مكاتب عقارية", en: "Real Estate Companies & Offices", tr: "Emlak Sirketleri ve Ofisleri" },
    description: {
      ar: "اكتشف المكاتب والشركات العقارية العامة، وتصفح حضورها التجاري وتفاصيلها في تجربة مخصصة لهذا القطاع.",
      en: "Discover public real estate companies and offices in a discovery page dedicated to this sector.",
      tr: "Bu sektor icin ayrilmis bir kesifte halka acik emlak ofislerini ve sirketlerini inceleyin.",
    },
    searchPlaceholder: { ar: "ابحث عن مكتب أو شركة عقارية...", en: "Search real estate offices or companies...", tr: "Emlak ofisi veya sirketi ara..." },
    searchAria: { ar: "ابحث عن شركة أو مكتب عقاري", en: "Search real estate companies and offices", tr: "Emlak sirketleri ve ofislerini ara" },
    empty: { ar: "لا توجد شركات أو مكاتب عقارية مطابقة حالياً.", en: "No matching real estate companies or offices are available right now.", tr: "Su anda eslesen emlak sirketi veya ofisi yok." },
  },
  companies: {
    currentPath: "/companies",
    detailBasePath: "/companies",
    adFamily: "companies" as const,
    eyebrow: { ar: "شركات أخرى", en: "Other Companies", tr: "Diger Sirketler" },
    title: { ar: "شركات أخرى", en: "Other Companies", tr: "Diger Sirketler" },
    description: {
      ar: "تصفح الشركات غير المصنفة كمكاتب عقارية، مثل المقاولات والهندسة والتوريد والخدمات الأخرى ضمن نفس محرك المنظمات.",
      en: "Browse non-real-estate companies such as contracting, engineering, supply, and other business categories on the same organization engine.",
      tr: "Ayni organizasyon motoru uzerinde emlak disi sirketleri; muteahhitlik, muhendislik, tedarik ve diger is kategorilerini kesfedin.",
    },
    searchPlaceholder: { ar: "ابحث عن شركة...", en: "Search companies...", tr: "Sirket ara..." },
    searchAria: { ar: "ابحث عن شركة", en: "Search companies", tr: "Sirket ara" },
    empty: { ar: "لا توجد شركات أخرى مطابقة حالياً.", en: "No matching companies are available right now.", tr: "Su anda eslesen diger sirket yok." },
  },
} as const;

export default function OrganizationDiscoveryPage({ mode }: { mode: Mode }) {
  const { locale, viewer, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [items, setItems] = useState<OrganizationRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageCopy = COPY[mode];

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const typeQuery = mode === "offices" ? "&type=real_estate" : "";
        const response = await fetch(`/api/amrs/organizations?country=${encodeURIComponent(country)}&limit=100${typeQuery}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as { organizations?: OrganizationRow[] };
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (controller.signal.aborted) return;
        const organizations = Array.isArray(data.organizations) ? data.organizations : [];
        setItems(organizations.filter((item) => matchesMode(mode, item.type)));
      } catch {
        if (!controller.signal.aborted) {
          setError(locale === "ar" ? "تعذر تحميل الشركات حالياً" : locale === "tr" ? "Sirketler su anda yuklenemedi" : "The companies could not be loaded right now.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [country, locale, mode]);

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
      currentPath={pageCopy.currentPath}
      adLayout={{ mode: "standard", family: pageCopy.adFamily }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
      pageHeader={{
        eyebrow: pageCopy.eyebrow[locale],
        title: pageCopy.title[locale],
        description: pageCopy.description[locale],
      }}
    >
      <PageContainer className="py-8" dir={dir}>
        <div className="mb-6 flex justify-end">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={pageCopy.searchPlaceholder[locale]}
            className="w-full sm:w-80"
            aria-label={pageCopy.searchAria[locale]}
          />
        </div>

        {error && <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>}

        <Grid columns={3}>
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))
            : filtered.map((item) => (
                <Link key={item.id} href={`${pageCopy.detailBasePath}/${item.id}`} className="block rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{item.type}</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{item.classification}</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">{pick(locale, item, "name")}</h2>
                  <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{pick(locale, item, "description") || item.slug}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{item.countryCode}{item.cityId ? ` • ${item.cityId}` : ""}</span>
                    <span>{item.websiteUrl ? (locale === "ar" ? "موقع إلكتروني" : locale === "tr" ? "Web sitesi" : "Website") : (locale === "ar" ? "بلا موقع" : locale === "tr" ? "Site yok" : "No website")}</span>
                  </div>
                </Link>
              ))}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              {pageCopy.empty[locale]}
            </div>
          )}
        </Grid>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
