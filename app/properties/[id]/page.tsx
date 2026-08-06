"use client";
/* eslint-disable @next/next/no-img-element -- Property images are runtime-managed URLs from the database. */

import { useEffect, useState, use } from "react";
import Link from "next/link";
import AdSlot from "@/src/components/AdSlot";
import PublicPageShell from "@/src/components/PublicPageShell";
import { translations } from "@/src/data/translations";
import { detectCountry, detectCity, selectedCountryOf } from "@/src/data/locations";
import type { ViewerContext } from "@/src/types/site";
import type { PublicProperty } from "@/lib/properties-format";

type Props = { params: Promise<{ id: string }> };

type Locale = "ar" | "en" | "tr";

const copy: Record<Locale, {
  back: string;
  badge: string;
  priceLabel: string;
  details: string;
  descriptionLabel: string;
  featuresLabel: string;
  mapLabel: string;
  similarLabel: string;
  ask: string;
  loading: string;
  notFoundTitle: string;
  notFoundDesc: string;
  notFoundCta: string;
}> = {
  ar: { back: "العودة للعقارات", badge: "عقار مميز", priceLabel: "السعر", details: "تفاصيل العقار", descriptionLabel: "الوصف", featuresLabel: "المزايا", mapLabel: "الموقع على الخريطة", similarLabel: "عقارات مشابهة", ask: "استفسر الآن", loading: "جارٍ تحميل العقار...", notFoundTitle: "العقار غير موجود", notFoundDesc: "عذرًا، لم نتمكن من العثور على هذا العقار أو أنه لم يعد متاحًا.", notFoundCta: "تصفح كل العقارات" },
  en: { back: "Back to properties", badge: "Featured property", priceLabel: "Price", details: "Property details", descriptionLabel: "Description", featuresLabel: "Features", mapLabel: "Location on map", similarLabel: "Similar properties", ask: "Enquire now", loading: "Loading property...", notFoundTitle: "Property not found", notFoundDesc: "Sorry, we could not find this property or it is no longer available.", notFoundCta: "Browse all properties" },
  tr: { back: "Gayrimenkullere dön", badge: "Öne çıkan gayrimenkul", priceLabel: "Fiyat", details: "Mülk detayları", descriptionLabel: "Açıklama", featuresLabel: "Özellikler", mapLabel: "Haritadaki konum", similarLabel: "Benzer gayrimenkuller", ask: "Şimdi sor", loading: "Gayrimenkul yükleniyor...", notFoundTitle: "Gayrimenkul bulunamadı", notFoundDesc: "Üzgünüz, bu gayrimenkul bulunamadı veya artık mevcut değil.", notFoundCta: "Tüm gayrimenkullere göz at" },
};

function detectDeviceType(): "desktop" | "tablet" | "mobile" {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia("(max-width: 720px)").matches) return "mobile";
  if (window.matchMedia("(min-width: 721px) and (max-width: 1024px)").matches) return "tablet";
  return "desktop";
}

