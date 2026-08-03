export const PLATFORM_SECTIONS = {
  HOME: "home",
  PROPERTIES: "properties",
  SERVICES: "services",
  OFFICES: "offices",
  ENGINEERING_TOOLS: "engineering-tools",
  CONTRACTORS: "contractors",
  CONSULTATIONS: "consultations",
  AUCTIONS: "auctions",
  NEWS: "news",
  GLOBAL: "global",
} as const;

export type PlatformSection = (typeof PLATFORM_SECTIONS)[keyof typeof PLATFORM_SECTIONS];

export const ALL_SECTIONS: PlatformSection[] = Object.values(PLATFORM_SECTIONS);

export type LocalizedLabel = { ar: string; en: string; tr: string };

export type SectionMeta = {
  key: PlatformSection;
  label: LocalizedLabel;
  path: string;
};

export const PLATFORM_SECTIONS_REGISTRY: Record<PlatformSection, SectionMeta> = {
  home: { key: "home", label: { ar: "الرئيسية", en: "Home", tr: "Ana Sayfa" }, path: "/" },
  properties: { key: "properties", label: { ar: "العقارات", en: "Properties", tr: "Gayrimenkuller" }, path: "/properties" },
  services: { key: "services", label: { ar: "الخدمات", en: "Services", tr: "Hizmetler" }, path: "/services" },
  offices: { key: "offices", label: { ar: "المكاتب العقارية", en: "Real Estate Offices", tr: "Gayrimenkul Ofisleri" }, path: "/offices" },
  "engineering-tools": { key: "engineering-tools", label: { ar: "الأدوات الهندسية", en: "Engineering Tools", tr: "Mühendislik Araçları" }, path: "/engineering-tools" },
  contractors: { key: "contractors", label: { ar: "المقاولون", en: "Contractors", tr: "Müteahhitler" }, path: "/contractors" },
  consultations: { key: "consultations", label: { ar: "الاستشارات", en: "Consultations", tr: "Danışmanlıklar" }, path: "/consultations" },
  auctions: { key: "auctions", label: { ar: "المزادات", en: "Auctions", tr: "Açık Artırmalar" }, path: "/auctions" },
  news: { key: "news", label: { ar: "الأخبار", en: "News", tr: "Haberler" }, path: "/news" },
  global: { key: "global", label: { ar: "عام (كل الأقسام)", en: "Global (all sections)", tr: "Genel (tüm bölümler)" }, path: "" },
};

export const PAGE_TYPES = {
  HOME: "home",
  LISTING: "listing",
  DETAILS: "details",
  SEARCH_RESULTS: "search-results",
  CATEGORY: "category",
  PROVIDER_PROFILE: "provider-profile",
  OFFICE_PROFILE: "office-profile",
  TOOL_DETAILS: "tool-details",
  ARTICLE: "article",
  DASHBOARD: "dashboard",
  GENERAL: "general",
} as const;

export type PageType = (typeof PAGE_TYPES)[keyof typeof PAGE_TYPES];

export const PAGE_TYPES_LIST: PageType[] = Object.values(PAGE_TYPES);

