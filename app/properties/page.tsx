"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { useGeo } from "@/src/contexts/GeoContext";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";
import SearchInput from "@/src/components/ui/SearchInput";
import type { PublicProperty } from "@/lib/properties-format";
import { normalizeApiProperty, type ApiPropertyRecord, type NormalizedProperty } from "@/lib/properties-api-normalize";
import LuxuryPropertyCard from "@/src/components/ui/LuxuryPropertyCard";

const FALLBACK_PROPERTY_TYPES = [
  { id: "all", label_en: "All", label_ar: "الكل", label_tr: "Tümü" },
  { id: "villa", label_en: "Villa", label_ar: "فيلا", label_tr: "Villa" },
  { id: "apartment", label_en: "Apartment", label_ar: "شقة", label_tr: "Daire" },
  { id: "land", label_en: "Land", label_ar: "أرض", label_tr: "Arazi" },
  { id: "commercial", label_en: "Commercial", label_ar: "تجاري", label_tr: "Ticari" },
];

type TaxonomyType = { id: string; slug: string; label_en: string; label_ar: string; label_tr: string; category_slug: string };

// Filter ids ARE the database dealType values — the API stores 'sale' | 'rent'
// and normalizeApiProperty passes dealType through as listingType verbatim.
const LISTING_TYPES = [
  { id: "all", ar: "الكل", en: "All", tr: "Tümü" },
  { id: "sale", ar: "للبيع", en: "For sale", tr: "Satılık" },
  { id: "rent", ar: "للإيجار", en: "For rent", tr: "Kiralık" },
  { id: "auction", ar: "مزاد", en: "Auction", tr: "Açık artırma" },
];

function pick(locale: "ar" | "en" | "tr", property: PublicProperty, key: "title" | "description" | "area") {
  return property[key][locale] ?? property.title[locale];
}

