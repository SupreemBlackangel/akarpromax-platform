import type { Locale } from "@/src/types/site";

type LocalizedText = Record<Locale, string>;

export type HouseCampaign = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  ctaLabel: LocalizedText;
  ctaHref: string;
  icon: string;
  channel: "website" | "office";
  family: string;
  priority: number;
};

function t(ar: string, en: string, tr: string): LocalizedText {
  return { ar, en, tr };
}

export const HOUSE_CAMPAIGNS: HouseCampaign[] = [
  {
    id: "house-add-property-free",
    title: t("أضف عقارك مجانًا", "Add Your Property Free", "Mülkünüzü Ücretsiz Ekleyin"),
    description: t("انشر عقارك على المنصة واستعرضه للمهتمين بدون أي رسوم.", "List your property on the platform and showcase it to interested buyers at no cost.", "Mülkünüzü platformda listeleyin ve ilgililere ücretsiz olarak gösterin."),
    ctaLabel: t("أضف عقارك الآن", "Add property now", "Şimdi ekle"),
    ctaHref: "/dashboard/submit",
    icon: "🏠",
    channel: "website",
    family: "home",
    priority: 1,
  },
  {
    id: "house-discover-properties",
    title: t("اكتشف العقارات", "Discover Properties", "Gayrimenkulleri Keşfet"),
    description: t("تصفح مئات العقارات للبيع والإيجار في عُمان.", "Browse hundreds of properties for sale and rent in Oman.", "Satılık ve kiralık yüzlerce mülkü Umman'da keşfedin."),
    ctaLabel: t("تصفح العقارات", "Browse properties", "Mülklere göz at"),
    ctaHref: "/properties",
    icon: "🔍",
    channel: "website",
    family: "properties",
    priority: 2,
  },
  {
    id: "house-findmyland",
    title: t("اعثر على أرضي", "Find My Land", "Arazi Bul"),
    description: t("حدد موقع أرضك بدقة باستخدام الإحداثيات GPS.", " pinpoint your land location using GPS coordinates.", "GPS koordinatlarıyla arazi konumunuzu belirleyin."),
    ctaLabel: t("ابدأ البحث", "Start searching", "Aramaya başla"),
    ctaHref: "/tools?tool=findmyland",
    icon: "📍",
    channel: "website",
    family: "home",
    priority: 3,
  },
  {
    id: "house-engineering-tools",
    title: t("الأدوات الهندسية", "Engineering Tools", "Mühendislik Araçları"),
    description: t("حاسبات وتحويلات ومعالجة مستندات للمهندسين والمقاولين.", "Calculators, conversions, and document processing for engineers and contractors.", "Mühendisler ve müteahhitler için hesaplayıcılar, dönüştürücüler ve belge işleme."),
    ctaLabel: t("افتح الأدوات", "Open tools", "Araçları aç"),
    ctaHref: "/tools",
    icon: "🔧",
    channel: "website",
    family: "home",
    priority: 4,
  },
  {
    id: "house-request-service",
    title: t("اطلب خدمة", "Request a Service", "Hizmet Talep Et"),
    description: t("احصل على عروض أسعار من مقدمي الخدمات المعتمدين.", "Get quotes from certified service providers.", "Onaylı hizmet sağlayıcılardan teklifler alın."),
    ctaLabel: t("اطلب الآن", "Request now", "Şimdi talep et"),
    ctaHref: "/service-requests/new",
    icon: "⚡",
    channel: "website",
    family: "services",
    priority: 5,
  },
  {
    id: "house-become-provider",
    title: t("انضم كمقدم خدمة", "Become a Service Provider", "Hizmet Sağlayıcı Ol"),
    description: t("سجّل كمقدم خدمة واحصل على طلبات من العملاء.", "Register as a service provider and receive requests from clients.", "Hizmet sağlayıcı olarak kaydolun ve müşterilerden talep alın."),
    ctaLabel: t("سجّل الآن", "Register now", "Şimdi kaydol"),
    ctaHref: "/providers/apply",
    icon: "👷",
    channel: "website",
    family: "services",
    priority: 6,
  },
  {
    id: "house-offices",
    title: t("المكاتب العقارية", "Real Estate Offices", "Emlak Ofisleri"),
    description: t("استعرض المكاتب العقارية المعتمدة في عُمان.", "Browse certified real estate offices in Oman.", "Umman'daki onaylı emlak ofislerine göz atın."),
    ctaLabel: t("استعرض المكاتب", "Browse offices", "Ofisleri incele"),
    ctaHref: "/offices",
    icon: "🏢",
    channel: "website",
    family: "offices",
    priority: 7,
  },
  {
    id: "house-companies",
    title: t("الشركات والمقاولين", "Companies & Contractors", "Şirketler ve Müteahhitler"),
    description: t("اكتشف الشركات والمقاولين المتخصصين في العقار والبناء.", "Discover companies and contractors specialized in real estate and construction.", "Gayrimenkul ve inşaatta uzmanlaşmış şirketleri ve müteahhitleri keşfedin."),
    ctaLabel: t("استعرض الشركات", "Browse companies", "Şirketleri incele"),
    ctaHref: "/companies",
    icon: "🏗️",
    channel: "website",
    family: "companies",
    priority: 8,
  },
  {
    id: "house-download-office",
    title: t("حمّل AkarProMax Office", "Download AkarProMax Office", "AkarProMax Office'i İndir"),
    description: t("تطبيق مكتبي للمكاتب العقارية مع مزامنة آمنة ورادار المناطق.", "Desktop app for real estate offices with secure sync and area radar.", "Güvenli senkronizasyon ve bölge radarı ile emlak ofisleri için masaüstü uygulama."),
    ctaLabel: t("تحميل التطبيق", "Download app", "Uygulamayı indir"),
    ctaHref: "#office-app",
    icon: "💻",
    channel: "office",
    family: "home",
    priority: 9,
  },
];

export function getHouseCampaigns(channel: "website" | "office" = "website"): HouseCampaign[] {
  return HOUSE_CAMPAIGNS.filter((c) => c.channel === channel).sort((a, b) => a.priority - b.priority);
}

export function getHouseCampaignById(id: string): HouseCampaign | undefined {
  return HOUSE_CAMPAIGNS.find((c) => c.id === id);
}
