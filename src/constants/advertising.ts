export const PLATFORM_SECTIONS = {
  HOME: "home",
  PROPERTIES: "properties",
  SERVICES: "services",
  PROVIDERS: "providers",
  COMPANIES: "companies",
  ORGANIZATIONS: "organizations",
  DIRECTORY: "directory",
  TOOLS: "tools",
  OFFICES: "offices",
  COMMUNITY: "community",
  KNOWLEDGE: "knowledge",
  ABOUT: "about",
  CONTACT: "contact",
  ADVERTISE: "advertise",
  ENGINEERING_TOOLS: "engineering-tools",
  CONTRACTORS: "contractors",
  CONSULTATIONS: "consultations",
  AUCTIONS: "auctions",
  NEWS: "news",
  OFFICE: "office",
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
  providers: { key: "providers", label: { ar: "المحترفون", en: "Professionals", tr: "Uzmanlar" }, path: "/providers" },
  companies: { key: "companies", label: { ar: "شركات أخرى", en: "Other Companies", tr: "Diger Sirketler" }, path: "/companies" },
  organizations: { key: "organizations", label: { ar: "الشركات", en: "Companies", tr: "Şirketler" }, path: "/organizations" },
  directory: { key: "directory", label: { ar: "الدليل", en: "Directory", tr: "Dizin" }, path: "/directory" },
  tools: { key: "tools", label: { ar: "الأدوات", en: "Tools", tr: "Araçlar" }, path: "/tools" },
  offices: { key: "offices", label: { ar: "شركات و مكاتب عقارية", en: "Real Estate Companies & Offices", tr: "Emlak Sirketleri ve Ofisleri" }, path: "/offices" },
  community: { key: "community", label: { ar: "منتدى البناء و العقار", en: "Construction & Real Estate Forum", tr: "Insaat ve Gayrimenkul Forumu" }, path: "/community" },
  knowledge: { key: "knowledge", label: { ar: "الكتب والبرامج", en: "Books & Software", tr: "Kitaplar ve Yazilimlar" }, path: "/knowledge" },
  about: { key: "about", label: { ar: "من نحن", en: "About Us", tr: "Hakkimizda" }, path: "/about" },
  contact: { key: "contact", label: { ar: "اتصل بنا", en: "Contact Us", tr: "Iletisim" }, path: "/contact" },
  advertise: { key: "advertise", label: { ar: "اعلن معنا", en: "Advertise with Us", tr: "Bizimle Reklam Verin" }, path: "/advertise" },
  "engineering-tools": { key: "engineering-tools", label: { ar: "الأدوات الهندسية", en: "Engineering Tools", tr: "Mühendislik Araçları" }, path: "/engineering-tools" },
  contractors: { key: "contractors", label: { ar: "المقاولون", en: "Contractors", tr: "Müteahhitler" }, path: "/contractors" },
  consultations: { key: "consultations", label: { ar: "الاستشارات", en: "Consultations", tr: "Danışmanlıklar" }, path: "/consultations" },
  auctions: { key: "auctions", label: { ar: "المزادات", en: "Auctions", tr: "Açık Artırmalar" }, path: "/auctions" },
  news: { key: "news", label: { ar: "الأخبار", en: "News", tr: "Haberler" }, path: "/news" },
  office: { key: "office", label: { ar: "مكتب بروماكس", en: "AkarProMax Office", tr: "AkarProMax Ofisi" }, path: "" },
  global: { key: "global", label: { ar: "عام (كل الأقسام)", en: "Global (all sections)", tr: "Genel (tüm bölümler)" }, path: "" },
};

export const SECTION_ALIASES: Record<string, PlatformSection[]> = {
  home: ["home"],
  properties: ["properties"],
  services: ["services"],
  providers: ["providers", "contractors"],
  companies: ["companies", "organizations"],
  contractors: ["contractors", "providers"],
  organizations: ["organizations", "offices", "companies"],
  offices: ["offices", "organizations"],
  directory: ["directory"],
  tools: ["tools", "engineering-tools"],
  community: ["community"],
  knowledge: ["knowledge"],
  about: ["about"],
  contact: ["contact"],
  advertise: ["advertise"],
  "engineering-tools": ["engineering-tools", "tools"],
  consultations: ["consultations"],
  auctions: ["auctions"],
  news: ["news"],
  office: ["office"],
  global: ["global"],
};

