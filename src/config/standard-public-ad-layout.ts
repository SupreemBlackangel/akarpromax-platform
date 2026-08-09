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
  | "services"
  | "providers"
  | "provider-detail"
  | "organizations"
  | "organization-detail"
  | "directory"
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
  services: createFamily("services", { ar: "الخدمات", en: "Services", tr: "Hizmetler" }, "web_services"),
  providers: createFamily("providers", { ar: "المحترفون", en: "Professionals", tr: "Uzmanlar" }, "web_providers"),
  "provider-detail": createFamily("provider-detail", { ar: "تفاصيل المحترف", en: "Professional Detail", tr: "Uzman Detayı" }, "web_provider_detail"),
  organizations: createFamily("organizations", { ar: "الشركات", en: "Companies", tr: "Şirketler" }, "web_organizations"),
  "organization-detail": createFamily("organization-detail", { ar: "تفاصيل الشركة", en: "Company Detail", tr: "Şirket Detayı" }, "web_organization_detail"),
  directory: createFamily("directory", { ar: "الدليل", en: "Directory", tr: "Dizin" }, "web_directory"),
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
