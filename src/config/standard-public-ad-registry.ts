export type StandardPublicAdLocalizedLabel = { ar: string; en: string; tr: string };

export type StandardPublicAdFamilyDefinition = {
  section: string;
  label: StandardPublicAdLocalizedLabel;
  prefix: string;
  heroEnabled: boolean;
};

export type StandardPublicAdSlotDefinition = {
  canonical: string;
  keySuffix: string;
  placementSuffix: string;
  position: string;
  variant: "hero" | "horizontal" | "vertical";
  shape: "horizontal" | "vertical";
  aspectRatio: string;
  lazy: boolean;
  label: StandardPublicAdLocalizedLabel;
};

/**
 * Single source of truth for every standard public-ad page family.
 * Consumers must derive labels, prefixes, sections, and HERO behavior from here.
 */
export const STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS = {
  home: { section: "home", label: { ar: "الرئيسية", en: "Home", tr: "Ana Sayfa" }, prefix: "web_home", heroEnabled: true },
  properties: { section: "properties", label: { ar: "العقارات", en: "Properties", tr: "Gayrimenkuller" }, prefix: "web_properties", heroEnabled: true },
  services: { section: "services", label: { ar: "الخدمات", en: "Services", tr: "Hizmetler" }, prefix: "web_services", heroEnabled: true },
  tools: { section: "tools", label: { ar: "الأدوات", en: "Tools", tr: "Araçlar" }, prefix: "web_tools", heroEnabled: true },
  providers: { section: "providers", label: { ar: "المحترفون", en: "Professionals", tr: "Uzmanlar" }, prefix: "web_providers", heroEnabled: true },
  "provider-detail": { section: "providers", label: { ar: "تفاصيل المحترف", en: "Professional Detail", tr: "Uzman Detayı" }, prefix: "web_provider_detail", heroEnabled: true },
  offices: { section: "offices", label: { ar: "شركات و مكاتب عقارية", en: "Real Estate Companies & Offices", tr: "Emlak Sirketleri ve Ofisleri" }, prefix: "web_offices", heroEnabled: true },
  "office-detail": { section: "offices", label: { ar: "تفاصيل المكتب العقاري", en: "Real Estate Office Detail", tr: "Emlak Ofisi Detayi" }, prefix: "web_office_detail", heroEnabled: true },
  companies: { section: "companies", label: { ar: "شركات أخرى", en: "Other Companies", tr: "Diger Sirketler" }, prefix: "web_companies", heroEnabled: true },
  "company-detail": { section: "companies", label: { ar: "تفاصيل الشركة", en: "Company Detail", tr: "Sirket Detayi" }, prefix: "web_company_detail", heroEnabled: true },
  organizations: { section: "organizations", label: { ar: "الشركات", en: "Companies", tr: "Şirketler" }, prefix: "web_organizations", heroEnabled: true },
  "organization-detail": { section: "organizations", label: { ar: "تفاصيل الشركة", en: "Company Detail", tr: "Şirket Detayı" }, prefix: "web_organization_detail", heroEnabled: true },
  directory: { section: "directory", label: { ar: "الدليل", en: "Directory", tr: "Dizin" }, prefix: "web_directory", heroEnabled: true },
  community: { section: "community", label: { ar: "منتدى البناء و العقار", en: "Construction & Real Estate Forum", tr: "Insaat ve Gayrimenkul Forumu" }, prefix: "web_community", heroEnabled: true },
  knowledge: { section: "knowledge", label: { ar: "الكتب والبرامج", en: "Books & Software", tr: "Kitaplar ve Yazilimlar" }, prefix: "web_knowledge", heroEnabled: true },
  about: { section: "about", label: { ar: "من نحن", en: "About Us", tr: "Hakkimizda" }, prefix: "web_about", heroEnabled: true },
  contact: { section: "contact", label: { ar: "اتصل بنا", en: "Contact Us", tr: "Iletisim" }, prefix: "web_contact", heroEnabled: true },
  advertise: { section: "advertise", label: { ar: "اعلن معنا", en: "Advertise with Us", tr: "Bizimle Reklam Verin" }, prefix: "web_advertise", heroEnabled: true },
  news: { section: "news", label: { ar: "الأخبار", en: "News", tr: "Haberler" }, prefix: "web_news", heroEnabled: true },
  "property-detail": { section: "properties", label: { ar: "تفاصيل العقار", en: "Property Detail", tr: "Mülk Detayı" }, prefix: "web_property_detail", heroEnabled: true },
} as const satisfies Record<string, StandardPublicAdFamilyDefinition>;