export function sectionVariants(section: string): PlatformSection[] {
  return SECTION_ALIASES[section] ?? ([section] as PlatformSection[]);
}

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
  channel: "website" | "office";
  shape: "horizontal" | "vertical" | "floating" | "popup";
  pageFamily?: string;
  position?: string;
  aspectRatio?: string;
  adminSelectable?: boolean;
};

function label(ar: string, en: string, tr: string): LocalizedLabel {
  return { ar, en, tr };
}

function legacyPlacement(
  key: string,
  ar: string,
  en: string,
  tr: string,
  sections: PlatformSection[],
  shape: PlacementMeta["shape"],
  extras: Partial<PlacementMeta> = {},
): PlacementMeta {
  return {
    key,
    label: label(ar, en, tr),
    sections,
    channel: extras.channel ?? "website",
    shape,
    adminSelectable: extras.adminSelectable ?? false,
    pageFamily: extras.pageFamily,
    position: extras.position,
    aspectRatio: extras.aspectRatio,
  };
}

const WEBSITE_SHARED_SECTIONS: PlatformSection[] = [
  "home",
  "properties",
  "services",
  "providers",
  "organizations",
  "directory",
  "news",
  "tools",
  "offices",
  "engineering-tools",
  "contractors",
  "consultations",
  "auctions",
];

