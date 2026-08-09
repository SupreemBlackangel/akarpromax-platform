"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";
import SearchInput from "@/src/components/ui/SearchInput";
import type { PublicProperty } from "@/lib/properties-format";

function pick(locale: "ar" | "en" | "tr", property: PublicProperty, key: "title" | "description" | "area") {
  return property[key][locale] ?? property.title[locale];
}

export default function PropertiesPage() {
  const { locale, viewer, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [items, setItems] = useState<PublicProperty[]>([]);
  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState<"all" | "for-sale" | "for-rent">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/properties?country=${encodeURIComponent(country)}&limit=24`, { cache: "no-store", signal: controller.signal });
        const data = (await response.json().catch(() => ({}))) as { properties?: PublicProperty[] };
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!controller.signal.aborted) setItems(Array.isArray(data.properties) ? data.properties : []);
      } catch {
        if (!controller.signal.aborted) {
          setError(locale === "ar" ? "تعذر تحميل العقارات حالياً" : locale === "tr" ? "Gayrimenkuller su anda yuklenemedi" : "Properties could not be loaded right now.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [country, locale]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesListingType = listingType === "all" || item.listingType === listingType;
      if (!matchesListingType) return false;
      if (!term) return true;
      return [pick(locale, item, "title"), pick(locale, item, "description"), pick(locale, item, "area")]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [items, listingType, locale, search]);

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/properties"
      adLayout={{ mode: "standard", family: "properties" }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
      pageHeader={{
        eyebrow: locale === "ar" ? "العقارات" : locale === "tr" ? "Gayrimenkuller" : "Properties",
        title: locale === "ar" ? "اكتشف العقارات" : locale === "tr" ? "Gayrimenkulleri Kesfedin" : "Discover Properties",
        description: locale === "ar"
          ? "واجهة اكتشاف مخصصة للعقارات المعروضة للبيع أو الإيجار، مع بقاءها منفصلة عن الشركات والخدمات."
          : locale === "tr"
            ? "Sirketlerden ve hizmetlerden ayri bir satin alma/kiralama gayrimenkul kesif deneyimi."
            : "A dedicated property discovery page for sale and rent listings, kept distinct from companies and services.",
      }}
    >
      <PageContainer className="py-8" dir={dir}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setListingType("all")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${listingType === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}>
              {locale === "ar" ? "الكل" : locale === "tr" ? "Tumu" : "All"}
            </button>
            <button type="button" onClick={() => setListingType("for-sale")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${listingType === "for-sale" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}>
              {locale === "ar" ? "للبيع" : locale === "tr" ? "Satilik" : "For sale"}
            </button>
            <button type="button" onClick={() => setListingType("for-rent")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${listingType === "for-rent" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}>
              {locale === "ar" ? "للإيجار" : locale === "tr" ? "Kiralik" : "For rent"}
            </button>
          </div>
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={locale === "ar" ? "ابحث عن عقار..." : locale === "tr" ? "Gayrimenkul ara..." : "Search properties..."}
            className="w-full sm:w-80"
            aria-label={locale === "ar" ? "ابحث عن عقار" : locale === "tr" ? "Gayrimenkul ara" : "Search properties"}
          />
        </div>

        {error && <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>}

        <Grid columns={3}>
          {loading
            ? Array.from({ length: 9 }).map((_, index) => <div key={index} className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)
            : filtered.map((property) => (
                <Link key={property.id} href={`/properties/${property.slug || property.id}`} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700">
                  <div className="relative h-48 bg-gray-100 dark:bg-gray-800">
                    {property.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- dynamic property image URLs
                      <img src={property.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                    <span className="absolute end-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-gray-900">
                      {property.listingType === "for-rent"
                        ? (locale === "ar" ? "إيجار" : locale === "tr" ? "Kiralik" : "For rent")
                        : (locale === "ar" ? "بيع" : locale === "tr" ? "Satilik" : "For sale")}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{pick(locale, property, "area")}</p>
                    <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">{pick(locale, property, "title")}</h2>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{pick(locale, property, "description")}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <strong className="text-lg font-black text-blue-700 dark:text-blue-300">{property.price.toLocaleString(locale === "ar" ? "ar" : "en")} {property.currency}</strong>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{property.bedrooms} • {property.bathrooms}</span>
                    </div>
                  </div>
                </Link>
              ))}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              {locale === "ar" ? "لا توجد عقارات مطابقة حالياً." : locale === "tr" ? "Su anda eslesen gayrimenkul yok." : "No matching properties are available right now."}
            </div>
          )}
        </Grid>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
