"use client";
/* eslint-disable @next/next/no-img-element -- Property images are runtime-managed URLs from the database. */

import { useEffect, useState, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MapPin, Bed, Bath, Car, Maximize, ArrowRight, Heart, MessageCircle, Gavel, Timer } from "lucide-react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { translations } from "@/src/data/translations";
import { useGeo } from "@/src/contexts/GeoContext";
import type { PublicProperty } from "@/lib/properties-format";
import { normalizeApiProperty, type ApiPropertyRecord, type NormalizedProperty } from "@/lib/properties-api-normalize";
import PageContainer from "@/src/components/layout/PageContainer";
import { useServicesPage } from "@/src/components/services/useServicesPage";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "@/src/components/ui/Toast";

const PropertyDetailMap = dynamic(() => import("@/components/properties/PropertyDetailMap"), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full rounded-2xl bg-[color:var(--color-surface-soft)] animate-pulse" />,
});

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
  const { countryCode: country, city } = useGeo();
  const [deviceType, setDeviceType] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const { viewer, openLogin, handleLogout, AccountDialog } = useServicesPage();
  const [property, setProperty] = useState<NormalizedProperty | null>(null);
  const [advertiserId, setAdvertiserId] = useState<string | null>(null);
  const [isOwnProperty, setIsOwnProperty] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [auction, setAuction] = useState<{ currentPrice: number; endDate: string | null; status: string | null; type: string | null; bidCount: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Live countdown tick while an auction panel is visible.
  useEffect(() => {
    if (!auction?.endDate) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [auction?.endDate]);
  const [similar, setSimilar] = useState<PublicProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const { isFavorite, loading: favoriteBusy, toggleFavorite } = useFavorites(id);

  useEffect(() => {
    void (async () => {
      const stored = window.localStorage.getItem("akarpromax-locale");
      setLocale(stored === "en" || stored === "tr" ? stored : "ar");
      setDeviceType(detectDeviceType());
    })();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const [detailRes, similarRes] = await Promise.all([
          fetch(`/api/properties/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal }),
          fetch(`/api/properties?limit=3`, { cache: "no-store", signal: controller.signal }),
        ]);
        const detailData = detailRes.ok ? await detailRes.json() : null;
        if (controller.signal.aborted) return;
        if (detailData?.data) {
          setProperty(normalizeApiProperty(detailData.data as ApiPropertyRecord));
          setAdvertiserId(typeof detailData.data.userId === "string" ? detailData.data.userId : null);
          setIsOwnProperty(Boolean(detailData.data.isOwner));
          const raw = detailData.data as Record<string, unknown>;
          if (raw.isAuction) {
            setAuction({
              currentPrice: Number(raw.auctionCurrentPrice ?? raw.auctionStartPrice ?? 0),
              endDate: raw.auctionEndDate ? String(raw.auctionEndDate) : null,
              status: typeof raw.auctionStatus === "string" ? raw.auctionStatus : null,
              type: typeof raw.auctionType === "string" ? raw.auctionType : null,
              bidCount: Number(raw.auctionBidCount ?? 0),
            });
          } else {
            setAuction(null);
          }
          setActiveImage(0);
        }
        const similarData = similarRes.ok ? await similarRes.json() : null;
        if (!controller.signal.aborted && Array.isArray(similarData?.data)) {
          setSimilar(
            (similarData.data as ApiPropertyRecord[])
              .filter((item: ApiPropertyRecord) => item.id !== id)
              .map((item: ApiPropertyRecord) => normalizeApiProperty(item)),
          );
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
  const localePrice = property ? property.price.toLocaleString(locale === "ar" ? "ar" : "en") : "";
  const galleryImages = property?.mediaItems?.filter((m) => m.type === "image") ?? [];
  const imageUrl = galleryImages[activeImage]?.url || property?.imageUrl || "/placeholder.svg";

  return (
    <>
    <PublicPageShell
      locale={locale}
      copy={translations[locale]}
      viewer={viewer}
      country={country}
      city={city}
      deviceType={deviceType}
      currentPath={`/properties/${id}`}
      adLayout={property ? { mode: "standard", family: "property-detail", entityType: "property", entityId: id, categoryId: property.propertyType, tags: [property.propertyType, property.listingType] } : undefined}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      {loading && (
        <PageContainer className="grid min-h-[60vh] place-items-center py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--color-primary)] border-t-transparent" />
            <p className="text-xs font-bold text-[color:var(--color-text-muted)]">{t.loading}</p>
          </div>
        </PageContainer>
      )}

      {!loading && !property && (
        <PageContainer className="grid min-h-[60vh] place-items-center py-8">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4 opacity-40">🏚️</div>
            <h1 className="text-xl font-black text-[color:var(--color-text-primary)] mb-2">{t.notFoundTitle}</h1>
            <p className="text-sm font-bold text-[color:var(--color-text-muted)] mb-5">{t.notFoundDesc}</p>
            <Link href="/properties" className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-5 py-2.5 text-xs font-black text-white">{t.notFoundCta}</Link>
          </div>
        </PageContainer>
      )}

      {!loading && property && (
        <>
          <PageContainer className="py-8">
            <Link href="/properties" className="inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--color-primary)]">
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
              {t.back}
            </Link>

            <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-3">
              <section className="lg:col-span-2">
                <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                  <div className="relative aspect-[16/9] bg-[color:var(--color-surface-soft)]">
                    <img src={imageUrl} alt={property.title[locale]} width={1280} height={720} loading="eager" fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    {property.isFeatured && <span className="absolute start-4 top-4 rounded-full bg-[color:var(--color-accent)] px-3 py-1 text-[10px] font-black text-[color:var(--color-text-primary)] shadow-sm">{t.badge}</span>}
                  </div>
                  {galleryImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto p-3" role="tablist" aria-label={locale === "ar" ? "معرض الصور" : "Image gallery"}>
                      {galleryImages.map((image, index) => (
                        <button
                          key={`${image.url}-${index}`}
                          type="button"
                          role="tab"
                          aria-selected={index === activeImage}
                          onClick={() => setActiveImage(index)}
                          className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition ${index === activeImage ? "border-[color:var(--color-primary)]" : "border-transparent opacity-70 hover:opacity-100"}`}
                        >
                          <img src={image.url} alt="" width={96} height={64} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-3xl border border-[color:var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[color:var(--color-primary)]">{t.details}</p>
                  <h1 className="mt-2 text-2xl font-black text-[color:var(--color-text-primary)]">{property.title[locale]}</h1>
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--color-text-muted)]">
                    <MapPin className="h-3.5 w-3.5" />
                    {property.district ?? property.area[locale] ?? property.title[locale]} — {city}
                  </p>

                  <div className="mt-5 border-t border-[color:var(--color-border)] pt-5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[color:var(--color-primary)]">{t.descriptionLabel}</p>
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-text-secondary)]">{property.description[locale]}</p>
                  </div>

                  {property.features[locale]?.length > 0 && (
                    <div className="mt-5 border-t border-[color:var(--color-border)] pt-5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[color:var(--color-primary)]">{t.featuresLabel}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {property.features[locale].map((feature) => (
                          <span key={feature} className="rounded-full bg-[color:var(--color-surface-muted)] px-3 py-1.5 text-xs font-bold text-[color:var(--color-text-primary)]">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {property.latitude != null && property.longitude != null && (
                  <div className="mt-6 rounded-3xl border border-[color:var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[color:var(--color-primary)]">{t.mapLabel}</p>
                    <div className="mt-3">
                      <PropertyDetailMap latitude={property.latitude} longitude={property.longitude} />
                    </div>
                  </div>
                )}
              </section>

              <aside className="lg:sticky lg:top-6 lg:self-start">
                <div className="flex flex-col gap-5">
                  {auction && (
                    <div className="overflow-hidden rounded-3xl border border-amber-300/60 bg-gradient-to-br from-amber-50 via-white to-amber-100/60 p-6 shadow-sm dark:border-amber-600/40 dark:from-amber-950/40 dark:via-transparent dark:to-amber-900/20">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white shadow">
                          <Gavel className="h-3.5 w-3.5" />
                          {auction.status === "active"
                            ? (locale === "ar" ? "مزاد جارٍ الآن" : locale === "tr" ? "Müzayede devam ediyor" : "Live auction")
                            : (locale === "ar" ? "عقار بنظام المزاد" : locale === "tr" ? "Müzayedeli mülk" : "Auction listing")}
                        </span>
                        <span className="text-[10px] font-black text-amber-700 dark:text-amber-300">
                          {auction.type === "fixed"
                            ? (locale === "ar" ? "مزاد مغلق" : locale === "tr" ? "Kapalı" : "Closed")
                            : (locale === "ar" ? "مزاد مفتوح" : locale === "tr" ? "Açık" : "Open")}
                        </span>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80">
                        {locale === "ar" ? "السعر الحالي" : locale === "tr" ? "Güncel fiyat" : "Current price"}
                      </p>
                      <p className="mt-0.5 flex items-baseline gap-2">
                        <strong className="text-3xl font-black text-amber-700 dark:text-amber-300" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {auction.currentPrice.toLocaleString(locale === "ar" ? "ar" : "en")}
                        </strong>
                        <span className="text-sm font-extrabold text-[color:var(--color-text-muted)]">{property.currency}</span>
                      </p>
                      <p className="mt-1 text-xs font-bold text-[color:var(--color-text-muted)]">
                        {auction.bidCount} {locale === "ar" ? "مزايدة" : locale === "tr" ? "teklif" : "bids"}
                      </p>
                      {auction.endDate && (() => {
                        const remaining = new Date(auction.endDate).getTime() - now;
                        if (remaining <= 0) {
                          return <p className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-center text-xs font-black text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{locale === "ar" ? "انتهى وقت المزاد" : locale === "tr" ? "Müzayede sona erdi" : "Auction ended"}</p>;
                        }
                        const d = Math.floor(remaining / 86_400_000);
                        const h = Math.floor((remaining % 86_400_000) / 3_600_000);
                        const m = Math.floor((remaining % 3_600_000) / 60_000);
                        const sec = Math.floor((remaining % 60_000) / 1000);
                        const cell = (value: number, label: string) => (
                          <div className="rounded-xl bg-white/80 px-2 py-1.5 text-center shadow-sm dark:bg-black/20">
                            <b className="block text-lg font-black text-amber-700 dark:text-amber-300" style={{ fontVariantNumeric: "tabular-nums" }}>{String(value).padStart(2, "0")}</b>
                            <small className="text-[9px] font-black text-[color:var(--color-text-muted)]">{label}</small>
                          </div>
                        );
                        return (
                          <div className="mt-3">
                            <p className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80"><Timer className="h-3 w-3" /> {locale === "ar" ? "الوقت المتبقي" : locale === "tr" ? "Kalan süre" : "Time left"}</p>
                            <div className="grid grid-cols-4 gap-1.5" dir="ltr">
                              {cell(d, locale === "ar" ? "يوم" : locale === "tr" ? "gün" : "days")}
                              {cell(h, locale === "ar" ? "ساعة" : locale === "tr" ? "saat" : "hrs")}
                              {cell(m, locale === "ar" ? "دقيقة" : locale === "tr" ? "dk" : "min")}
                              {cell(sec, locale === "ar" ? "ثانية" : locale === "tr" ? "sn" : "sec")}
                            </div>
                          </div>
                        );
                      })()}
                      <Link
                        href={`/auctions/${property.id}`}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-600"
                      >
                        <Gavel className="h-4 w-4" />
                        {locale === "ar" ? "ادخل المزاد وزايد الآن" : locale === "tr" ? "Müzayedeye katıl" : "Enter the auction"}
                      </Link>
                    </div>
                  )}
                  <div className="rounded-3xl border border-[color:var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
                    <div className="flex items-baseline gap-2">
                      <strong className="text-3xl font-black text-[color:var(--color-primary)]">{localePrice}</strong>
                      <span className="text-sm font-extrabold text-[color:var(--color-text-muted)]">{property.currency}</span>
                    </div>
                    <span className="mt-1 inline-block text-[10px] font-bold text-[color:var(--color-text-muted)]">{t.priceLabel}</span>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {property.propertyType && (
                        <span className="rounded-full bg-[color:var(--color-primary-soft)] px-3 py-1 text-[10px] font-black text-[color:var(--color-primary)]">{property.propertyType}</span>
                      )}
                      {property.listingType && (
                        <span className="rounded-full bg-[color:var(--color-surface-muted)] px-3 py-1 text-[10px] font-black text-[color:var(--color-text-secondary)]">{property.listingType}</span>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {property.bedrooms > 0 && (
                        <div className="flex items-center gap-2.5 rounded-2xl bg-[color:var(--color-surface-muted)] px-3 py-3">
                          <Bed className="h-4 w-4 shrink-0 text-[color:var(--color-primary)]" />
                          <span className="text-xs font-bold text-[color:var(--color-text-primary)]">{property.bedrooms} {locale === "ar" ? "غرف" : locale === "tr" ? "yatak odası" : "beds"}</span>
                        </div>
                      )}
                      {property.bathrooms > 0 && (
                        <div className="flex items-center gap-2.5 rounded-2xl bg-[color:var(--color-surface-muted)] px-3 py-3">
                          <Bath className="h-4 w-4 shrink-0 text-[color:var(--color-primary)]" />
                          <span className="text-xs font-bold text-[color:var(--color-text-primary)]">{property.bathrooms} {locale === "ar" ? "حمامات" : locale === "tr" ? "banyo" : "baths"}</span>
                        </div>
                      )}
                      {property.parkingSlots > 0 && (
                        <div className="flex items-center gap-2.5 rounded-2xl bg-[color:var(--color-surface-muted)] px-3 py-3">
                          <Car className="h-4 w-4 shrink-0 text-[color:var(--color-primary)]" />
                          <span className="text-xs font-bold text-[color:var(--color-text-primary)]">{property.parkingSlots} {locale === "ar" ? "مواقف" : locale === "tr" ? "park yeri" : "parking"}</span>
                        </div>
                      )}
                      {(property.builtUpArea ?? 0) > 0 && (
                        <div className="flex items-center gap-2.5 rounded-2xl bg-[color:var(--color-surface-muted)] px-3 py-3">
                          <Maximize className="h-4 w-4 shrink-0 text-[color:var(--color-primary)]" />
                          <span className="text-xs font-bold text-[color:var(--color-text-primary)]">{property.builtUpArea} م²</span>
                        </div>
                      )}
                    </div>

                    {isOwnProperty ? (
                      <p className="mt-5 rounded-xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-4 py-3 text-center text-xs font-bold text-[color:var(--color-text-muted)]">
                        {locale === "ar" ? "هذا إعلانك — تصل رسائل المهتمين إلى صندوق الدردشة لديك." : locale === "tr" ? "Bu sizin ilanınız — ilgilenenlerin mesajları sohbet kutunuza gelir." : "This is your listing — enquiries arrive in your chat inbox."}
                      </p>
                    ) : (
                    <button
                      type="button"
                      disabled={contactBusy || !advertiserId}
                      onClick={async () => {
                        if (!viewer.authenticated) {
                          openLogin("login");
                          return;
                        }
                        if (!advertiserId || !property) return;
                        setContactBusy(true);
                        try {
                          // A real opening message so the advertiser receives an
                          // actual enquiry (not an empty thread) and the visitor
                          // sees the conversation already started.
                          const opener =
                            locale === "ar" ? `مرحباً، أنا مهتم بهذا العقار: ${property.title.ar}. هل ما زال متاحاً؟`
                            : locale === "tr" ? `Merhaba, bu mülkle ilgileniyorum: ${property.title.tr}. Hâlâ müsait mi?`
                            : `Hello, I'm interested in this property: ${property.title.en}. Is it still available?`;
                          const response = await fetch("/api/messages", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              title: property.title[locale],
                              context: "property",
                              contextId: property.id,
                              recipientId: advertiserId,
                              content: opener,
                            }),
                          });
                          const data = await response.json().catch(() => null);
                          if (response.ok && data?.success && data.data?.id) {
                            window.dispatchEvent(new CustomEvent("akar:chat:open", {
                              detail: { threadId: data.data.id, title: property.title[locale] },
                            }));
                          } else {
                            // End the silent failure: tell the user why (e.g. it
                            // is their own listing, or they must sign in).
                            toast.error(
                              data?.error ||
                                (locale === "ar" ? "تعذّر بدء المحادثة" : locale === "tr" ? "Sohbet başlatılamadı" : "Could not start the conversation"),
                            );
                          }
                        } catch {
                          toast.error(locale === "ar" ? "تعذّر بدء المحادثة" : locale === "tr" ? "Sohbet başlatılamadı" : "Could not start the conversation");
                        } finally {
                          setContactBusy(false);
                        }
                      }}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-5 py-3 text-sm font-black text-white transition hover:bg-[color:var(--color-primary-hover)] disabled:opacity-50"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {contactBusy
                        ? (locale === "ar" ? "جارٍ الفتح..." : locale === "tr" ? "Açılıyor..." : "Opening...")
                        : (locale === "ar" ? "تواصل مع المعلن" : locale === "tr" ? "İlan sahibiyle iletişim" : "Contact the advertiser")}
                    </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleFavorite()}
                      disabled={favoriteBusy}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm font-black text-[color:var(--color-text-secondary)] transition hover:bg-[color:var(--color-surface-muted)] disabled:opacity-50"
                    >
                      <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                      {isFavorite
                        ? (locale === "ar" ? "إزالة من المفضلة" : locale === "tr" ? "Favorilerden çıkar" : "Remove from favorites")
                        : (locale === "ar" ? "حفظ في المفضلة" : locale === "tr" ? "Favorilere ekle" : "Save to favorites")}
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </PageContainer>

          {similar.length > 0 && (
            <section className="border-t border-[color:var(--color-border)] bg-[var(--color-surface)]">
              <PageContainer className="py-8">
                <p className="text-[10px] font-black uppercase tracking-wider text-[color:var(--color-primary)]">{t.similarLabel}</p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {similar.map((item) => (
                    <Link key={item.id} href={`/properties/${item.slug || item.id}`} className="group overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[var(--color-surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="relative h-40 bg-[color:var(--color-surface-soft)]" style={{ backgroundImage: `url(${item.imageUrl || "/placeholder.svg"})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute bottom-3 start-4 text-white">
                          <strong className="block text-sm font-black">{item.price.toLocaleString(locale === "ar" ? "ar" : "en")}</strong>
                          <span className="text-[10px] font-bold opacity-90">{item.currency}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <strong className="block text-sm font-black text-[color:var(--color-text-primary)] group-hover:text-[color:var(--color-primary)]">{item.title[locale]}</strong>
                        <p className="mt-1 text-xs font-bold text-[color:var(--color-text-muted)]">{item.area[locale] ?? item.title[locale]}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </PageContainer>
            </section>
          )}
        </>
      )}
    </PublicPageShell>
    {AccountDialog}
    </>
  );
}