const LEGACY_AD_PLACEMENTS: Record<string, PlacementMeta> = {
  global_header: legacyPlacement("global_header", "ترويسة عامة", "Global header", "Genel üst başlık", WEBSITE_SHARED_SECTIONS, "horizontal", { adminSelectable: true, pageFamily: "legacy-public", position: "top", aspectRatio: "5:1" }),
  below_header: legacyPlacement("below_header", "أسفل الترويسة", "Below header", "Başlığın altı", WEBSITE_SHARED_SECTIONS, "horizontal", { pageFamily: "legacy-public", position: "below-header", aspectRatio: "5:1" }),
  global_footer: legacyPlacement("global_footer", "تذييل عام", "Global footer", "Genel alt bilgi", WEBSITE_SHARED_SECTIONS, "horizontal", { adminSelectable: true, pageFamily: "legacy-public", position: "bottom", aspectRatio: "5:1" }),
  between_sections: legacyPlacement("between_sections", "بين الأقسام", "Between sections", "Bölümler arası", WEBSITE_SHARED_SECTIONS, "horizontal", { pageFamily: "legacy-home", position: "inline", aspectRatio: "5:2" }),
  floating_bottom: legacyPlacement("floating_bottom", "عائم سفلي", "Floating bottom", "Alt yüzer", WEBSITE_SHARED_SECTIONS, "floating", { pageFamily: "legacy-home", position: "floating-bottom", aspectRatio: "5:1" }),
  floating_side: legacyPlacement("floating_side", "عائم جانبي", "Floating side", "Yan yüzer", WEBSITE_SHARED_SECTIONS, "floating", { pageFamily: "legacy-public", position: "floating-side", aspectRatio: "1:3" }),
  mobile_sticky: legacyPlacement("mobile_sticky", "مثبّت للجوال", "Mobile sticky", "Mobil sabit", WEBSITE_SHARED_SECTIONS, "floating", { pageFamily: "legacy-public", position: "mobile-sticky", aspectRatio: "5:1" }),
  popup: legacyPlacement("popup", "نافذة منبثقة", "Popup", "Açılır pencere", WEBSITE_SHARED_SECTIONS, "popup", { pageFamily: "legacy-public", position: "popup", aspectRatio: "4:3" }),
  side_left: legacyPlacement("side_left", "جانب أيسر (رأسي)", "Left side (vertical)", "Sol kenar (dikey)", ["home"], "vertical", { pageFamily: "legacy-home", position: "side-left", aspectRatio: "4:5" }),
  side_right: legacyPlacement("side_right", "جانب أيمن (رأسي)", "Right side (vertical)", "Sağ kenar (dikey)", ["home"], "vertical", { pageFamily: "legacy-home", position: "side-right", aspectRatio: "4:5" }),
  property_details_top: legacyPlacement("property_details_top", "أعلى تفاصيل العقار", "Property details top", "Mülk detay üstü", ["properties"], "horizontal", { pageFamily: "legacy-property-detail", position: "hero", aspectRatio: "5:2" }),
  property_after_gallery: legacyPlacement("property_after_gallery", "بعد معرض الصور", "After gallery", "Galeriden sonra", ["properties"], "horizontal", { pageFamily: "legacy-property-detail", position: "inline-01", aspectRatio: "5:2" }),
  property_below_price: legacyPlacement("property_below_price", "أسفل السعر", "Below price", "Fiyatın altı", ["properties"], "horizontal", { pageFamily: "legacy-property-detail", position: "inline-02", aspectRatio: "5:2" }),
  property_after_description: legacyPlacement("property_after_description", "بعد الوصف", "After description", "Açıklamadan sonra", ["properties"], "horizontal", { pageFamily: "legacy-property-detail", position: "inline-03", aspectRatio: "5:2" }),
  property_before_features: legacyPlacement("property_before_features", "قبل المزايا", "Before features", "Özelliklerden önce", ["properties"], "horizontal", { pageFamily: "legacy-property-detail", position: "inline-04", aspectRatio: "5:2" }),
  property_after_features: legacyPlacement("property_after_features", "بعد المزايا", "After features", "Özelliklerden sonra", ["properties"], "horizontal", { pageFamily: "legacy-property-detail", position: "inline-05", aspectRatio: "5:2" }),
  property_before_map: legacyPlacement("property_before_map", "قبل الخريطة", "Before map", "Haritadan önce", ["properties"], "horizontal", { pageFamily: "legacy-property-detail", position: "inline-06", aspectRatio: "5:2" }),
  property_after_map: legacyPlacement("property_after_map", "بعد الخريطة", "After map", "Haritadan sonra", ["properties"], "horizontal", { pageFamily: "legacy-property-detail", position: "inline-07", aspectRatio: "5:2" }),
  property_sidebar_top: legacyPlacement("property_sidebar_top", "أعلى الشريط الجانبي", "Sidebar top", "Kenar çubuğu üst", ["properties"], "vertical", { pageFamily: "legacy-property-detail", position: "sidebar-top", aspectRatio: "4:5" }),
  property_sidebar_middle: legacyPlacement("property_sidebar_middle", "وسط الشريط الجانبي", "Sidebar middle", "Kenar çubuğu orta", ["properties"], "vertical", { pageFamily: "legacy-property-detail", position: "sidebar-middle", aspectRatio: "4:5" }),
  property_sidebar_bottom: legacyPlacement("property_sidebar_bottom", "أسفل الشريط الجانبي", "Sidebar bottom", "Kenar çubuğu alt", ["properties"], "vertical", { pageFamily: "legacy-property-detail", position: "sidebar-bottom", aspectRatio: "4:5" }),
  property_before_similar: legacyPlacement("property_before_similar", "قبل عقارات مشابهة", "Before similar", "Benzerlerinden önce", ["properties"], "horizontal", { pageFamily: "legacy-property-detail", position: "before-similar", aspectRatio: "5:2" }),
  property_after_similar: legacyPlacement("property_after_similar", "بعد عقارات مشابهة", "After similar", "Benzerlerden sonra", ["properties"], "horizontal", { pageFamily: "legacy-property-detail", position: "after-similar", aspectRatio: "5:2" }),
  listing_top: legacyPlacement("listing_top", "أعلى القائمة", "Listing top", "Liste üstü", ["properties", "services", "providers", "organizations", "directory", "tools", "offices", "engineering-tools", "contractors", "consultations", "auctions"], "horizontal", { pageFamily: "legacy-listing", position: "top", aspectRatio: "5:2" }),
  listing_after_filters: legacyPlacement("listing_after_filters", "بعد الفلاتر", "After filters", "Filtrelerden sonra", ["properties", "services", "providers", "organizations", "directory", "tools", "offices", "engineering-tools", "contractors", "consultations", "auctions"], "horizontal", { pageFamily: "legacy-listing", position: "after-filters", aspectRatio: "5:2" }),
  listing_between_items: legacyPlacement("listing_between_items", "بين العناصر", "Between items", "Öğeler arası", ["properties", "services", "providers", "organizations", "directory", "tools", "offices", "engineering-tools", "contractors", "consultations", "auctions"], "horizontal", { pageFamily: "legacy-listing", position: "between-items", aspectRatio: "5:2" }),
  listing_sidebar: legacyPlacement("listing_sidebar", "الشريط الجانبي للقائمة", "Listing sidebar", "Liste kenar çubuğu", ["properties", "services", "providers", "organizations", "directory", "tools", "offices", "engineering-tools", "contractors", "consultations", "auctions"], "vertical", { pageFamily: "legacy-listing", position: "sidebar", aspectRatio: "4:5" }),
  listing_bottom: legacyPlacement("listing_bottom", "أسفل القائمة", "Listing bottom", "Liste altı", ["properties", "services", "providers", "organizations", "directory", "tools", "offices", "engineering-tools", "contractors", "consultations", "auctions"], "horizontal", { pageFamily: "legacy-listing", position: "bottom", aspectRatio: "5:2" }),
  service_details_top: legacyPlacement("service_details_top", "أعلى تفاصيل الخدمة", "Service details top", "Hizmet detay üstü", ["services"], "horizontal", { pageFamily: "legacy-service-detail", position: "top", aspectRatio: "5:2" }),
  service_after_description: legacyPlacement("service_after_description", "بعد وصف الخدمة", "After service description", "Hizmet açıklamasından sonra", ["services"], "horizontal", { pageFamily: "legacy-service-detail", position: "after-description", aspectRatio: "5:2" }),
  service_sidebar: legacyPlacement("service_sidebar", "شريط الخدمة الجانبي", "Service sidebar", "Hizmet kenar çubuğu", ["services"], "vertical", { pageFamily: "legacy-service-detail", position: "sidebar", aspectRatio: "4:5" }),
  office_profile_top: legacyPlacement("office_profile_top", "أعلى ملف المكتب", "Office profile top", "Ofis profil üstü", ["offices", "organizations"], "horizontal", { pageFamily: "legacy-organization-detail", position: "top", aspectRatio: "5:2" }),
  office_profile_sidebar: legacyPlacement("office_profile_sidebar", "شريط ملف المكتب", "Office profile sidebar", "Ofis profil kenar çubuğu", ["offices", "organizations"], "vertical", { pageFamily: "legacy-organization-detail", position: "sidebar", aspectRatio: "4:5" }),
  office_after_properties: legacyPlacement("office_after_properties", "بعد عقارات المكتب", "After office properties", "Ofis gayrimenkullerinden sonra", ["offices", "organizations"], "horizontal", { pageFamily: "legacy-organization-detail", position: "after-properties", aspectRatio: "5:2" }),
  tool_details_top: legacyPlacement("tool_details_top", "أعلى تفاصيل الأداة", "Tool details top", "Araç detay üstü", ["engineering-tools", "tools"], "horizontal", { pageFamily: "legacy-tools", position: "top", aspectRatio: "5:2" }),
  tool_after_gallery: legacyPlacement("tool_after_gallery", "بعد معرض الأداة", "After tool gallery", "Araç galerisinden sonra", ["engineering-tools", "tools"], "horizontal", { pageFamily: "legacy-tools", position: "after-gallery", aspectRatio: "5:2" }),
  tool_after_description: legacyPlacement("tool_after_description", "بعد وصف الأداة", "After tool description", "Araç açıklamasından sonra", ["engineering-tools", "tools"], "horizontal", { pageFamily: "legacy-tools", position: "after-description", aspectRatio: "5:2" }),
  tool_sidebar: legacyPlacement("tool_sidebar", "شريط الأداة الجانبي", "Tool sidebar", "Araç kenar çubuğu", ["engineering-tools", "tools"], "vertical", { pageFamily: "legacy-tools", position: "sidebar", aspectRatio: "4:5" }),
  office_dashboard_hero: legacyPlacement("office_dashboard_hero", "بانر لوحة المكتب", "Office dashboard hero", "Ofis paneli büyük banner", ["office"], "horizontal", { channel: "office", adminSelectable: true, pageFamily: "office", position: "hero", aspectRatio: "5:2" }),
  office_dashboard_sidebar: legacyPlacement("office_dashboard_sidebar", "شريط لوحة المكتب", "Office dashboard sidebar", "Ofis paneli kenar çubuğu", ["office"], "vertical", { channel: "office", adminSelectable: true, pageFamily: "office", position: "sidebar", aspectRatio: "4:5" }),
  office_news_inline: legacyPlacement("office_news_inline", "داخل أخبار المكتب", "Office news inline", "Ofis haberleri içi", ["office"], "horizontal", { channel: "office", adminSelectable: true, pageFamily: "office", position: "news-inline", aspectRatio: "5:2" }),
  office_properties_inline: legacyPlacement("office_properties_inline", "داخل عقارات المكتب", "Office properties inline", "Ofis gayrimenkulleri içi", ["office"], "horizontal", { channel: "office", adminSelectable: true, pageFamily: "office", position: "properties-inline", aspectRatio: "5:2" }),
  office_services_inline: legacyPlacement("office_services_inline", "داخل خدمات المكتب", "Office services inline", "Ofis hizmetleri içi", ["office"], "horizontal", { channel: "office", adminSelectable: true, pageFamily: "office", position: "services-inline", aspectRatio: "5:2" }),
};

