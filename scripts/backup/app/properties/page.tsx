"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";
import SearchInput from "@/src/components/ui/SearchInput";
import { DEMO_PROPERTIES } from "@/src/data/demo-properties";
import type { PublicProperty } from "@/lib/properties-format";

const FALLBACK_PROPERTY_TYPES = [
  { id: "all", label_en: "All", label_ar: "الكل", label_tr: "Tümü" },
  { id: "villa", label_en: "Villa", label_ar: "فيلا", label_tr: "Villa" },
  { id: "apartment", label_en: "Apartment", label_ar: "شقة", label_tr: "Daire" },
  { id: "land", label_en: "Land", label_ar: "أرض", label_tr: "Arazi" },
  { id: "commercial", label_en: "Commercial", label_ar: "تجاري", label_tr: "Ticari" },
];

type TaxonomyType = { id: string; slug: string; label_en: string; label_ar: string; label_tr: string; category_slug: string };

const LISTING_TYPES = [
  { id: "all", ar: "الكل", en: "All", tr: "Tümü" },
  { id: "for-sale", ar: "للبيع", en: "For sale", tr: "Satılık" },
  { id: "for-rent", ar: "للإيجار", en: "For rent", tr: "Kiralık" },
];

function pick(locale: "ar" | "en" | "tr", property: PublicProperty, key: "title" | "description" | "area") {
  return property[key][locale] ?? property.title[locale];
}

export default function PropertiesPage() {
  const { locale, viewer, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [items, setItems] = useState<PublicProperty[]>([]);
  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState<"all" | "for-sale" | "for-rent">("all");
  const [propertyType, setPropertyType] = useState("all");
  const [dbTypes, setDbTypes] = useState<TaxonomyType[]>([]);
  const [loading, setLoading] = useState(true);

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
      try {
        const response = await fetch(`/api/properties?country=${encodeURIComponent(country)}&limit=50`, { cache: "no-store", signal: controller.signal });
        const data = (await response.json().catch(() => ({}))) as { properties?: PublicProperty[] };
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const dbProperties = Array.isArray(data.properties) ? data.properties : [];
        if (!controller.signal.aborted) {
          const allProperties = [...DEMO_PROPERTIES.filter((p) => p.countryCode === country), ...dbProperties];
          setItems(allProperties);
        }
      } catch {
        if (!controller.signal.aborted) {
          setItems(DEMO_PROPERTIES.filter((p) => p.countryCode === country));
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
      const matchesPropertyType = propertyType === "all" || item.propertyType === propertyType;
      if (!matchesPropertyType) return false;
      if (!term) return true;
      return [pick(locale, item, "title"), pick(locale, item, "description"), pick(locale, item, "area")]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [items, listingType, propertyType, locale, search]);

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
          ? "ابحث بالموقع أولاً: الدولة، المحافظة، المدينة. ثم حدد نوع العقار ونوع العرض."
          : locale === "tr"
            ? "Önce konuma göre arayın: ülke, ilçe, şehir. Sonra mülk türü ve teklif türünü seçin."
            : "Search by location first: country, governorate, city. Then select property type and listing type.",
      }}
    >
      <PageContainer className="py-8" dir={dir}>
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {locale === "ar" ? "نوع العرض:" : locale === "tr" ? "Teklif türü:" : "Listing:"}
            </span>
            {LISTING_TYPES.map((lt) => (
              <button
                key={lt.id}
                type="button"
                onClick={() => setListingType(lt.id as typeof listingType)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${listingType === lt.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"}`}
              >
                {lt[locale]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {locale === "ar" ? "نوع العقار:" : locale === "tr" ? "Mülk türü:" : "Property:"}
            </span>
            {propertyTypes.map((pt) => (
              <button
                key={pt.id}
                type="button"
                onClick={() => setPropertyType(pt.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${propertyType === pt.id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"}`}
              >
                {locale === "ar" ? pt.label_ar : locale === "tr" ? pt.label_tr : pt.label_en}
              </button>
            ))}
          </div>
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={locale === "ar" ? "ابحث عن عقار..." : locale === "tr" ? "Gayrimenkul ara..." : "Search properties..."}
            className="w-full sm:w-80"
            aria-label={locale === "ar" ? "ابحث عن عقار" : locale === "tr" ? "Gayrimenkul ara" : "Search properties"}
          />
        </div>

        <div className="mb-4 text-xs font-semibold text-gray-500 dark:text-gray-400">
          {locale === "ar" ? `${filtered.length} عقار` : locale === "tr" ? `${filtered.length} mülk` : `${filtered.length} properties`}
        </div>

        <Grid columns={3}>
          {loading
            ? Array.from({ length: 9 }).map((_, index) => <div key={index} className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)
            : filtered.map((property) => (
                <Link key={property.id} href={`/properties/${property.slug || property.id}`} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700">
                  <div className="relative h-48 bg-gray-100 dark:bg-gray-800">
                    {property.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- dynamic property image URLs
                      <img src={property.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-gray-300 dark:text-gray-600">
                        {property.propertyType === "villa" ? "🏠" : property.propertyType === "apartment" ? "🏢" : property.propertyType === "land" ? "🌍" : "🏪"}
                      </div>
                    )}
                    <span className="absolute end-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-gray-900">
                      {property.listingType === "for-rent"
                        ? (locale === "ar" ? "إيجار" : locale === "tr" ? "Kiralık" : "For rent")
                        : (locale === "ar" ? "بيع" : locale === "tr" ? "Satılık" : "For sale")}
                    </span>
                    {property.id.startsWith("demo-") && (
                      <span className="absolute start-3 top-3 rounded-full bg-amber-500/90 px-2 py-0.5 text-[9px] font-bold text-white">
                        {locale === "ar" ? "عرض" : locale === "tr" ? "Demo" : "Demo"}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{pick(locale, property, "area")}</p>
                    <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">{pick(locale, property, "title")}</h2>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{pick(locale, property, "description")}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <strong className="text-lg font-black text-blue-700 dark:text-blue-300">{property.price.toLocaleString(locale === "ar" ? "ar" : "en")} {property.currency}</strong>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {property.bedrooms > 0 && `${property.bedrooms} غرف`}
                        {property.bedrooms > 0 && property.bathrooms > 0 && " • "}
                        {property.bathrooms > 0 && `${property.bathrooms} حمّام`}
                        {property.landArea && ` • ${property.landArea} م²`}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              {locale === "ar" ? "لا توجد عقارات مطابقة حالياً." : locale === "tr" ? "Şu anda eşleşen mülk yok." : "No matching properties are available right now."}
            </div>
          )}
        </Grid>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
