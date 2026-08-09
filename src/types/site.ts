export type Locale = "ar" | "en" | "tr";
export type CountryId = string;
export type ThemeMode = "system" | "light" | "dark";

export type Translation = {
  metaTitle: string;
  brandTitle: string;
  brandSubtitle: string;
  country: string;
  currency: string;
  sidebarAria: string;
  closeMenu: string;
  showMenu: string;
  toolsAria: string;
  countryAria: string;
  cityAria: string;
  currencyAria: string;
  languageAria: string;
  themeAria: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  officeAppAria: string;
  login: string;
  register: string;
  tickerAria: string;
  tickerLabel: string;
  tickerPause: string;
  tickerPlay: string;
  tickerPrev: string;
  tickerNext: string;
  ticker: string[];
  heroAria: string;
  heroEyebrow: string;
  heroTitle: string;
  heroAccent: string;
  heroSub: string;
  heroCta: string;
  welcomeKicker: string;
  welcomeTitle: string;
  welcomeAccent: string;
  welcomeDescription: string;
  browse: string;
  join: string;
  visualAria: string;
  visualTag: string;
  visualSmall: string;
  propertiesKicker: string;
  propertiesTitle: string;
  propertiesAccent: string;
  viewAll: string;
  propertyCards: Array<{ tag: string; meta: string; title: string; link?: string }>;
  servicesKicker: string;
  servicesTitle: string;
  servicesAccent: string;
  servicesNote: string;
  services: Array<{ title: string; description: string; href?: string; shortDescription?: string; ariaLabel?: string; iconAlt?: string }>;
  officeKicker: string;
  officeDescription: string;
  officeCta: string;
  officeSync: string;
  officeStats: string[];
  adLabel: string;
  adDescription: string;
  sponsorAria: string;
  sponsorLabel: string;
  sponsorOfficial: string;
  sponsorAvailable: string;
  sponsorDescription: string;
  sponsorCta: string;
  sponsorLogo: string;
  sponsorPage: string;
  sponsorFooter: string;
  accountKicker: string;
  accountTitle: string;
  accountAccent: string;
  accountDescription: string;
  accountCta: string;
  quickTitle: string;
  usefulTitle: string;
  contactTitle: string;
  quickLinks: string[];
  usefulLinks: string[];
  contactLocation: string;
  contactEmail: string;
  contactTeam: string;
  footerDescription: string;
  footerRights: string;
  footerTagline: string;
  chatAria: string;
  arrow: string;
  navHome: string;
  navServices: string;
  navCatalog: string;
  navRequests: string;
  navDirectory: string;
  navNews: string;
  navTools: string;
  navApply: string;
  navMore: string;
  logout: string;
  searchAria: string;
  skipToContent: string;
  mainNavAria: string;
  breadcrumbAria: string;
  toastAria: string;
  footerLegalTitle: string;
  cookieTitle: string;
  cookieDescription: string;
  cookieAccept: string;
  cookieReject: string;
  cookieManage: string;
};

/** Subset of Translation keys whose values are plain strings (safe for nav/footer labels). */
export type TranslationStringKey = {
  [K in keyof Translation]: Translation[K] extends string ? K : never;
}[keyof Translation];

export type CountryOption = {
  id: CountryId;
  flag: string;
  names: Record<Locale, string>;
  timeZones: string[];
  localeCodes: string[];
};

export type CityOption = {
  id: string;
  countryId: CountryId;
  names: Record<Locale, string>;
  timeZones?: string[];
};

export type CurrencyOption = {
  code: string;
  symbol: string;
  names: Record<Locale, string>;
};

export type SponsorTone = "gold" | "blue" | "emerald" | "crimson";

export type PublicSponsor = {
  id: string;
  countryCode: string;
  nameAr: string;
  nameEn: string;
  nameTr: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  bannerUrl: string;
  placements: string[];
  tier: string;
};

export type HeroAdSlide = {
  id: string;
  campaignId?: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  posterUrl?: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  cta: string;
  href: string;
  sponsored?: boolean;
};

export type PublicAdCampaign = {
  id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  mobileMediaUrl: string | null;
  posterUrl: string | null;
  eyebrowAr: string; eyebrowEn: string; eyebrowTr: string;
  titleAr: string; titleEn: string; titleTr: string;
  accentAr: string; accentEn: string; accentTr: string;
  descriptionAr: string; descriptionEn: string; descriptionTr: string;
  ctaAr: string; ctaEn: string; ctaTr: string;
  targetUrl: string;
  campaignType: string;
  creatives?: Array<{ id: string; mediaType: "image" | "video"; mediaUrl: string; mobileMediaUrl: string | null; posterUrl: string | null; position: number; durationSeconds: number }>;
};

export type ViewerContext = {
  authenticated: boolean;
  email: string | null;
  displayName: string;
  role: string;
  countryCode: string | null;
  permissions: string[];
};

export type RoleLabels = Record<Locale, Record<string, string>>;
