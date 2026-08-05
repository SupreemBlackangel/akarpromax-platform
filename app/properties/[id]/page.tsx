"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import AdSlot from "@/src/components/AdSlot";
import PublicPageShell from "@/src/components/PublicPageShell";
import { translations } from "@/src/data/translations";
import { detectCountry, detectCity, selectedCountryOf, selectedCityOf } from "@/src/data/locations";
import type { ViewerContext } from "@/src/types/site";

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
}> = {
  ar: { back: "العودة للعقارات", badge: "عقار مميز", priceLabel: "السعر", details: "تفاصيل العقار", descriptionLabel: "الوصف", featuresLabel: "المزايا", mapLabel: "الموقع على الخريطة", similarLabel: "عقارات مشابهة", ask: "استفسر الآن" },
  en: { back: "Back to properties", badge: "Featured property", priceLabel: "Price", details: "Property details", descriptionLabel: "Description", featuresLabel: "Features", mapLabel: "Location on map", similarLabel: "Similar properties", ask: "Enquire now" },
  tr: { back: "Gayrimenkullere dön", badge: "Öne çıkan gayrimenkul", priceLabel: "Fiyat", details: "Mülk detayları", descriptionLabel: "Açıklama", featuresLabel: "Özellikler", mapLabel: "Haritadaki konum", similarLabel: "Benzer gayrimenkuller", ask: "Şimdi sor" },
};

const property = {
  title: { ar: "فيلا عصرية بإطلالة بحرية", en: "Modern sea-view villa", tr: "Deniz manzaralı modern villa" },
  area: { ar: "المعبر، مسقط", en: "Al Ma'abeel, Muscat", tr: "El Ma'abil, Maskat" },
  price: 189000,
  currency: "ر.ع",
  description: {
    ar: "فيلا مستقلة من ثلاث غرف نوم وصالة ومطبخ أمريكي وحديقة خاصة، بمساحة بناء 350 متر مربع على أرض 500 متر مربع، وتتميز بإطلالة بحرية مباشرة وموقع قريب من الخدمات والمدارس.",
    en: "A detached three-bedroom villa with living room, American kitchen and private garden, 350 m² built-up area on a 500 m² plot, featuring a direct sea view close to services and schools.",
    tr: "Üç yatak odalı, salon, amerikan mutfak ve özel bahçeli müstakil villa; 500 m² arsa üzerinde 350 m² inşaat alanı, doğrudan deniz manzarası, hizmetlere ve okullara yakın.",
  },
  features: [
    { ar: "3 غرف نوم", en: "3 bedrooms", tr: "3 yatak odası" },
    { ar: "صالة + غرفة معيشة", en: "Living room + hall", tr: "Salon + oturma odası" },
    { ar: "مطبخ أمريكي", en: "American kitchen", tr: "Amerikan mutfak" },
    { ar: "حديقة خاصة 500م²", en: "Private garden 500m²", tr: "Özel bahçe 500m²" },
    { ar: "موقف سيارتين", en: "Two-car parking", tr: "İki araçlık otopark" },
    { ar: "إطلالة بحرية", en: "Sea view", tr: "Deniz manzarası" },
    { ar: "تكييف مركزي", en: "Central AC", tr: "Merkezi klima" },
    { ar: "غرفة خادمة", en: "Maids room", tr: "Hizmetçi odası" },
  ],
};

function detectDeviceType(): "desktop" | "tablet" | "mobile" {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia("(max-width: 720px)").matches) return "mobile";
  if (window.matchMedia("(min-width: 721px) and (max-width: 1024px)").matches) return "tablet";
  return "desktop";
}