export default function PropertyPage({ params }: Props) {
  const { id } = use(params);
  const [locale, setLocale] = useState<Locale>("ar");
  const [country, setCountry] = useState("om");
  const [city, setCity] = useState("om-muscat");
  const [deviceType, setDeviceType] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [viewer] = useState<ViewerContext>({ authenticated: false, email: null, displayName: "Guest", role: "guest", countryCode: null, permissions: [] });
  const [property, setProperty] = useState<PublicProperty | null>(null);
  const [similar, setSimilar] = useState<PublicProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const stored = window.localStorage.getItem("akarpromax-locale");
      setLocale(stored === "en" || stored === "tr" ? stored : "ar");
      const detectedCountry = detectCountry();
      setCountry(detectedCountry);
      setCity(detectCity(detectedCountry));
      setDeviceType(detectDeviceType());
    })();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const [detailRes, similarRes] = await Promise.all([
          fetch(`/api/properties/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal }),
          fetch(`/api/properties?country=${encodeURIComponent(country)}&limit=3`, { cache: "no-store", signal: controller.signal }),
        ]);
        const detailData = detailRes.ok ? await detailRes.json() : null;
        if (controller.signal.aborted) return;
        if (detailData?.property) {
          setProperty(detailData.property);
        }
        const similarData = similarRes.ok ? await similarRes.json() : null;
        if (!controller.signal.aborted && Array.isArray(similarData?.properties)) {
          setSimilar(similarData.properties.filter((item: PublicProperty) => item.id !== id));
        }
      } catch {
        /* property stays null → not-found view */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [country, id]);

  const t = copy[locale];
  const countryMeta = selectedCountryOf(country);
  const localePrice = property ? property.price.toLocaleString(locale === "ar" ? "ar" : "en") : "";
  const imageUrl = property?.imageUrl || "/og.png";
  const adTags = property ? [property.propertyType, property.listingType] : [];

  return (
    <PublicPageShell
      locale={locale}
      copy={translations[locale]}
      viewer={viewer}
      country={country}
      city={city}
      deviceType={deviceType}
      onLogin={() => {}}
      onLogout={() => {}}
    >
      {loading && (
        <div className="container grid min-h-[60vh] place-items-center py-8">
          <p className="text-xs font-bold text-[var(--muted)]">{t.loading}</p>
        </div>
      )}

      {!loading && !property && (
        <div className="container grid min-h-[60vh] place-items-center py-8">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4 opacity-40">🏚️</div>
            <h1 className="text-xl font-black text-[var(--ink)] mb-2">{t.notFoundTitle}</h1>
            <p className="text-sm font-bold text-[var(--muted)] mb-5">{t.notFoundDesc}</p>
            <Link href="/" className="inline-block rounded-lg bg-[var(--blue)] px-5 py-2.5 text-xs font-black text-white">{t.notFoundCta}</Link>
          </div>
        </div>
      )}

      {!loading && property && (
        <>
        <div className="container grid grid-cols-1 gap-8 py-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <Link href="/" className="text-xs font-bold text-[var(--blue)]">← {t.back}</Link>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
            <div className="relative aspect-[16/9] bg-[var(--sky)]">
              <img src={imageUrl} alt={property.title[locale]} className="h-full w-full object-cover" decoding="async" />
              {property.isFeatured && <span className="absolute start-4 top-4 rounded-full bg-[var(--gold)] px-3 py-1 text-[10px] font-black text-[var(--ink)]">{t.badge}</span>}
            </div>
          </div>

          <AdSlot placement="property_after_gallery" locale={locale} country={country} city={city} deviceType={deviceType} path={`/properties/${id}`} entityType="property" entityId={id} categoryId={property.propertyType} tags={adTags} variant="horizontal" className="mt-5" />

          <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--blue)]">{t.details}</p>
            <h1 className="mt-1 text-2xl font-black">{property.title[locale]}</h1>
            <p className="mt-1 text-xs font-bold text-[var(--muted)]">⌖ {property.area[locale] ?? property.title[locale]} — {countryMeta.names[locale]}</p>
            <div className="mt-4 flex items-end gap-2">
              <strong className="text-3xl font-black text-[var(--blue)]">{localePrice}</strong>
              <span className="mb-1 text-sm font-extrabold text-[var(--muted)]">{property.currency}</span>
            </div>
            <span className="mt-1 inline-block text-[10px] font-bold text-[var(--muted)]">{t.priceLabel}</span>
          </div>

          <AdSlot placement="property_below_price" locale={locale} country={country} city={city} deviceType={deviceType} path={`/properties/${id}`} entityType="property" entityId={id} categoryId={property.propertyType} tags={adTags} variant="horizontal" className="mt-5" />

          <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--blue)]">{t.descriptionLabel}</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{property.description[locale]}</p>
          </section>

          <AdSlot placement="property_after_description" locale={locale} country={country} city={city} deviceType={deviceType} path={`/properties/${id}`} entityType="property" entityId={id} categoryId={property.propertyType} tags={adTags} variant="horizontal" className="mt-5" />

          <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--blue)]">{t.featuresLabel}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {property.features[locale].map((feature) => <span key={feature} className="rounded-xl border border-[var(--line)] bg-[var(--sky)] px-3 py-2 text-center text-[11px] font-bold text-[var(--ink)]">{feature}</span>)}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--blue)]">{t.mapLabel}</p>
            <div className="mt-3 grid h-48 place-items-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--muted)]">{property.area[locale] ?? property.title[locale]}</div>
          </section>

          <AdSlot placement="property_before_similar" locale={locale} country={country} city={city} deviceType={deviceType} path={`/properties/${id}`} entityType="property" entityId={id} categoryId={property.propertyType} tags={adTags} variant="horizontal" className="mt-5" />
        </section>

        <aside className="flex flex-col gap-5">
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--blue)]">{t.ask}</p>
            <div className="mt-3 flex flex-col gap-2">
              <input className="h-10 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-xs font-bold outline-none focus:border-[#9ec2ff]" placeholder="name@example.com" aria-label="Email" />
              <button type="button" className="h-10 rounded-lg bg-[var(--blue)] text-xs font-black text-white">{t.ask}</button>
            </div>
          </div>
          <AdSlot placement="property_sidebar_top" locale={locale} country={country} city={city} deviceType={deviceType} path={`/properties/${id}`} entityType="property" entityId={id} categoryId={property.propertyType} tags={adTags} variant="vertical" />
          <AdSlot placement="property_sidebar_middle" locale={locale} country={country} city={city} deviceType={deviceType} path={`/properties/${id}`} entityType="property" entityId={id} categoryId={property.propertyType} tags={adTags} variant="vertical" />
          <AdSlot placement="property_sidebar_bottom" locale={locale} country={country} city={city} deviceType={deviceType} path={`/properties/${id}`} entityType="property" entityId={id} categoryId={property.propertyType} tags={adTags} variant="vertical" />
        </aside>
      </div>

      <section className="border-t border-[var(--line)] bg-white">
        <div className="container py-8">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--blue)]">{t.similarLabel}</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {similar.map((item) => (
              <Link key={item.id} href={`/properties/${item.slug || item.id}`} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
                <div className="h-36 bg-[var(--sky)]" style={{ backgroundImage: `url(${item.imageUrl || "/og.png"})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                <div className="p-4"><strong className="text-sm font-black">{item.title[locale]}</strong><p className="mt-1 text-xs font-bold text-[var(--muted)]">{item.area[locale] ?? item.title[locale]}</p></div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      </>
      )}
    </PublicPageShell>
  );
}
