"use client";

import Link from "next/link";
import { MapPin, Bed, Bath, Maximize, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

export type CardProperty = {
  id: string;
  title?: { ar: string; en: string; tr?: string };
  titleAr?: string;
  titleEn?: string;
  price: string | number;
  currency?: string;
  area?: string | { ar: string | null; en?: string | null; tr?: string | null };
  beds?: number;
  baths?: number;
  bedrooms?: number;
  bathrooms?: number;
  imageUrl?: string | null;
  location?: string;
  district?: string | null;
  city?: string | null;
  description?: { ar: string; en: string; tr?: string };
  features?: { ar: string[]; en: string[]; tr?: string[] };
  propertyType?: string;
  listingType?: string;
  isFeatured?: boolean;
  isAuction?: boolean;
  offerCodes?: string[];
};

const LISTING_BADGES: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };

// Arabic labels of the offer-type codes (property_offer_types seed).
const OFFER_BADGES: Record<string, string> = {
  SALE: "للبيع",
  RENT: "للإيجار",
  TAQBEEL: "تقبيل",
  FARAGH: "فروغ",
  INVESTMENT: "استثمار",
  ASSIGNMENT: "تنازل",
  USUFRUCT: "حق انتفاع",
  LEASE_TO_OWN: "إيجار منتهي بالتملك",
  EXCHANGE: "مقايضة",
  PARTNERSHIP: "شراكة",
  SHARE_SALE: "بيع حصة",
};

function listingBadgeText(property: CardProperty): string | null {
  const special = (property.offerCodes ?? []).find((code) => code !== "SALE" && code !== "RENT" && OFFER_BADGES[code]);
  if (special) return OFFER_BADGES[special];
  const first = (property.offerCodes ?? []).find((code) => OFFER_BADGES[code]);
  if (first) return OFFER_BADGES[first];
  return property.listingType ? LISTING_BADGES[property.listingType] ?? null : null;
}

export default function LuxuryPropertyCard({ property, className = "" }: { property: CardProperty; className?: string }) {
  const { toggleFavorite, isFavorite } = useFavorites(property.id);
  const beds = property.beds ?? property.bedrooms ?? 0;
  const baths = property.baths ?? property.bathrooms ?? 0;
  const titleAr = property.title?.ar || property.titleAr || "عقار";
  const location = property.district || property.location || property.city || "الموقع غير محدد";
  const currencyLabel = property.currency === "SAR" ? "ر.س" : property.currency || "ر.س";

  return (
    <div className={`group relative w-full rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] border border-[var(--color-border)] ${className}`}>
      <Link href={`/properties/${property.id}`} className="block">
      {/* صورة العقار مع بطاقة الحالة والأيقونات */}
      <div className="relative h-64 w-full overflow-hidden rounded-[var(--radius-lg)]">
        <img
          src={property.imageUrl || "/placeholder.svg"}
          alt={titleAr}
          width={640}
          height={384}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
        
        <div className="absolute top-3 right-3 flex flex-wrap items-center gap-1.5">
          {property.isAuction ? (
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow">
              مزاد
            </span>
          ) : (
            listingBadgeText(property) && (
              <span className="rounded-full bg-[var(--color-overlay)] backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/20">
                {listingBadgeText(property)}
              </span>
            )
          )}
          {property.isFeatured && (
            <span className="rounded-full bg-[var(--color-overlay)] backdrop-blur-md px-3 py-1 text-xs font-semibold text-[var(--color-primary)] border border-[var(--color-primary)]/20">
              VIP متميز
            </span>
          )}
        </div>

        {/* السعر فوق الصورة */}
        <div className="absolute bottom-3 right-3 text-white">
          <p className="text-xs font-light text-[var(--color-surface-muted)]">السعر المطلوب</p>
          <p className="text-xl font-bold tracking-tight text-white">
            {typeof property.price === "number" ? property.price.toLocaleString("ar") : property.price} <span className="text-xs font-normal text-[var(--color-primary)]">{currencyLabel}</span>
          </p>
        </div>
      </div>

      {/* تفاصيل العقار */}
      <div className="p-4 dir-rtl">
        <div className="flex items-center gap-1 text-[var(--color-text-muted)] text-xs mb-1">
          <MapPin className="h-3.5 w-3.5 text-[var(--color-primary)]" />
          <span>{location}</span>
        </div>

        <h3 className="text-lg font-bold text-[var(--color-text-primary)] line-clamp-1 group-hover:text-[var(--color-primary)] transition-colors">
          {titleAr}
        </h3>

        {/* خصائص المساحة والغرف */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-[var(--color-text-secondary)] text-xs">
          <div className="flex items-center gap-1.5">
            {beds > 0 && <Bed className="h-4 w-4 text-[var(--color-text-muted)]" />}<span>{beds > 0 ? `${beds} غرف` : "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {baths > 0 && <Bath className="h-4 w-4 text-[var(--color-text-muted)]" />}<span>{baths > 0 ? `${baths} حمامات` : "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {property.area && <Maximize className="h-4 w-4 text-[var(--color-text-muted)]" />}<span>{typeof property.area === "number" ? property.area + " م²" : typeof property.area === "string" ? property.area : property.area?.ar || "—"}</span>
          </div>
        </div>

        {/* زر التفاصيل */}
        <span className="mt-4 block w-full rounded-[var(--radius-md)] bg-[var(--color-text-primary)] py-2.5 text-center text-xs font-semibold text-[var(--color-surface)] transition group-hover:bg-[var(--color-primary)]">
          عرض التفاصيل
        </span>
      </div>
      </Link>

      <button
        type="button"
        aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
        onClick={() => toggleFavorite()}
        className="absolute top-6 left-6 z-[var(--layer-sticky)] flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-overlay)] backdrop-blur-md text-white transition hover:bg-[var(--color-surface)] hover:text-red-500"
      >
        <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
      </button>
    </div>
  );
}