import type { PublicAdSlotConfig } from "@/src/config/ad-placements";

export type StandardPublicAdSlotKey =
  | "hero"
  | "sideLeft01"
  | "sideLeft02"
  | "sideRight01"
  | "sideRight02"
  | "bottom01"
  | "bottom02"
  | "bottom03";

export type StandardPublicAdLayoutKey =
  | "home"
  | "properties"
  | "services"
  | "providers"
  | "provider-detail"
  | "offices"
  | "office-detail"
  | "companies"
  | "company-detail"
  | "organizations"
  | "organization-detail"
  | "directory"
  | "community"
  | "knowledge"
  | "about"
  | "news"
  | "property-detail";

export type StandardPublicAdSlotConfig = PublicAdSlotConfig & {
  slot: StandardPublicAdSlotKey;
};

export type StandardPublicAdLayoutFamily = {
  key: StandardPublicAdLayoutKey;
  pageLabel: {
    ar: string;
    en: string;
    tr: string;
  };
  placements: Record<StandardPublicAdSlotKey, StandardPublicAdSlotConfig>;
};

function slot(key: string, placement: string, slotKey: StandardPublicAdSlotKey, variant: PublicAdSlotConfig["variant"], lazy: boolean): StandardPublicAdSlotConfig {
  return {
    key,
    placement,
    slot: slotKey,
    variant,
    lazy,
    used: true,
  };
}

function createFamily(key: StandardPublicAdLayoutKey, pageLabel: StandardPublicAdLayoutFamily["pageLabel"], prefix: string): StandardPublicAdLayoutFamily {
  return {
    key,
    pageLabel,
    placements: {
      hero: slot(`${prefix}_HERO`, `${prefix}_hero`, "hero", "hero", false),
      sideLeft01: slot(`${prefix}_SIDE_LEFT_01`, `${prefix}_side_left_01`, "sideLeft01", "vertical", true),
      sideLeft02: slot(`${prefix}_SIDE_LEFT_02`, `${prefix}_side_left_02`, "sideLeft02", "vertical", true),
      sideRight01: slot(`${prefix}_SIDE_RIGHT_01`, `${prefix}_side_right_01`, "sideRight01", "vertical", true),
      sideRight02: slot(`${prefix}_SIDE_RIGHT_02`, `${prefix}_side_right_02`, "sideRight02", "vertical", true),
      bottom01: slot(`${prefix}_BOTTOM_01`, `${prefix}_bottom_01`, "bottom01", "horizontal", true),
      bottom02: slot(`${prefix}_BOTTOM_02`, `${prefix}_bottom_02`, "bottom02", "horizontal", true),
      bottom03: slot(`${prefix}_BOTTOM_03`, `${prefix}_bottom_03`, "bottom03", "horizontal", true),
    },
  };
}

export const STANDARD_PUBLIC_AD_LAYOUT_V1: Record<StandardPublicAdLayoutKey, StandardPublicAdLayoutFamily> = {
  home: createFamily("home", { ar: "الرئيسية", en: "Home", tr: "Ana Sayfa" }, "web_home"),
  properties: createFamily("properties", { ar: "العقارات", en: "Properties", tr: "Gayrimenkuller" }, "web_properties"),
  services: createFamily("services", { ar: "الخدمات", en: "Services", tr: "Hizmetler" }, "web_services"),
  providers: createFamily("providers", { ar: "المحترفون", en: "Professionals", tr: "Uzmanlar" }, "web_providers"),
  "provider-detail": createFamily("provider-detail", { ar: "تفاصيل المحترف", en: "Professional Detail", tr: "Uzman Detayı" }, "web_provider_detail"),
  offices: createFamily("offices", { ar: "شركات و مكاتب عقارية", en: "Real Estate Companies & Offices", tr: "Emlak Sirketleri ve Ofisleri" }, "web_offices"),
  "office-detail": createFamily("office-detail", { ar: "تفاصيل المكتب العقاري", en: "Real Estate Office Detail", tr: "Emlak Ofisi Detayi" }, "web_office_detail"),
  companies: createFamily("companies", { ar: "شركات أخرى", en: "Other Companies", tr: "Diger Sirketler" }, "web_companies"),
  "company-detail": createFamily("company-detail", { ar: "تفاصيل الشركة", en: "Company Detail", tr: "Sirket Detayi" }, "web_company_detail"),
  organizations: createFamily("organizations", { ar: "الشركات", en: "Companies", tr: "Şirketler" }, "web_organizations"),
  "organization-detail": createFamily("organization-detail", { ar: "تفاصيل الشركة", en: "Company Detail", tr: "Şirket Detayı" }, "web_organization_detail"),
  directory: createFamily("directory", { ar: "الدليل", en: "Directory", tr: "Dizin" }, "web_directory"),
  community: createFamily("community", { ar: "منتدى البناء و العقار", en: "Construction & Real Estate Forum", tr: "Insaat ve Gayrimenkul Forumu" }, "web_community"),
  knowledge: createFamily("knowledge", { ar: "الكتب والبرامج", en: "Books & Software", tr: "Kitaplar ve Yazilimlar" }, "web_knowledge"),
  about: createFamily("about", { ar: "من نحن", en: "About Us", tr: "Hakkimizda" }, "web_about"),
  news: createFamily("news", { ar: "الأخبار", en: "News", tr: "Haberler" }, "web_news"),
  "property-detail": createFamily("property-detail", { ar: "تفاصيل العقار", en: "Property Detail", tr: "Mülk Detayı" }, "web_property_detail"),
};

export function getStandardPublicAdLayout(key: StandardPublicAdLayoutKey): StandardPublicAdLayoutFamily {
  return STANDARD_PUBLIC_AD_LAYOUT_V1[key];
}

export function listStandardPublicPlacements(key: StandardPublicAdLayoutKey): StandardPublicAdSlotConfig[] {
  return Object.values(STANDARD_PUBLIC_AD_LAYOUT_V1[key].placements);
}

export function listAllStandardPublicPlacements(): StandardPublicAdSlotConfig[] {
  return Object.values(STANDARD_PUBLIC_AD_LAYOUT_V1).flatMap((family) => Object.values(family.placements));
}