export const DEVICE_TYPES = ["desktop", "tablet", "mobile"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const PRICING_MODELS = ["cpm", "cpc", "fixed"] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

export const FREQUENCY_PERIODS = ["session", "day", "week", "month", "all"] as const;
export type FrequencyPeriod = (typeof FREQUENCY_PERIODS)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export type PlacementMeta = {
  key: string;
  label: LocalizedLabel;
  sections: PlatformSection[];
  shape: "horizontal" | "vertical" | "floating" | "popup";
};

export const AD_PLACEMENTS: Record<string, PlacementMeta> = {
  global_header: { key: "global_header", label: { ar: "ترويسة عامة", en: "Global header", tr: "Genel üst başlık" }, sections: ["home", "properties", "services", "offices", "engineering-tools", "contractors", "consultations", "auctions", "news"], shape: "horizontal" },
  below_header: { key: "below_header", label: { ar: "أسفل الترويسة", en: "Below header", tr: "Başlığın altı" }, sections: ["home", "properties", "services", "offices", "engineering-tools", "contractors", "consultations", "auctions", "news"], shape: "horizontal" },
  global_footer: { key: "global_footer", label: { ar: "تذييل عام", en: "Global footer", tr: "Genel alt bilgi" }, sections: ["home", "properties", "services", "offices", "engineering-tools", "contractors", "consultations", "auctions", "news"], shape: "horizontal" },
  between_sections: { key: "between_sections", label: { ar: "بين الأقسام", en: "Between sections", tr: "Bölümler arası" }, sections: ["home", "properties", "services", "offices", "engineering-tools", "contractors", "consultations", "auctions", "news"], shape: "horizontal" },
  floating_bottom: { key: "floating_bottom", label: { ar: "عائم سفلي", en: "Floating bottom", tr: "Alt yüzer" }, sections: ["home", "properties", "services", "offices", "engineering-tools", "contractors", "consultations", "auctions", "news"], shape: "floating" },
  floating_side: { key: "floating_side", label: { ar: "عائم جانبي", en: "Floating side", tr: "Yan yüzer" }, sections: ["home", "properties", "services", "offices", "engineering-tools", "contractors", "consultations", "auctions", "news"], shape: "floating" },
  mobile_sticky: { key: "mobile_sticky", label: { ar: "مثبّت للجوال", en: "Mobile sticky", tr: "Mobil sabit" }, sections: ["home", "properties", "services", "offices", "engineering-tools", "contractors", "consultations", "auctions", "news"], shape: "floating" },
  popup: { key: "popup", label: { ar: "نافذة منبثقة", en: "Popup", tr: "Açılır pencere" }, sections: ["home", "properties", "services", "offices", "engineering-tools", "contractors", "consultations", "auctions", "news"], shape: "popup" },

  side_left: { key: "side_left", label: { ar: "جانب أيسر (رأسي)", en: "Left side (vertical)", tr: "Sol kenar (dikey)" }, sections: ["home"], shape: "vertical" },
  side_right: { key: "side_right", label: { ar: "جانب أيمن (رأسي)", en: "Right side (vertical)", tr: "Sağ kenar (dikey)" }, sections: ["home"], shape: "vertical" },

  property_details_top: { key: "property_details_top", label: { ar: "أعلى تفاصيل العقار", en: "Property details top", tr: "Mülk detay üstü" }, sections: ["properties"], shape: "horizontal" },
  property_after_gallery: { key: "property_after_gallery", label: { ar: "بعد معرض الصور", en: "After gallery", tr: "Galeriden sonra" }, sections: ["properties"], shape: "horizontal" },
  property_below_price: { key: "property_below_price", label: { ar: "أسفل السعر", en: "Below price", tr: "Fiyatın altı" }, sections: ["properties"], shape: "horizontal" },
  property_after_description: { key: "property_after_description", label: { ar: "بعد الوصف", en: "After description", tr: "Açıklamadan sonra" }, sections: ["properties"], shape: "horizontal" },
  property_before_features: { key: "property_before_features", label: { ar: "قبل المزايا", en: "Before features", tr: "Özelliklerden önce" }, sections: ["properties"], shape: "horizontal" },
  property_after_features: { key: "property_after_features", label: { ar: "بعد المزايا", en: "After features", tr: "Özelliklerden sonra" }, sections: ["properties"], shape: "horizontal" },
  property_before_map: { key: "property_before_map", label: { ar: "قبل الخريطة", en: "Before map", tr: "Haritadan önce" }, sections: ["properties"], shape: "horizontal" },
  property_after_map: { key: "property_after_map", label: { ar: "بعد الخريطة", en: "After map", tr: "Haritadan sonra" }, sections: ["properties"], shape: "horizontal" },
  property_sidebar_top: { key: "property_sidebar_top", label: { ar: "أعلى الشريط الجانبي", en: "Sidebar top", tr: "Kenar çubuğu üst" }, sections: ["properties"], shape: "vertical" },
  property_sidebar_middle: { key: "property_sidebar_middle", label: { ar: "وسط الشريط الجانبي", en: "Sidebar middle", tr: "Kenar çubuğu orta" }, sections: ["properties"], shape: "vertical" },
  property_sidebar_bottom: { key: "property_sidebar_bottom", label: { ar: "أسفل الشريط الجانبي", en: "Sidebar bottom", tr: "Kenar çubuğu alt" }, sections: ["properties"], shape: "vertical" },
  property_before_similar: { key: "property_before_similar", label: { ar: "قبل عقارات مشابهة", en: "Before similar", tr: "Benzerlerinden önce" }, sections: ["properties"], shape: "horizontal" },
  property_after_similar: { key: "property_after_similar", label: { ar: "بعد عقارات مشابهة", en: "After similar", tr: "Benzerlerden sonra" }, sections: ["properties"], shape: "horizontal" },

  listing_top: { key: "listing_top", label: { ar: "أعلى القائمة", en: "Listing top", tr: "Liste üstü" }, sections: ["properties", "services", "offices", "engineering-tools", "contractors", "consultations", "auctions"], shape: "horizontal" },
  listing_after_filters: { key: "listing_after_filters", label: { ar: "بعد الفلاتر", en: "After filters", tr: "Filtrelerden sonra" }, sections: ["properties", "services", "offices", "engineering-tools", "contractors", "consultations", "auctions"], shape: "horizontal" },
  listing_between_items: { key: "listing_between_items", label: { ar: "بين العناصر", en: "Between items", tr: "Öğeler arası" }, sections: ["properties", "services", "offices", "engineering-tools", "contractors", "consultations", "auctions"], shape: "horizontal" },
  listing_sidebar: { key: "listing_sidebar", label: { ar: "الشريط الجانبي للقائمة", en: "Listing sidebar", tr: "Liste kenar çubuğu" }, sections: ["properties", "services", "offices", "engineering-tools", "contractors", "consultations", "auctions"], shape: "vertical" },
  listing_bottom: { key: "listing_bottom", label: { ar: "أسفل القائمة", en: "Listing bottom", tr: "Liste altı" }, sections: ["properties", "services", "offices", "engineering-tools", "contractors", "consultations", "auctions"], shape: "horizontal" },

  service_details_top: { key: "service_details_top", label: { ar: "أعلى تفاصيل الخدمة", en: "Service details top", tr: "Hizmet detay üstü" }, sections: ["services"], shape: "horizontal" },
  service_after_description: { key: "service_after_description", label: { ar: "بعد وصف الخدمة", en: "After service description", tr: "Hizmet açıklamasından sonra" }, sections: ["services"], shape: "horizontal" },
  service_sidebar: { key: "service_sidebar", label: { ar: "شريط الخدمة الجانبي", en: "Service sidebar", tr: "Hizmet kenar çubuğu" }, sections: ["services"], shape: "vertical" },

  office_profile_top: { key: "office_profile_top", label: { ar: "أعلى ملف المكتب", en: "Office profile top", tr: "Ofis profil üstü" }, sections: ["offices"], shape: "horizontal" },
  office_profile_sidebar: { key: "office_profile_sidebar", label: { ar: "شريط ملف المكتب", en: "Office profile sidebar", tr: "Ofis profil kenar çubuğu" }, sections: ["offices"], shape: "vertical" },
  office_after_properties: { key: "office_after_properties", label: { ar: "بعد عقارات المكتب", en: "After office properties", tr: "Ofis gayrimenkullerinden sonra" }, sections: ["offices"], shape: "horizontal" },

  tool_details_top: { key: "tool_details_top", label: { ar: "أعلى تفاصيل الأداة", en: "Tool details top", tr: "Araç detay üstü" }, sections: ["engineering-tools"], shape: "horizontal" },
  tool_after_gallery: { key: "tool_after_gallery", label: { ar: "بعد معرض الأداة", en: "After tool gallery", tr: "Araç galerisinden sonra" }, sections: ["engineering-tools"], shape: "horizontal" },
  tool_after_description: { key: "tool_after_description", label: { ar: "بعد وصف الأداة", en: "After tool description", tr: "Araç açıklamasından sonra" }, sections: ["engineering-tools"], shape: "horizontal" },
  tool_sidebar: { key: "tool_sidebar", label: { ar: "شريط الأداة الجانبي", en: "Tool sidebar", tr: "Araç kenar çubuğu" }, sections: ["engineering-tools"], shape: "vertical" },
};

export function isPlacementValidForSection(placement: string, section: PlatformSection): boolean {
  return AD_PLACEMENTS[placement]?.sections.includes(section) ?? false;
}

export function placementsForSection(section: PlatformSection, includeGeneral = true): string[] {
  return Object.values(AD_PLACEMENTS)
    .filter((meta) => (meta.sections.includes(section) || (includeGeneral && section !== "global")) || meta.sections.includes("global"))
    .map((meta) => meta.key);
}

export function resolveSectionFromPath(pathname: string): PlatformSection {
  const cleaned = pathname.split("?")[0] ?? "/";
  if (cleaned === "/") return PLATFORM_SECTIONS.HOME;
  const best = ALL_SECTIONS.filter((section) => section !== "global")
    .map((section) => ({ section, path: PLATFORM_SECTIONS_REGISTRY[section].path }))
    .filter(({ path }) => path && (cleaned === path || cleaned.startsWith(`${path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return best ? best.section : PLATFORM_SECTIONS.GLOBAL;
}

export function resolvePageType(section: PlatformSection, pathname: string): PageType {
  const cleaned = pathname.split("?")[0] ?? "/";
  const segments = cleaned.split("/").filter(Boolean);

  if (section === PLATFORM_SECTIONS.HOME) return PAGE_TYPES.HOME;
  if (section === PLATFORM_SECTIONS.NEWS && segments.length >= 2) return PAGE_TYPES.ARTICLE;
  if (segments[0] === "search") return PAGE_TYPES.SEARCH_RESULTS;
  if (segments[0] === "admin") return PAGE_TYPES.DASHBOARD;

  const isListing = segments.length === 1 || (segments.length === 2 && segments[1] === "list");
  if (isListing) return PAGE_TYPES.LISTING;

  const typeBySection: Partial<Record<PlatformSection, PageType>> = {
    properties: PAGE_TYPES.DETAILS,
    services: PAGE_TYPES.DETAILS,
    offices: PAGE_TYPES.OFFICE_PROFILE,
    "engineering-tools": PAGE_TYPES.TOOL_DETAILS,
    contractors: PAGE_TYPES.PROVIDER_PROFILE,
    consultations: PAGE_TYPES.PROVIDER_PROFILE,
    auctions: PAGE_TYPES.DETAILS,
    news: PAGE_TYPES.ARTICLE,
  };
  return typeBySection[section] ?? PAGE_TYPES.GENERAL;
}

export function sectionLabel(section: string, locale: "ar" | "en" | "tr"): string {
  return PLATFORM_SECTIONS_REGISTRY[section as PlatformSection]?.label[locale] ?? section;
}

export function placementLabel(placement: string, locale: "ar" | "en" | "tr"): string {
  return AD_PLACEMENTS[placement]?.label[locale] ?? placement;
}

export type AdContext = {
  section: string;
  pageType: string;
  placement: string;
  entityType?: string;
  entityId?: string | number;
  categoryId?: string | number;
  countryCode?: string;
  regionId?: string | number;
  cityId?: string | number;
  districtId?: string | number;
  latitude?: number;
  longitude?: number;
  language: "ar" | "en" | "tr";
  deviceType: DeviceType;
  userId?: string;
  sessionId?: string;
  tags?: string[];
};

export interface AdContextAdapter<T> {
  buildContext(entity: T, placement: string, pageType: string): AdContext;
}