type StandardWebsitePlacementFamily = {
  key: string;
  section: PlatformSection;
  label: LocalizedLabel;
  prefix: string;
};

const STANDARD_WEBSITE_FAMILIES: StandardWebsitePlacementFamily[] = [
  { key: "home", section: "home", label: label("الرئيسية", "Home", "Ana Sayfa"), prefix: "web_home" },
  { key: "properties", section: "properties", label: label("العقارات", "Properties", "Gayrimenkuller"), prefix: "web_properties" },
  { key: "services", section: "services", label: label("الخدمات", "Services", "Hizmetler"), prefix: "web_services" },
  { key: "providers", section: "providers", label: label("المحترفون", "Professionals", "Uzmanlar"), prefix: "web_providers" },
  { key: "provider-detail", section: "providers", label: label("تفاصيل المحترف", "Professional Detail", "Uzman Detayı"), prefix: "web_provider_detail" },
  { key: "offices", section: "offices", label: label("شركات و مكاتب عقارية", "Real Estate Companies & Offices", "Emlak Sirketleri ve Ofisleri"), prefix: "web_offices" },
  { key: "office-detail", section: "offices", label: label("تفاصيل المكتب العقاري", "Real Estate Office Detail", "Emlak Ofisi Detayi"), prefix: "web_office_detail" },
  { key: "companies", section: "companies", label: label("شركات أخرى", "Other Companies", "Diger Sirketler"), prefix: "web_companies" },
  { key: "company-detail", section: "companies", label: label("تفاصيل الشركة", "Company Detail", "Sirket Detayi"), prefix: "web_company_detail" },
  { key: "organizations", section: "organizations", label: label("الشركات", "Companies", "Şirketler"), prefix: "web_organizations" },
  { key: "organization-detail", section: "organizations", label: label("تفاصيل الشركة", "Company Detail", "Şirket Detayı"), prefix: "web_organization_detail" },
  { key: "directory", section: "directory", label: label("الدليل", "Directory", "Dizin"), prefix: "web_directory" },
  { key: "community", section: "community", label: label("منتدى البناء و العقار", "Construction & Real Estate Forum", "Insaat ve Gayrimenkul Forumu"), prefix: "web_community" },
  { key: "knowledge", section: "knowledge", label: label("الكتب والبرامج", "Books & Software", "Kitaplar ve Yazilimlar"), prefix: "web_knowledge" },
  { key: "about", section: "about", label: label("من نحن", "About Us", "Hakkimizda"), prefix: "web_about" },
  { key: "news", section: "news", label: label("الأخبار", "News", "Haberler"), prefix: "web_news" },
  { key: "property-detail", section: "properties", label: label("تفاصيل العقار", "Property Detail", "Mülk Detayı"), prefix: "web_property_detail" },
];

