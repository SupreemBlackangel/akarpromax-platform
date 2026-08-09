import type { Locale } from "@/src/types/site";

type LocalizedText = Record<Locale, string>;

export type OfficePromoFeature = {
  icon: string;
  label: LocalizedText;
};

export type OfficePromoConfig = {
  enabled: boolean;
  productName: LocalizedText;
  version: string;
  tagline: LocalizedText;
  description: LocalizedText;
  features: OfficePromoFeature[];
  downloadUrl: string;
  fileSize: string;
  releaseDate: string;
  supportedWindows: string;
  releaseNotesUrl: string;
  licenseUrl: string;
  ctaLabel: LocalizedText;
  secondaryCtaLabel: LocalizedText;
};

function t(ar: string, en: string, tr: string): LocalizedText {
  return { ar, en, tr };
}

export const OFFICE_PROMO_CONFIG: OfficePromoConfig = {
  enabled: true,
  productName: t("AkarProMax Office", "AkarProMax Office", "AkarProMax Office"),
  version: "2.0",
  tagline: t(
    "امتداد المكتب العقاري",
    "Real Estate Office Extension",
    "Emlak Ofisi Uzantisi",
  ),
  description: t(
    "التطبيق المكتبي يستقبل أخبار المنصة وإعلاناتها، ويرفع مسودات العقارات بحدود آمنة، ويربط الرادار بفرص المناطق القريبة من مكتبك.",
    "The desktop app receives platform news and ads, uploads property drafts securely, and links the radar to opportunities near your office.",
    "Masaustu uygulamasi platform haberlerini ve reklamlari alir, emlak taslaklarini guvenle yukler ve radarinizi ofisinize yakin firsatlara baglar.",
  ),
  features: [
    { icon: "⚡", label: t("مزامنة آمنة", "Secure sync", "Guvenli senkronizasyon") },
    { icon: "📡", label: t("رادار المناطق", "Area radar", "Bolge radari") },
    { icon: "📰", label: t("أخبار المنصة", "Platform news", "Platform haberleri") },
    { icon: "📢", label: t("إعلانات مستهدفة", "Targeted ads", "Hedefli reklamlar") },
    { icon: "🏠", label: t("مسودات العقارات", "Property drafts", "Emlak taslaklari") },
    { icon: "🔒", label: t("حماية البيانات", "Data protection", "Veri koruma") },
  ],
  downloadUrl: "#download",
  fileSize: "~45 MB",
  releaseDate: "2026-08",
  supportedWindows: "Windows 10/11",
  releaseNotesUrl: "#release-notes",
  licenseUrl: "#license",
  ctaLabel: t("تحميل التطبيق", "Download App", "Uygulamayi Indir"),
  secondaryCtaLabel: t("تفاصيل التكامل", "Integration details", "Entegrasyon detaylari"),
};

export function getOfficePromoConfig(): OfficePromoConfig {
  return OFFICE_PROMO_CONFIG;
}