export default function PropertiesPage() {
  const { locale, viewer, dir, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const { countryCode: country, governorate, city: geoCity, district, isGlobal } = useGeo();
  const city = geoCity;
  const [items, setItems] = useState<NormalizedProperty[]>([]);
  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState<"all" | "sale" | "rent" | "auction">("all");
  const [propertyType, setPropertyType] = useState("all");
  const [customType, setCustomType] = useState("");
  const [dbTypes, setDbTypes] = useState<TaxonomyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/admin/properties/taxonomy`, { cache: "no-store", signal: controller.signal });
        if (response.ok) {
          const data = (await response.json()) as { categories?: Array<{ types: TaxonomyType[] }> };
          const types: TaxonomyType[] = [];
          for (const cat of data.categories ?? []) {
            for (const t of cat.types ?? []) {
              types.push(t);
            }
          }
          if (types.length > 0 && !controller.signal.aborted) setDbTypes(types);
        }
      } catch { /* use fallback */ }
    })();
    return () => controller.abort();
  }, []);

  const propertyTypes = dbTypes.length > 0
    ? [{ id: "all", label_en: "All", label_ar: "الكل", label_tr: "Tümü", slug: "all", category_id: "", category_slug: "" }, ...dbTypes.map((t) => ({ id: t.slug, label_en: t.label_en, label_ar: t.label_ar, label_tr: t.label_tr }))]
    : FALLBACK_PROPERTY_TYPES;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const params = new URLSearchParams({ limit: "50", scope: isGlobal ? "global" : "local" });
        if (!isGlobal) {
          params.set("country", country);
          if (governorate) params.set("governorate", governorate);
          if (city) params.set("city", city);
          if (district) params.set("district", district);
        }
        const response = await fetch(`/api/properties?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        const data = (await response.json().catch(() => ({}))) as { data?: ApiPropertyRecord[] };
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const dbProperties = Array.isArray(data.data) ? data.data.map(normalizeApiProperty) : [];
        if (!controller.signal.aborted) {
          // The marketplace shows ONLY real, approved listings from the API.
          // No demo rows are ever merged into the public feed.
          setItems(dbProperties);
        }
      } catch {
        if (!controller.signal.aborted) {
          setItems([]);
          setLoadError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [country, governorate, city, district, isGlobal]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesListingType =
        listingType === "all" ||
        (listingType === "auction" ? item.isAuction : item.listingType === listingType);
      if (!matchesListingType) return false;
      const customTerm = customType.trim().toLowerCase();
      const matchesPropertyType =
        propertyType === "all" ||
        (propertyType === "other"
          ? customTerm === "" ||
            item.propertyType.toLowerCase().includes(customTerm) ||
            [pick(locale, item, "title"), pick(locale, item, "description")]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(customTerm))
          : item.propertyType === propertyType);
      if (!matchesPropertyType) return false;
      if (!term) return true;
      return [pick(locale, item, "title"), pick(locale, item, "description"), pick(locale, item, "area")]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [items, listingType, propertyType, customType, locale, search]);

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
    >
      <PageContainer className="py-8" dir={dir}>
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={locale === "ar" ? "ابحث عن عقار..." : locale === "tr" ? "Gayrimenkul ara..." : "Search properties..."}
                className="w-full sm:w-80"
                aria-label={locale === "ar" ? "ابحث عن عقار" : locale === "tr" ? "Gayrimenkul ara" : "Search properties"}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={listingType}
                onChange={(event) => setListingType(event.target.value as typeof listingType)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                aria-label={locale === "ar" ? "نوع العرض" : locale === "tr" ? "Teklif türü" : "Listing type"}
              >
                {LISTING_TYPES.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt[locale]}
                  </option>
                ))}
              </select>
              <select
                value={propertyType}
                onChange={(event) => setPropertyType(event.target.value)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                aria-label={locale === "ar" ? "نوع العقار" : locale === "tr" ? "Mülk türü" : "Property type"}
              >
                {propertyTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {locale === "ar" ? pt.label_ar : locale === "tr" ? pt.label_tr : pt.label_en}
                  </option>
                ))}
                <option value="other">
                  {locale === "ar" ? "أخرى" : locale === "tr" ? "Diğer" : "Other"}
                </option>
              </select>
              {propertyType === "other" && (
                <input
                  type="text"
                  value={customType}
                  onChange={(event) => setCustomType(event.target.value)}
                  placeholder={locale === "ar" ? "اكتب نوع العقار..." : locale === "tr" ? "Mülk türünü yazın..." : "Type property type..."}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  aria-label={locale === "ar" ? "نوع عقار آخر" : locale === "tr" ? "Diğer mülk türü" : "Other property type"}
                />
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 text-xs font-semibold text-gray-500 dark:text-gray-400">
          {locale === "ar" ? `${filtered.length} عقار` : locale === "tr" ? `${filtered.length} mülk` : `${filtered.length} properties`}
        </div>

        <Grid columns={3} className="gap-6">
          {loading
            ? Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse h-64 flex items-center justify-center">
                  <span className="text-gray-400">جارٍ التحميل...</span>
                </div>
              ))
            : filtered.map((property) => (
                <LuxuryPropertyCard
                  key={property.id}
                  property={property}
                  className="col-span-2 md:col-span-1"
                />
              ))}
        </Grid>

        {!loading && loadError && (
          <div className="col-span-full rounded-2xl border border-amber-300 bg-amber-50 px-6 py-12 text-center text-sm font-bold text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            {locale === "ar"
              ? "تعذر تحميل العقارات من الخادم. حاول تحديث الصفحة."
              : locale === "tr"
                ? "Mülkler sunucudan yüklenemedi. Sayfayı yenilemeyi deneyin."
                : "Could not load properties from the server. Try refreshing the page."}
          </div>
        )}

        {!loading && !loadError && filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            {locale === "ar" ? "لا توجد عقارات مطابقة حالياً." : locale === "tr" ? "Şu anda eşleşen mülk yok." : "No matching properties are available right now."}
          </div>
        )}

        <div className="mt-8 text-right text-xs text-gray-500 dark:text-gray-400">
          <Link
            href="/properties"
            className="hover:underline underline-offset-2 transition-colors"
          >
            {locale === "ar" ? "عرض الكل" : locale === "tr" ? "Tümünü Gör" : "View All"}
          </Link>
        </div>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