const STANDARD_SLOT_DEFINITIONS: Array<{
  suffix: string;
  position: string;
  shape: PlacementMeta["shape"];
  aspectRatio: string;
  label: LocalizedLabel;
}> = [
  { suffix: "hero", position: "hero", shape: "horizontal", aspectRatio: "5:2", label: label("هيرو", "Hero", "Hero") },
  { suffix: "side_left_01", position: "side-left-01", shape: "vertical", aspectRatio: "4:5", label: label("يسار 1", "Left 01", "Sol 01") },
  { suffix: "side_left_02", position: "side-left-02", shape: "vertical", aspectRatio: "4:5", label: label("يسار 2", "Left 02", "Sol 02") },
  { suffix: "side_right_01", position: "side-right-01", shape: "vertical", aspectRatio: "4:5", label: label("يمين 1", "Right 01", "Sağ 01") },
  { suffix: "side_right_02", position: "side-right-02", shape: "vertical", aspectRatio: "4:5", label: label("يمين 2", "Right 02", "Sağ 02") },
  { suffix: "bottom_01", position: "bottom-01", shape: "horizontal", aspectRatio: "3:2", label: label("سفلي 1", "Bottom 01", "Alt 01") },
  { suffix: "bottom_02", position: "bottom-02", shape: "horizontal", aspectRatio: "3:2", label: label("سفلي 2", "Bottom 02", "Alt 02") },
  { suffix: "bottom_03", position: "bottom-03", shape: "horizontal", aspectRatio: "3:2", label: label("سفلي 3", "Bottom 03", "Alt 03") },
];