/** Single source of truth for the eight canonical standard-shell slots. */
export const STANDARD_PUBLIC_AD_SLOT_DEFINITIONS = {
  hero: { canonical: "HERO", keySuffix: "HERO", placementSuffix: "hero", position: "hero", variant: "hero", shape: "horizontal", aspectRatio: "3:2", lazy: false, label: { ar: "هيرو", en: "Hero", tr: "Hero" } },
  sideLeft01: { canonical: "LEFT_01", keySuffix: "SIDE_LEFT_01", placementSuffix: "side_left_01", position: "side-left-01", variant: "vertical", shape: "vertical", aspectRatio: "4:5", lazy: true, label: { ar: "يسار 1", en: "Left 01", tr: "Sol 01" } },
  sideLeft02: { canonical: "LEFT_02", keySuffix: "SIDE_LEFT_02", placementSuffix: "side_left_02", position: "side-left-02", variant: "vertical", shape: "vertical", aspectRatio: "4:5", lazy: true, label: { ar: "يسار 2", en: "Left 02", tr: "Sol 02" } },
  sideRight01: { canonical: "RIGHT_01", keySuffix: "SIDE_RIGHT_01", placementSuffix: "side_right_01", position: "side-right-01", variant: "vertical", shape: "vertical", aspectRatio: "4:5", lazy: true, label: { ar: "يمين 1", en: "Right 01", tr: "Sağ 01" } },
  sideRight02: { canonical: "RIGHT_02", keySuffix: "SIDE_RIGHT_02", placementSuffix: "side_right_02", position: "side-right-02", variant: "vertical", shape: "vertical", aspectRatio: "4:5", lazy: true, label: { ar: "يمين 2", en: "Right 02", tr: "Sağ 02" } },
  bottom01: { canonical: "BOTTOM_01", keySuffix: "BOTTOM_01", placementSuffix: "bottom_01", position: "bottom-01", variant: "horizontal", shape: "horizontal", aspectRatio: "3:2", lazy: true, label: { ar: "سفلي 1", en: "Bottom 01", tr: "Alt 01" } },
  bottom02: { canonical: "BOTTOM_02", keySuffix: "BOTTOM_02", placementSuffix: "bottom_02", position: "bottom-02", variant: "horizontal", shape: "horizontal", aspectRatio: "3:2", lazy: true, label: { ar: "سفلي 2", en: "Bottom 02", tr: "Alt 02" } },
  bottom03: { canonical: "BOTTOM_03", keySuffix: "BOTTOM_03", placementSuffix: "bottom_03", position: "bottom-03", variant: "horizontal", shape: "horizontal", aspectRatio: "3:2", lazy: true, label: { ar: "سفلي 3", en: "Bottom 03", tr: "Alt 03" } },
} as const satisfies Record<string, StandardPublicAdSlotDefinition>;

export type StandardPublicAdLayoutKey = keyof typeof STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS;
export type StandardPublicAdSlotKey = keyof typeof STANDARD_PUBLIC_AD_SLOT_DEFINITIONS;

export const STANDARD_PUBLIC_AD_FAMILY_KEYS = Object.keys(STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS) as StandardPublicAdLayoutKey[];
export const STANDARD_PUBLIC_AD_SLOT_KEYS = Object.keys(STANDARD_PUBLIC_AD_SLOT_DEFINITIONS) as StandardPublicAdSlotKey[];