export default function PropertyDemoPage({ params }: Props) {
  const { id } = use(params);
  const [locale, setLocale] = useState<Locale>("ar");
  const [country, setCountry] = useState("om");
  const [city, setCity] = useState("om-muscat");
  const [deviceType, setDeviceType] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [viewer] = useState<ViewerContext>({ authenticated: false, email: null, displayName: "Guest", role: "guest", countryCode: null, permissions: [] });

  useEffect(() => {
    void (async () => {
      const stored = window.localStorage.getItem("akarpromax-locale");
      const detectedCountry = detectCountry();
      setLocale(stored === "en" || stored === "tr" ? stored : "ar");
      setCountry(detectedCountry);
      setCity(detectCity(detectedCountry));
      setDeviceType(detectDeviceType());
    })();
  }, []);

  const t = copy[locale];
  const countryMeta = selectedCountryOf(country);
  const cityMeta = selectedCityOf(country, city);
  const imageUrl = `/og.png`;

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
      <div className="container grid grid-cols-1 gap-8 py-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <Link href="/" className="text-xs font-bold text-[var(--blue)]">← {t.back}</Link>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
            <div className="relative aspect-[16/9] bg-[var(--sky)]">
              <img src={imageUrl} alt={property.title[locale]} className="h-full w-full object-cover" decoding="async" />
              <span className="absolute start-4 top-4 rounded-full bg-[var(--gold)] px-3 py-1 text-[10px] font-black text-[var(--ink)]">{t.badge}</span>
            </div>
          </div>

          <AdSlot placement="property_after_gallery" locale={locale} country={country} city={city} deviceType={deviceType} path="/properties/15" entityType="property" entityId={id} categoryId="villa" tags={["villa", "sea-view", "for-sale"]} variant="horizontal" className="mt-5" />

          <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--blue)]">{t.details}</p>
            <h1 className="mt-1 text-2xl font-black">{property.title[locale]}</h1>
            <p className="mt-1 text-xs font-bold text-[var(--muted)]">⌖ {property.area[locale]} — {countryMeta.names[locale]}</p>
            <div className="mt-4 flex items-end gap-2">
              <strong className="text-3xl font-black text-[var(--blue)]">{property.price.toLocaleString(locale === "ar" ? "ar" : "en")}</strong>
              <span className="mb-1 text-sm font-extrabold text-[var(--muted)]">{property.currency}</span>
            </div>
            <span className="mt-1 inline-block text-[10px] font-bold text-[var(--muted)]">{t.priceLabel}</span>
          </div>

          <AdSlot placement="property_below_price" locale={locale} country={country} city={city} deviceType={deviceType} path="/properties/15" entityType="property" entityId={id} categoryId="villa" tags={["villa"]} variant="horizontal" className="mt-5" />

          <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--blue)]">{t.descriptionLabel}</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{property.description[locale]}</p>
          </section>

          <AdSlot placement="property_after_description" locale={locale} country={country} city={city} deviceType={deviceType} path="/properties/15" entityType="property" entityId={id} categoryId="villa" tags={["villa", "garden"]} variant="horizontal" className="mt-5" />

          <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--blue)]">{t.featuresLabel}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {property.features.map((feature) => <span key={feature.en} className="rounded-xl border border-[var(--line)] bg-[var(--sky)] px-3 py-2 text-center text-[11px] font-bold text-[var(--ink)]">{feature[locale]}</span>)}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--blue)]">{t.mapLabel}</p>
            <div className="mt-3 grid h-48 place-items-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--muted)]">{property.area[locale]}</div>
          </section>

          <AdSlot placement="property_before_similar" locale={locale} country={country} city={city} deviceType={deviceType} path="/properties/15" entityType="property" entityId={id} categoryId="villa" tags={["villa"]} variant="horizontal" className="mt-5" />
        </section>

        <aside className="flex flex-col gap-5">
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--blue)]">{t.ask}</p>
            <div className="mt-3 flex flex-col gap-2">
              <input className="h-10 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-xs font-bold outline-none focus:border-[#9ec2ff]" placeholder="name@example.com" />
              <button type="button" className="h-10 rounded-lg bg-[var(--blue)] text-xs font-black text-white">{t.ask}</button>
            </div>
          </div>
          <AdSlot placement="property_sidebar_top" locale={locale} country={country} city={city} deviceType={deviceType} path="/properties/15" entityType="property" entityId={id} categoryId="villa" tags={["villa"]} variant="vertical" />
          <AdSlot placement="property_sidebar_middle" locale={locale} country={country} city={city} deviceType={deviceType} path="/properties/15" entityType="property" entityId={id} categoryId="villa" tags={["villa"]} variant="vertical" />
          <AdSlot placement="property_sidebar_bottom" locale={locale} country={country} city={city} deviceType={deviceType} path="/properties/15" entityType="property" entityId={id} categoryId="villa" tags={["villa"]} variant="vertical" />
        </aside>
      </div>

      <section className="border-t border-[var(--line)] bg-white">
        <div className="container py-8">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--blue)]">{t.similarLabel}</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((index) => (
              <article key={index} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
                <div className="h-36 bg-[var(--sky)]" />
                <div className="p-4"><strong className="text-sm font-black">{property.title[locale]}</strong><p className="mt-1 text-xs font-bold text-[var(--muted)]">{property.area[locale]}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