const STANDARD_WEBSITE_PLACEMENTS = Object.fromEntries(
  STANDARD_WEBSITE_FAMILIES.flatMap((family) =>
    STANDARD_SLOT_DEFINITIONS.map((slot) => {
      const key = `${family.prefix}_${slot.suffix}`;
      return [
        key,
        {
          key,
          label: label(
            `${family.label.ar} — ${slot.label.ar}`,
            `${family.label.en} — ${slot.label.en}`,
            `${family.label.tr} — ${slot.label.tr}`,
          ),
          sections: [family.section],
          channel: "website",
          shape: slot.shape,
          pageFamily: family.key,
          position: slot.position,
          aspectRatio: slot.aspectRatio,
          adminSelectable: true,
        } satisfies PlacementMeta,
      ] as const;
    }),
  ),
) as Record<string, PlacementMeta>;

export const AD_PLACEMENTS: Record<string, PlacementMeta> = {
  ...LEGACY_AD_PLACEMENTS,
  ...STANDARD_WEBSITE_PLACEMENTS,
};

export function isPlacementValidForSection(placement: string, section: PlatformSection): boolean {
  const meta = AD_PLACEMENTS[placement];
  if (!meta) return false;
  const variants = new Set(sectionVariants(section));
  return meta.sections.some((candidate) => variants.has(candidate));
}

export function placementsForSection(section: PlatformSection, includeGeneral = true): string[] {
  const variants = new Set(sectionVariants(section));
  return Object.values(AD_PLACEMENTS)
    .filter((meta) => meta.sections.some((candidate) => variants.has(candidate) || (includeGeneral && candidate === "global")))
    .map((meta) => meta.key);
}

export function visibleAdminPlacements(): PlacementMeta[] {
  return Object.values(AD_PLACEMENTS).filter((meta) => meta.adminSelectable !== false);
}

export function resolveSectionFromPath(pathname: string): PlatformSection {
  const cleaned = pathname.split("?")[0] ?? "/";
  if (cleaned === "/") return PLATFORM_SECTIONS.HOME;
  const best = ALL_SECTIONS.filter((section) => section !== "global" && section !== "office")
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
  const generalSinglePageSections: PlatformSection[] = [PLATFORM_SECTIONS.COMMUNITY, PLATFORM_SECTIONS.KNOWLEDGE, PLATFORM_SECTIONS.ABOUT, PLATFORM_SECTIONS.CONTACT, PLATFORM_SECTIONS.ADVERTISE];
  if (segments.length === 1 && generalSinglePageSections.includes(section)) {
    return PAGE_TYPES.GENERAL;
  }

  const isListing = segments.length === 1 || (segments.length === 2 && segments[1] === "list");
  if (isListing) return PAGE_TYPES.LISTING;

  const typeBySection: Partial<Record<PlatformSection, PageType>> = {
    properties: PAGE_TYPES.DETAILS,
    services: PAGE_TYPES.DETAILS,
    providers: PAGE_TYPES.PROVIDER_PROFILE,
    contractors: PAGE_TYPES.PROVIDER_PROFILE,
    companies: PAGE_TYPES.OFFICE_PROFILE,
    organizations: PAGE_TYPES.OFFICE_PROFILE,
    offices: PAGE_TYPES.OFFICE_PROFILE,
    tools: PAGE_TYPES.TOOL_DETAILS,
    "engineering-tools": PAGE_TYPES.TOOL_DETAILS,
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
