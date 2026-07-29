"use client";
/* eslint-disable @next/next/no-img-element -- Sponsor logos and country flags are runtime-managed URLs. */

import { useEffect, useRef, useState } from "react";

type Locale = "ar" | "en" | "tr";
type CountryId = string;
type ThemeMode = "system" | "light" | "dark";

type Translation = {
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
  services: Array<{ title: string; description: string }>;
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
  sidebar: Array<[string, string]>;
};

const languageOptions: Array<{ id: Locale; short: string; symbol: string; label: string }> = [
  { id: "ar", short: "AR", symbol: "ع", label: "العربية" },
  { id: "en", short: "EN", symbol: "🇬🇧", label: "English" },
  { id: "tr", short: "TR", symbol: "🇹🇷", label: "Türkçe" },
];

const themeOptions: Array<{ id: ThemeMode; symbol: string; labelKey: "themeSystem" | "themeLight" | "themeDark" }> = [
  { id: "system", symbol: "◐", labelKey: "themeSystem" },
  { id: "light", symbol: "☀", labelKey: "themeLight" },
  { id: "dark", symbol: "☾", labelKey: "themeDark" },
];

type CountryOption = {
  id: CountryId;
  flag: string;
  names: Record<Locale, string>;
  timeZones: string[];
  localeCodes: string[];
};

const countryOptions: CountryOption[] = [
  { id: "dz", flag: "🇩🇿", names: { ar: "الجزائر", en: "Algeria", tr: "Cezayir" }, timeZones: ["Africa/Algiers"], localeCodes: ["ar-dz", "fr-dz"] },
  { id: "bh", flag: "🇧🇭", names: { ar: "البحرين", en: "Bahrain", tr: "Bahreyn" }, timeZones: ["Asia/Bahrain"], localeCodes: ["ar-bh"] },
  { id: "km", flag: "🇰🇲", names: { ar: "جزر القمر", en: "Comoros", tr: "Komorlar" }, timeZones: ["Indian/Comoro"], localeCodes: ["ar-km", "fr-km"] },
  { id: "dj", flag: "🇩🇯", names: { ar: "جيبوتي", en: "Djibouti", tr: "Cibuti" }, timeZones: ["Africa/Djibouti"], localeCodes: ["ar-dj", "fr-dj"] },
  { id: "eg", flag: "🇪🇬", names: { ar: "مصر", en: "Egypt", tr: "Mısır" }, timeZones: ["Africa/Cairo"], localeCodes: ["ar-eg"] },
  { id: "iq", flag: "🇮🇶", names: { ar: "العراق", en: "Iraq", tr: "Irak" }, timeZones: ["Asia/Baghdad"], localeCodes: ["ar-iq"] },
  { id: "jo", flag: "🇯🇴", names: { ar: "الأردن", en: "Jordan", tr: "Ürdün" }, timeZones: ["Asia/Amman"], localeCodes: ["ar-jo"] },
  { id: "kw", flag: "🇰🇼", names: { ar: "الكويت", en: "Kuwait", tr: "Kuveyt" }, timeZones: ["Asia/Kuwait"], localeCodes: ["ar-kw"] },
  { id: "lb", flag: "🇱🇧", names: { ar: "لبنان", en: "Lebanon", tr: "Lübnan" }, timeZones: ["Asia/Beirut"], localeCodes: ["ar-lb"] },
  { id: "ly", flag: "🇱🇾", names: { ar: "ليبيا", en: "Libya", tr: "Libya" }, timeZones: ["Africa/Tripoli"], localeCodes: ["ar-ly"] },
  { id: "mr", flag: "🇲🇷", names: { ar: "موريتانيا", en: "Mauritania", tr: "Moritanya" }, timeZones: ["Africa/Nouakchott"], localeCodes: ["ar-mr", "fr-mr"] },
  { id: "ma", flag: "🇲🇦", names: { ar: "المغرب", en: "Morocco", tr: "Fas" }, timeZones: ["Africa/Casablanca"], localeCodes: ["ar-ma", "fr-ma"] },
  { id: "om", flag: "🇴🇲", names: { ar: "عُمان", en: "Oman", tr: "Umman" }, timeZones: ["Asia/Muscat"], localeCodes: ["ar-om"] },
  { id: "ps", flag: "🇵🇸", names: { ar: "فلسطين", en: "Palestine", tr: "Filistin" }, timeZones: ["Asia/Gaza", "Asia/Hebron"], localeCodes: ["ar-ps"] },
  { id: "qa", flag: "🇶🇦", names: { ar: "قطر", en: "Qatar", tr: "Katar" }, timeZones: ["Asia/Qatar"], localeCodes: ["ar-qa"] },
  { id: "sa", flag: "🇸🇦", names: { ar: "السعودية", en: "Saudi Arabia", tr: "Suudi Arabistan" }, timeZones: ["Asia/Riyadh"], localeCodes: ["ar-sa"] },
  { id: "so", flag: "🇸🇴", names: { ar: "الصومال", en: "Somalia", tr: "Somali" }, timeZones: ["Africa/Mogadishu"], localeCodes: ["ar-so"] },
  { id: "sd", flag: "🇸🇩", names: { ar: "السودان", en: "Sudan", tr: "Sudan" }, timeZones: ["Africa/Khartoum"], localeCodes: ["ar-sd"] },
  { id: "sy", flag: "🇸🇾", names: { ar: "سوريا", en: "Syria", tr: "Suriye" }, timeZones: ["Asia/Damascus"], localeCodes: ["ar-sy"] },
  { id: "tn", flag: "🇹🇳", names: { ar: "تونس", en: "Tunisia", tr: "Tunus" }, timeZones: ["Africa/Tunis"], localeCodes: ["ar-tn", "fr-tn"] },
  { id: "ae", flag: "🇦🇪", names: { ar: "الإمارات العربية المتحدة", en: "United Arab Emirates", tr: "Birleşik Arap Emirlikleri" }, timeZones: ["Asia/Dubai"], localeCodes: ["ar-ae"] },
  { id: "ye", flag: "🇾🇪", names: { ar: "اليمن", en: "Yemen", tr: "Yemen" }, timeZones: ["Asia/Aden"], localeCodes: ["ar-ye"] },
  { id: "tr", flag: "🇹🇷", names: { ar: "تركيا", en: "Türkiye", tr: "Türkiye" }, timeZones: ["Europe/Istanbul"], localeCodes: ["tr-tr", "tr"] },
];

type CurrencyOption = {
  code: string;
  symbol: string;
  names: Record<Locale, string>;
};

const currenciesByCountry: Record<string, CurrencyOption> = {
  dz: { code: "DZD", symbol: "د.ج", names: { ar: "الدينار الجزائري", en: "Algerian dinar", tr: "Cezayir dinarı" } },
  bh: { code: "BHD", symbol: "د.ب", names: { ar: "الدينار البحريني", en: "Bahraini dinar", tr: "Bahreyn dinarı" } },
  km: { code: "KMF", symbol: "CF", names: { ar: "الفرنك القمري", en: "Comorian franc", tr: "Komor frangı" } },
  dj: { code: "DJF", symbol: "Fdj", names: { ar: "الفرنك الجيبوتي", en: "Djiboutian franc", tr: "Cibuti frangı" } },
  eg: { code: "EGP", symbol: "ج.م", names: { ar: "الجنيه المصري", en: "Egyptian pound", tr: "Mısır lirası" } },
  iq: { code: "IQD", symbol: "ع.د", names: { ar: "الدينار العراقي", en: "Iraqi dinar", tr: "Irak dinarı" } },
  jo: { code: "JOD", symbol: "د.أ", names: { ar: "الدينار الأردني", en: "Jordanian dinar", tr: "Ürdün dinarı" } },
  kw: { code: "KWD", symbol: "د.ك", names: { ar: "الدينار الكويتي", en: "Kuwaiti dinar", tr: "Kuveyt dinarı" } },
  lb: { code: "LBP", symbol: "ل.ل", names: { ar: "الليرة اللبنانية", en: "Lebanese pound", tr: "Lübnan lirası" } },
  ly: { code: "LYD", symbol: "ل.د", names: { ar: "الدينار الليبي", en: "Libyan dinar", tr: "Libya dinarı" } },
  mr: { code: "MRU", symbol: "UM", names: { ar: "الأوقية الموريتانية", en: "Mauritanian ouguiya", tr: "Moritanya ugiyası" } },
  ma: { code: "MAD", symbol: "د.م.", names: { ar: "الدرهم المغربي", en: "Moroccan dirham", tr: "Fas dirhemi" } },
  om: { code: "OMR", symbol: "ر.ع.", names: { ar: "الريال العُماني", en: "Omani rial", tr: "Umman riyali" } },
  ps: { code: "ILS", symbol: "₪", names: { ar: "الشيكل الجديد", en: "New Israeli shekel", tr: "Yeni İsrail şekeli" } },
  qa: { code: "QAR", symbol: "ر.ق", names: { ar: "الريال القطري", en: "Qatari riyal", tr: "Katar riyali" } },
  sa: { code: "SAR", symbol: "ر.س", names: { ar: "الريال السعودي", en: "Saudi riyal", tr: "Suudi riyali" } },
  so: { code: "SOS", symbol: "Sh.So.", names: { ar: "الشلن الصومالي", en: "Somali shilling", tr: "Somali şilini" } },
  sd: { code: "SDG", symbol: "ج.س.", names: { ar: "الجنيه السوداني", en: "Sudanese pound", tr: "Sudan lirası" } },
  sy: { code: "SYP", symbol: "ل.س", names: { ar: "الليرة السورية", en: "Syrian pound", tr: "Suriye lirası" } },
  tn: { code: "TND", symbol: "د.ت", names: { ar: "الدينار التونسي", en: "Tunisian dinar", tr: "Tunus dinarı" } },
  ae: { code: "AED", symbol: "د.إ", names: { ar: "الدرهم الإماراتي", en: "UAE dirham", tr: "BAE dirhemi" } },
  ye: { code: "YER", symbol: "ر.ي", names: { ar: "الريال اليمني", en: "Yemeni rial", tr: "Yemen riyali" } },
  tr: { code: "TRY", symbol: "₺", names: { ar: "الليرة التركية", en: "Turkish lira", tr: "Türk lirası" } },
};

type SponsorTone = "gold" | "blue" | "emerald" | "crimson";

const sponsorToneByCountry: Record<string, SponsorTone> = {
  dz: "emerald", bh: "crimson", km: "emerald", dj: "blue", eg: "gold", iq: "emerald",
  jo: "crimson", kw: "blue", lb: "crimson", ly: "emerald", mr: "gold", ma: "crimson",
  om: "gold", ps: "emerald", qa: "crimson", sa: "emerald", so: "blue", sd: "blue",
  sy: "crimson", tn: "crimson", ae: "gold", ye: "crimson", tr: "crimson",
};

type PublicSponsor = {
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

type HeroAdSlide = {
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

type PublicAdCampaign = {
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
};

type ViewerContext = {
  authenticated: boolean;
  displayName: string;
  role: string;
  countryCode: string | null;
  permissions: string[];
};

const sponsorBannerByCountry: Record<string, string> = {
  om: "/sponsors/oman-gold.webp",
  sa: "/sponsors/saudi-emerald.webp",
  tr: "/sponsors/turkiye-crimson.webp",
};

function isVideoAsset(url: string) {
  return /\.(?:mp4|webm|ogg)(?:[?#].*)?$/i.test(url);
}

const roleLabels: Record<Locale, Record<string, string>> = {
  ar: { guest: "زائر", viewer: "مستخدم", analyst: "محلل", content_editor: "محرر", country_manager: "مدير دولة", ad_manager: "مدير الإعلانات", sponsor_admin: "مدير الرعاة", super_admin: "المدير العام" },
  en: { guest: "Guest", viewer: "Viewer", analyst: "Analyst", content_editor: "Editor", country_manager: "Country manager", ad_manager: "Ad manager", sponsor_admin: "Sponsor admin", super_admin: "Super admin" },
  tr: { guest: "Ziyaretçi", viewer: "Kullanıcı", analyst: "Analist", content_editor: "Editör", country_manager: "Ülke yöneticisi", ad_manager: "Reklam yöneticisi", sponsor_admin: "Sponsor yöneticisi", super_admin: "Süper yönetici" },
};

type CityOption = {
  id: string;
  countryId: CountryId;
  names: Record<Locale, string>;
  timeZones?: string[];
};

const cityOptions: CityOption[] = [
  { id: "dz-algiers", countryId: "dz", names: { ar: "الجزائر العاصمة", en: "Algiers", tr: "Cezayir" }, timeZones: ["Africa/Algiers"] },
  { id: "dz-oran", countryId: "dz", names: { ar: "وهران", en: "Oran", tr: "Oran" } },
  { id: "bh-manama", countryId: "bh", names: { ar: "المنامة", en: "Manama", tr: "Manama" }, timeZones: ["Asia/Bahrain"] },
  { id: "bh-muharraq", countryId: "bh", names: { ar: "المحرق", en: "Muharraq", tr: "Muharrak" } },
  { id: "km-moroni", countryId: "km", names: { ar: "موروني", en: "Moroni", tr: "Moroni" }, timeZones: ["Indian/Comoro"] },
  { id: "km-mutsamudu", countryId: "km", names: { ar: "موتسامودو", en: "Mutsamudu", tr: "Mutsamudu" } },
  { id: "dj-djibouti", countryId: "dj", names: { ar: "مدينة جيبوتي", en: "Djibouti City", tr: "Cibuti" }, timeZones: ["Africa/Djibouti"] },
  { id: "dj-ali-sabieh", countryId: "dj", names: { ar: "علي صبيح", en: "Ali Sabieh", tr: "Ali Sabieh" } },
  { id: "eg-cairo", countryId: "eg", names: { ar: "القاهرة", en: "Cairo", tr: "Kahire" }, timeZones: ["Africa/Cairo"] },
  { id: "eg-alexandria", countryId: "eg", names: { ar: "الإسكندرية", en: "Alexandria", tr: "İskenderiye" } },
  { id: "iq-baghdad", countryId: "iq", names: { ar: "بغداد", en: "Baghdad", tr: "Bağdat" }, timeZones: ["Asia/Baghdad"] },
  { id: "iq-basra", countryId: "iq", names: { ar: "البصرة", en: "Basra", tr: "Basra" } },
  { id: "jo-amman", countryId: "jo", names: { ar: "عمّان", en: "Amman", tr: "Amman" }, timeZones: ["Asia/Amman"] },
  { id: "jo-aqaba", countryId: "jo", names: { ar: "العقبة", en: "Aqaba", tr: "Akabe" } },
  { id: "kw-kuwait-city", countryId: "kw", names: { ar: "مدينة الكويت", en: "Kuwait City", tr: "Kuveyt Şehri" }, timeZones: ["Asia/Kuwait"] },
  { id: "kw-al-ahmadi", countryId: "kw", names: { ar: "الأحمدي", en: "Al Ahmadi", tr: "El Ahmedi" } },
  { id: "lb-beirut", countryId: "lb", names: { ar: "بيروت", en: "Beirut", tr: "Beyrut" }, timeZones: ["Asia/Beirut"] },
  { id: "lb-tripoli", countryId: "lb", names: { ar: "طرابلس", en: "Tripoli", tr: "Trablus" } },
  { id: "ly-tripoli", countryId: "ly", names: { ar: "طرابلس", en: "Tripoli", tr: "Trablus" }, timeZones: ["Africa/Tripoli"] },
  { id: "ly-benghazi", countryId: "ly", names: { ar: "بنغازي", en: "Benghazi", tr: "Bingazi" } },
  { id: "mr-nouakchott", countryId: "mr", names: { ar: "نواكشوط", en: "Nouakchott", tr: "Nuakşot" }, timeZones: ["Africa/Nouakchott"] },
  { id: "mr-nouadhibou", countryId: "mr", names: { ar: "نواذيبو", en: "Nouadhibou", tr: "Nouadhibou" } },
  { id: "ma-rabat", countryId: "ma", names: { ar: "الرباط", en: "Rabat", tr: "Rabat" }, timeZones: ["Africa/Casablanca"] },
  { id: "ma-casablanca", countryId: "ma", names: { ar: "الدار البيضاء", en: "Casablanca", tr: "Kazablanka" } },
  { id: "om-muscat", countryId: "om", names: { ar: "مسقط", en: "Muscat", tr: "Maskat" }, timeZones: ["Asia/Muscat"] },
  { id: "om-nizwa", countryId: "om", names: { ar: "نزوى", en: "Nizwa", tr: "Nizva" } },
  { id: "om-salalah", countryId: "om", names: { ar: "صلالة", en: "Salalah", tr: "Salalah" } },
  { id: "ps-jerusalem", countryId: "ps", names: { ar: "القدس", en: "Jerusalem", tr: "Kudüs" }, timeZones: ["Asia/Gaza", "Asia/Hebron"] },
  { id: "ps-gaza", countryId: "ps", names: { ar: "غزة", en: "Gaza", tr: "Gazze" } },
  { id: "qa-doha", countryId: "qa", names: { ar: "الدوحة", en: "Doha", tr: "Doha" }, timeZones: ["Asia/Qatar"] },
  { id: "qa-al-rayyan", countryId: "qa", names: { ar: "الريان", en: "Al Rayyan", tr: "Er Reyyan" } },
  { id: "sa-riyadh", countryId: "sa", names: { ar: "الرياض", en: "Riyadh", tr: "Riyad" }, timeZones: ["Asia/Riyadh"] },
  { id: "sa-jeddah", countryId: "sa", names: { ar: "جدة", en: "Jeddah", tr: "Cidde" } },
  { id: "sa-mecca", countryId: "sa", names: { ar: "مكة المكرمة", en: "Mecca", tr: "Mekke" } },
  { id: "so-mogadishu", countryId: "so", names: { ar: "مقديشو", en: "Mogadishu", tr: "Mogadişu" }, timeZones: ["Africa/Mogadishu"] },
  { id: "so-hargeisa", countryId: "so", names: { ar: "هرجيسا", en: "Hargeisa", tr: "Hargeysa" } },
  { id: "sd-khartoum", countryId: "sd", names: { ar: "الخرطوم", en: "Khartoum", tr: "Hartum" }, timeZones: ["Africa/Khartoum"] },
  { id: "sd-port-sudan", countryId: "sd", names: { ar: "بورتسودان", en: "Port Sudan", tr: "Port Sudan" } },
  { id: "sy-damascus", countryId: "sy", names: { ar: "دمشق", en: "Damascus", tr: "Şam" }, timeZones: ["Asia/Damascus"] },
  { id: "sy-aleppo", countryId: "sy", names: { ar: "حلب", en: "Aleppo", tr: "Halep" } },
  { id: "tn-tunis", countryId: "tn", names: { ar: "تونس العاصمة", en: "Tunis", tr: "Tunus" }, timeZones: ["Africa/Tunis"] },
  { id: "tn-sfax", countryId: "tn", names: { ar: "صفاقس", en: "Sfax", tr: "Sfax" } },
  { id: "ae-abu-dhabi", countryId: "ae", names: { ar: "أبوظبي", en: "Abu Dhabi", tr: "Abu Dabi" }, timeZones: ["Asia/Dubai"] },
  { id: "ae-dubai", countryId: "ae", names: { ar: "دبي", en: "Dubai", tr: "Dubai" } },
  { id: "ye-sanaa", countryId: "ye", names: { ar: "صنعاء", en: "Sana'a", tr: "Sana" }, timeZones: ["Asia/Aden"] },
  { id: "ye-aden", countryId: "ye", names: { ar: "عدن", en: "Aden", tr: "Aden" } },
  { id: "tr-istanbul", countryId: "tr", names: { ar: "إسطنبول", en: "Istanbul", tr: "İstanbul" }, timeZones: ["Europe/Istanbul"] },
  { id: "tr-ankara", countryId: "tr", names: { ar: "أنقرة", en: "Ankara", tr: "Ankara" } },
  { id: "tr-antalya", countryId: "tr", names: { ar: "أنطاليا", en: "Antalya", tr: "Antalya" } },
  { id: "dz-constantine", countryId: "dz", names: { ar: "قسنطينة", en: "Constantine", tr: "Konstantin" } },
  { id: "dz-annaba", countryId: "dz", names: { ar: "عنابة", en: "Annaba", tr: "Annaba" } },
  { id: "dz-blida", countryId: "dz", names: { ar: "البليدة", en: "Blida", tr: "Blida" } },
  { id: "bh-riffa", countryId: "bh", names: { ar: "الرفاع", en: "Riffa", tr: "Riffa" } },
  { id: "bh-hamad-town", countryId: "bh", names: { ar: "مدينة حمد", en: "Hamad Town", tr: "Hamad Kasabası" } },
  { id: "km-fomboni", countryId: "km", names: { ar: "فومبوني", en: "Fomboni", tr: "Fomboni" } },
  { id: "dj-tadjoura", countryId: "dj", names: { ar: "تاجورة", en: "Tadjoura", tr: "Tacura" } },
  { id: "dj-obock", countryId: "dj", names: { ar: "أوبوك", en: "Obock", tr: "Obok" } },
  { id: "eg-giza", countryId: "eg", names: { ar: "الجيزة", en: "Giza", tr: "Gize" } },
  { id: "eg-sharm-el-sheikh", countryId: "eg", names: { ar: "شرم الشيخ", en: "Sharm El Sheikh", tr: "Şarm eş-Şeyh" } },
  { id: "eg-hurghada", countryId: "eg", names: { ar: "الغردقة", en: "Hurghada", tr: "Hurgada" } },
  { id: "eg-luxor", countryId: "eg", names: { ar: "الأقصر", en: "Luxor", tr: "Luksor" } },
  { id: "iq-erbil", countryId: "iq", names: { ar: "أربيل", en: "Erbil", tr: "Erbil" } },
  { id: "iq-mosul", countryId: "iq", names: { ar: "الموصل", en: "Mosul", tr: "Musul" } },
  { id: "iq-najaf", countryId: "iq", names: { ar: "النجف", en: "Najaf", tr: "Necef" } },
  { id: "jo-zarqa", countryId: "jo", names: { ar: "الزرقاء", en: "Zarqa", tr: "Zarka" } },
  { id: "jo-irbid", countryId: "jo", names: { ar: "إربد", en: "Irbid", tr: "İrbid" } },
  { id: "jo-salt", countryId: "jo", names: { ar: "السلط", en: "As-Salt", tr: "Salt" } },
  { id: "kw-hawalli", countryId: "kw", names: { ar: "حولي", en: "Hawalli", tr: "Havalli" } },
  { id: "kw-salmiya", countryId: "kw", names: { ar: "السالمية", en: "Salmiya", tr: "Salmiya" } },
  { id: "lb-sidon", countryId: "lb", names: { ar: "صيدا", en: "Sidon", tr: "Sayda" } },
  { id: "lb-zahle", countryId: "lb", names: { ar: "زحلة", en: "Zahle", tr: "Zahle" } },
  { id: "lb-baalbek", countryId: "lb", names: { ar: "بعلبك", en: "Baalbek", tr: "Baalbek" } },
  { id: "ly-misrata", countryId: "ly", names: { ar: "مصراتة", en: "Misrata", tr: "Misrata" } },
  { id: "ly-sabha", countryId: "ly", names: { ar: "سبها", en: "Sabha", tr: "Sebha" } },
  { id: "ly-derna", countryId: "ly", names: { ar: "درنة", en: "Derna", tr: "Derne" } },
  { id: "mr-rosso", countryId: "mr", names: { ar: "روصو", en: "Rosso", tr: "Rosso" } },
  { id: "mr-atar", countryId: "mr", names: { ar: "أطار", en: "Atar", tr: "Atar" } },
  { id: "ma-marrakech", countryId: "ma", names: { ar: "مراكش", en: "Marrakech", tr: "Marakeş" } },
  { id: "ma-tangier", countryId: "ma", names: { ar: "طنجة", en: "Tangier", tr: "Tanca" } },
  { id: "ma-agadir", countryId: "ma", names: { ar: "أكادير", en: "Agadir", tr: "Agadir" } },
  { id: "ma-fez", countryId: "ma", names: { ar: "فاس", en: "Fez", tr: "Fes" } },
  { id: "om-sohar", countryId: "om", names: { ar: "صحار", en: "Sohar", tr: "Suhar" } },
  { id: "om-sur", countryId: "om", names: { ar: "صور", en: "Sur", tr: "Sur" } },
  { id: "om-khasab", countryId: "om", names: { ar: "خصب", en: "Khasab", tr: "Hasab" } },
  { id: "om-ibri", countryId: "om", names: { ar: "عبري", en: "Ibri", tr: "İbri" } },
  { id: "ps-ramallah", countryId: "ps", names: { ar: "رام الله", en: "Ramallah", tr: "Ramallah" } },
  { id: "ps-hebron", countryId: "ps", names: { ar: "الخليل", en: "Hebron", tr: "El Halil" } },
  { id: "ps-nablus", countryId: "ps", names: { ar: "نابلس", en: "Nablus", tr: "Nablus" } },
  { id: "qa-al-wakrah", countryId: "qa", names: { ar: "الوكرة", en: "Al Wakrah", tr: "Al Vakra" } },
  { id: "qa-al-khor", countryId: "qa", names: { ar: "الخور", en: "Al Khor", tr: "Al Hor" } },
  { id: "qa-umm-salal", countryId: "qa", names: { ar: "أم صلال", en: "Umm Salal", tr: "Ümm Salal" } },
  { id: "sa-medina", countryId: "sa", names: { ar: "المدينة المنورة", en: "Medina", tr: "Medine" } },
  { id: "sa-dammam", countryId: "sa", names: { ar: "الدمام", en: "Dammam", tr: "Dammam" } },
  { id: "sa-abha", countryId: "sa", names: { ar: "أبها", en: "Abha", tr: "Abha" } },
  { id: "sa-tabuk", countryId: "sa", names: { ar: "تبوك", en: "Tabuk", tr: "Tebük" } },
  { id: "so-kismayo", countryId: "so", names: { ar: "كيسمايو", en: "Kismayo", tr: "Kismayo" } },
  { id: "so-bosaso", countryId: "so", names: { ar: "بوصاصو", en: "Bosaso", tr: "Boosaaso" } },
  { id: "sd-omdurman", countryId: "sd", names: { ar: "أم درمان", en: "Omdurman", tr: "Omdurman" } },
  { id: "sd-wad-madani", countryId: "sd", names: { ar: "ود مدني", en: "Wad Madani", tr: "Vad Medeni" } },
  { id: "sd-nyala", countryId: "sd", names: { ar: "نيالا", en: "Nyala", tr: "Nyala" } },
  { id: "sy-homs", countryId: "sy", names: { ar: "حمص", en: "Homs", tr: "Humus" } },
  { id: "sy-hama", countryId: "sy", names: { ar: "حماة", en: "Hama", tr: "Hama" } },
  { id: "sy-latakia", countryId: "sy", names: { ar: "اللاذقية", en: "Latakia", tr: "Lazkiye" } },
  { id: "tn-sousse", countryId: "tn", names: { ar: "سوسة", en: "Sousse", tr: "Susa" } },
  { id: "tn-monastir", countryId: "tn", names: { ar: "المنستير", en: "Monastir", tr: "Manastır" } },
  { id: "tn-bizerte", countryId: "tn", names: { ar: "بنزرت", en: "Bizerte", tr: "Bizerte" } },
  { id: "ae-sharjah", countryId: "ae", names: { ar: "الشارقة", en: "Sharjah", tr: "Şarika" } },
  { id: "ae-ajman", countryId: "ae", names: { ar: "عجمان", en: "Ajman", tr: "Acman" } },
  { id: "ae-al-ain", countryId: "ae", names: { ar: "العين", en: "Al Ain", tr: "El Ayn" } },
  { id: "ae-ras-al-khaimah", countryId: "ae", names: { ar: "رأس الخيمة", en: "Ras Al Khaimah", tr: "Ras Al-Hayme" } },
  { id: "ye-taiz", countryId: "ye", names: { ar: "تعز", en: "Taiz", tr: "Taiz" } },
  { id: "ye-hodeidah", countryId: "ye", names: { ar: "الحديدة", en: "Hodeidah", tr: "Hudeyde" } },
  { id: "ye-ibb", countryId: "ye", names: { ar: "إب", en: "Ibb", tr: "İbb" } },
  { id: "ye-mukalla", countryId: "ye", names: { ar: "المكلا", en: "Mukalla", tr: "Mukalla" } },
  { id: "tr-izmir", countryId: "tr", names: { ar: "إزمير", en: "Izmir", tr: "İzmir" } },
  { id: "tr-bursa", countryId: "tr", names: { ar: "بورصة", en: "Bursa", tr: "Bursa" } },
  { id: "tr-konya", countryId: "tr", names: { ar: "قونية", en: "Konya", tr: "Konya" } },
  { id: "tr-adana", countryId: "tr", names: { ar: "أضنة", en: "Adana", tr: "Adana" } },
  { id: "tr-gaziantep", countryId: "tr", names: { ar: "غازي عنتاب", en: "Gaziantep", tr: "Gaziantep" } },
  { id: "tr-mersin", countryId: "tr", names: { ar: "مرسين", en: "Mersin", tr: "Mersin" } },
  { id: "tr-trabzon", countryId: "tr", names: { ar: "طرابزون", en: "Trabzon", tr: "Trabzon" } },
];

function citiesForCountry(countryId: CountryId) {
  return cityOptions.filter((city) => city.countryId === countryId);
}

function detectCity(countryId: CountryId): string {
  const availableCities = citiesForCountry(countryId);
  if (typeof window === "undefined") return availableCities[0]?.id ?? "";
  try {
    const stored = window.localStorage.getItem("akarpromax-city");
    if (stored && availableCities.some((city) => city.id === stored)) return stored;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return availableCities.find((city) => city.timeZones?.includes(timeZone))?.id ?? availableCities[0]?.id ?? "";
  } catch {
    return availableCities[0]?.id ?? "";
  }
}

function detectCountry(): CountryId {
  if (typeof window === "undefined") return "om";
  try {
    const stored = window.localStorage.getItem("akarpromax-country");
    if (stored && countryOptions.some((country) => country.id === stored)) return stored;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const byTimeZone = countryOptions.find((country) => country.timeZones.includes(timeZone));
    if (byTimeZone) return byTimeZone.id;
    const browserLocale = (navigator.language || "").toLowerCase();
    const byLocale = countryOptions.find((country) => country.localeCodes.some((code) => browserLocale.startsWith(code)));
    return byLocale?.id ?? "om";
  } catch {
    return "om";
  }
}

const translations: Record<Locale, Translation> = {
  ar: {
    metaTitle: "عقار بروماكس | منصة العقار الذكية في عُمان",
    brandTitle: "عقار بروماكس",
    brandSubtitle: "المنصة العقارية الرقمية الشاملة",
    country: "عُمان",
    currency: "ر.ع",
    sidebarAria: "لوحة التنقل",
    closeMenu: "إغلاق القائمة",
    showMenu: "إظهار القائمة",
    toolsAria: "أدوات الحساب والمنصة",
    countryAria: "الدولة",
    cityAria: "المدينة",
    currencyAria: "العملة",
    languageAria: "اختيار اللغة",
    themeAria: "اختيار مظهر المنصة",
    themeSystem: "حسب النظام",
    themeLight: "نهاري",
    themeDark: "داكن",
    officeAppAria: "تطبيق المكتب",
    login: "دخول",
    register: "تسجيل جديد",
    tickerAria: "الشريط الإخباري",
    tickerLabel: "آخر الأخبار",
    tickerPause: "إيقاف الشريط الإخباري",
    ticker: ["منصة عقار بروماكس تستعد لإطلاق تجربة عقارية أوضح في عُمان", "تحديثات السوق والخدمات العقارية أولًا بأول", "تطبيق AkarPromax Office متصل بالمنصة"],
    heroAria: "إعلان الهيدر الرئيسي",
    heroEyebrow: "إعلان مميز من عقار بروماكس",
    heroTitle: "اكتشف العقارات",
    heroAccent: "للبيع والإيجار",
    heroSub: "المنصة العقارية الرائدة في عُمان",
    heroCta: "استكشف الآن",
    welcomeKicker: "منصة عقارية عُمانية",
    welcomeTitle: "نرتّب قرارك العقاري",
    welcomeAccent: "في مكان واحد.",
    welcomeDescription: "عقارات، مكاتب، خدمات، وأدوات مهنية بتجربة هادئة وواضحة، مع بيانات قابلة للتدقيق واتصال مباشر مع المكتب.",
    browse: "تصفح العقارات",
    join: "انضم إلينا",
    visualAria: "صورة توضيحية للعقار",
    visualTag: "نظرة أوضح",
    visualSmall: "اختيارات عقارية من عُمان",
    propertiesKicker: "مختارات المنصة",
    propertiesTitle: "اكتشف العقار",
    propertiesAccent: "بالطريقة التي تناسبك.",
    viewAll: "عرض كل العقارات",
    propertyCards: [
      { tag: "عقار مميز", meta: "مسقط · للبيع", title: "مساحات تستحق أن تراها بوضوح.", link: "اعرف المزيد" },
      { tag: "قريبًا", meta: "بحث منظم", title: "حقول مطابقة ونتائج أسهل." },
      { tag: "للوسطاء", meta: "مكتبك في المنصة", title: "ملف مهني وصلاحيات واضحة." },
    ],
    servicesKicker: "مسارات جديدة",
    servicesTitle: "أدوات المنصة",
    servicesAccent: "تتوسع معك.",
    servicesNote: "كل وحدة تُبنى بشكل مستقل\nوتتصل بالنواة بأمان.",
    services: [
      { title: "المكاتب العقارية", description: "ملفات ومواقع مهنية تظهر للمستخدم الأقرب." },
      { title: "سوق الخدمات", description: "طلبات عروض أسعار للحرفيين والمهنيين." },
      { title: "المزادات", description: "مزايدة واضحة بإقرارات وسجل عمليات." },
      { title: "التقارير العقارية", description: "معاينة هندسية وتثمين قابلان للتوثيق." },
    ],
    officeKicker: "امتداد المكتب العقاري",
    officeDescription: "التطبيق المكتبي يستقبل أخبار المنصة وإعلاناتها، ويرفع مسودات العقارات بحدود آمنة، ويربط الرادار بفرص المناطق القريبة من مكتبك.",
    officeCta: "اعرف عن التكامل",
    officeSync: "مزامنة آمنة",
    officeStats: ["أخبار", "إعلانات", "رادار"],
    adLabel: "اعلن هنا",
    adDescription: "مساحة إعلانية قابلة للإدارة",
    sponsorAria: "راعي المنصة حسب الدولة",
    sponsorLabel: "برنامج الرعاة المحليين",
    sponsorOfficial: "الراعي الرسمي في",
    sponsorAvailable: "مساحة الرعاية متاحة",
    sponsorDescription: "تتغير هوية الراعي تلقائيًا حسب الدولة المختارة وتظهر بصورة موحّدة في صفحات المنصة.",
    sponsorCta: "كن الراعي الرسمي",
    sponsorLogo: "شعار الراعي",
    sponsorPage: "شريك المنصة في",
    sponsorFooter: "برعاية الشريك الرسمي",
    accountKicker: "ابدأ بخطوة موثقة",
    accountTitle: "حسابك هو مفتاح",
    accountAccent: "المنصة.",
    accountDescription: "سيكون التسجيل عبر البريد والهاتف، مع التحقق قبل منح أي صلاحيات. نبدأ بحساب عادي ثم تُضاف الأدوار من الإدارة بعد المراجعة.",
    accountCta: "اطلب الانضمام المبكر",
    quickTitle: "روابط سريعة",
    usefulTitle: "معلومات مفيدة",
    contactTitle: "تواصل معنا",
    quickLinks: ["الرئيسية", "عقارات للبيع", "عقارات للإيجار", "المكاتب العقارية", "خدمات أخرى", "المدونة العقارية"],
    usefulLinks: ["من نحن", "أعلن معنا", "اتصل بنا", "الشروط والأحكام", "سياسة الخصوصية", "تحميل البرنامج", "الأسئلة الشائعة"],
    contactLocation: "نزوى · سلطنة عُمان",
    contactEmail: "info@akarpromax.om",
    contactTeam: "تحدث مع فريقنا",
    footerDescription: "المنصة العقارية الرقمية الشاملة. نرتّب رحلة البحث عن عقارك لتكون أسهل وأكثر موثوقية.",
    footerRights: "© 2026 عقار بروماكس. جميع الحقوق محفوظة.",
    footerTagline: "منصة عُمانية للعقار والخدمات المهنية",
    chatAria: "تواصل مع عقار بروماكس",
    arrow: "←",
    sidebar: [["⌂", "الرئيسية"], ["▥", "الكتب والبرامج"], ["◁", "أعلن معنا"], ["⌖", "من نحن"], ["♧", "اتصل بنا"], ["⌘", "الأسئلة الشائعة"], ["▦", "لوحة الإدارة"], ["♙", "إدارة المستخدمين"], ["◁", "إدارة الإعلانات"], ["◁", "admin.newsTicker"], ["▣", "إدارة الاشتراكات"], ["⚑", "إدارة العقارات"], ["⚒", "إدارة الخدمات"], ["♢", "إدارة المسوقين"], ["♧", "المشرفون والصلاحيات"], ["⚿", "مفاتيح التراخيص"], ["▤", "الخطط والأسعار"], ["◇", "الخصومات والكوبونات"], ["▱", "التقارير والتحليلات"], ["⚙", "إعدادات النظام"]],
  },
  en: {
    metaTitle: "AkarPromax | Smart real estate platform in Oman",
    brandTitle: "AkarPromax",
    brandSubtitle: "The complete digital real estate platform",
    country: "Oman",
    currency: "OMR",
    sidebarAria: "Navigation panel",
    closeMenu: "Close menu",
    showMenu: "Show menu",
    toolsAria: "Account and platform tools",
    countryAria: "Country",
    cityAria: "City",
    currencyAria: "Currency",
    languageAria: "Choose language",
    themeAria: "Choose appearance",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    officeAppAria: "Office app",
    login: "Log in",
    register: "Register",
    tickerAria: "News ticker",
    tickerLabel: "Latest news",
    tickerPause: "Pause news ticker",
    ticker: ["AkarPromax is preparing a clearer real estate experience in Oman", "Market and property-service updates, one step at a time", "AkarPromax Office is connected to the platform"],
    heroAria: "Main header advertisement",
    heroEyebrow: "Featured advertisement by AkarPromax",
    heroTitle: "Discover properties",
    heroAccent: "for sale and rent",
    heroSub: "Oman's leading real estate platform",
    heroCta: "Explore now",
    welcomeKicker: "An Omani real estate platform",
    welcomeTitle: "Bring your property decision",
    welcomeAccent: "into one clear place.",
    welcomeDescription: "Properties, offices, services, and professional tools in a calm, clear experience with verifiable data and direct office contact.",
    browse: "Browse properties",
    join: "Join us",
    visualAria: "Property illustration",
    visualTag: "A clearer view",
    visualSmall: "Property choices from Oman",
    propertiesKicker: "Platform picks",
    propertiesTitle: "Discover property",
    propertiesAccent: "your way.",
    viewAll: "View all properties",
    propertyCards: [
      { tag: "Featured", meta: "Muscat · For sale", title: "Spaces worth seeing clearly.", link: "Learn more" },
      { tag: "Coming soon", meta: "Organized search", title: "Matching fields and easier results." },
      { tag: "For brokers", meta: "Your office on the platform", title: "A professional profile with clear permissions." },
    ],
    servicesKicker: "New paths",
    servicesTitle: "Platform tools",
    servicesAccent: "grow with you.",
    servicesNote: "Each module is built independently\nand connects to the core securely.",
    services: [
      { title: "Real estate offices", description: "Professional profiles appear to the closest users." },
      { title: "Service marketplace", description: "Quote requests for artisans and professionals." },
      { title: "Auctions", description: "Clear bidding with acknowledgements and an activity log." },
      { title: "Property reports", description: "Documentable engineering inspections and valuations." },
    ],
    officeKicker: "The real estate office extension",
    officeDescription: "The desktop app receives platform news and ads, uploads property drafts safely, and connects the radar to opportunities near your office.",
    officeCta: "Explore the integration",
    officeSync: "Secure sync",
    officeStats: ["News", "Ads", "Radar"],
    adLabel: "Advertise here",
    adDescription: "Managed advertising space",
    sponsorAria: "Country-based platform sponsor",
    sponsorLabel: "Local sponsor programme",
    sponsorOfficial: "Official sponsor in",
    sponsorAvailable: "Sponsorship available",
    sponsorDescription: "The sponsor identity changes automatically with the selected country and appears consistently across platform pages.",
    sponsorCta: "Become the official sponsor",
    sponsorLogo: "Sponsor logo",
    sponsorPage: "Platform partner in",
    sponsorFooter: "Supported by the official partner",
    accountKicker: "Start with a verified step",
    accountTitle: "Your account is the key",
    accountAccent: "to the platform.",
    accountDescription: "Registration will use email and phone verification before any permissions are granted. Start as a standard user, then add roles after review.",
    accountCta: "Request early access",
    quickTitle: "Quick links",
    usefulTitle: "Useful information",
    contactTitle: "Contact us",
    quickLinks: ["Home", "Properties for sale", "Properties for rent", "Real estate offices", "Other services", "Property blog"],
    usefulLinks: ["About us", "Advertise with us", "Contact us", "Terms and conditions", "Privacy policy", "Download the app", "FAQ"],
    contactLocation: "Nizwa · Sultanate of Oman",
    contactEmail: "info@akarpromax.om",
    contactTeam: "Talk to our team",
    footerDescription: "The complete digital real estate platform. We make the journey to your next property easier and more trustworthy.",
    footerRights: "© 2026 AkarPromax. All rights reserved.",
    footerTagline: "An Omani platform for property and professional services",
    chatAria: "Contact AkarPromax",
    arrow: "→",
    sidebar: [["⌂", "Home"], ["▥", "Books and programs"], ["◁", "Advertise with us"], ["⌖", "About us"], ["♧", "Contact us"], ["⌘", "FAQ"], ["▦", "Admin dashboard"], ["♙", "User management"], ["◁", "Ad management"], ["◁", "admin.newsTicker"], ["▣", "Subscriptions"], ["⚑", "Property management"], ["⚒", "Service management"], ["♢", "Marketers"], ["♧", "Moderators and permissions"], ["⚿", "License keys"], ["▤", "Plans and pricing"], ["◇", "Discounts and coupons"], ["▱", "Reports and analytics"], ["⚙", "System settings"]],
  },
  tr: {
    metaTitle: "AkarPromax | Umman'da akıllı gayrimenkul platformu",
    brandTitle: "AkarPromax",
    brandSubtitle: "Kapsamlı dijital gayrimenkul platformu",
    country: "Umman",
    currency: "OMR",
    sidebarAria: "Gezinme paneli",
    closeMenu: "Menüyü kapat",
    showMenu: "Menüyü göster",
    toolsAria: "Hesap ve platform araçları",
    countryAria: "Ülke",
    cityAria: "Şehir",
    currencyAria: "Para birimi",
    languageAria: "Dil seçin",
    themeAria: "Görünüm seçin",
    themeSystem: "Sistem",
    themeLight: "Açık",
    themeDark: "Koyu",
    officeAppAria: "Ofis uygulaması",
    login: "Giriş yap",
    register: "Kayıt ol",
    tickerAria: "Haber bandı",
    tickerLabel: "Son haberler",
    tickerPause: "Haber bandını duraklat",
    ticker: ["AkarPromax, Umman'da daha anlaşılır bir gayrimenkul deneyimi hazırlıyor", "Pazar ve gayrimenkul hizmeti güncellemeleri anında", "AkarPromax Office platforma bağlı"],
    heroAria: "Ana başlık reklamı",
    heroEyebrow: "AkarPromax'tan öne çıkan ilan",
    heroTitle: "Gayrimenkulleri keşfedin",
    heroAccent: "satılık ve kiralık",
    heroSub: "Umman'ın öncü gayrimenkul platformu",
    heroCta: "Şimdi keşfet",
    welcomeKicker: "Umman gayrimenkul platformu",
    welcomeTitle: "Gayrimenkul kararınızı",
    welcomeAccent: "tek bir yerde netleştirin.",
    welcomeDescription: "Gayrimenkuller, ofisler, hizmetler ve profesyonel araçlar; doğrulanabilir veriler ve ofisle doğrudan iletişim sunan sade bir deneyimde.",
    browse: "Gayrimenkullere göz at",
    join: "Bize katılın",
    visualAria: "Gayrimenkul görseli",
    visualTag: "Daha net bir bakış",
    visualSmall: "Umman'dan gayrimenkul seçenekleri",
    propertiesKicker: "Platform seçkileri",
    propertiesTitle: "Gayrimenkulü keşfedin",
    propertiesAccent: "size uygun şekilde.",
    viewAll: "Tüm gayrimenkulleri gör",
    propertyCards: [
      { tag: "Öne çıkan", meta: "Maskat · Satılık", title: "Net bir şekilde görmeye değer alanlar.", link: "Daha fazla bilgi" },
      { tag: "Yakında", meta: "Düzenli arama", title: "Eşleşen alanlar ve daha kolay sonuçlar." },
      { tag: "Brokerler için", meta: "Ofisiniz platformda", title: "Net yetkilere sahip profesyonel profil." },
    ],
    servicesKicker: "Yeni yollar",
    servicesTitle: "Platform araçları",
    servicesAccent: "sizinle büyür.",
    servicesNote: "Her modül bağımsız geliştirilir\nve çekirdeğe güvenle bağlanır.",
    services: [
      { title: "Gayrimenkul ofisleri", description: "Profesyonel profiller en yakın kullanıcılara görünür." },
      { title: "Hizmet pazarı", description: "Ustalar ve profesyoneller için teklif talepleri." },
      { title: "Müzayedeler", description: "Onaylar ve işlem geçmişiyle şeffaf teklif süreci." },
      { title: "Gayrimenkul raporları", description: "Belgelendirilebilir mühendislik incelemeleri ve değerlemeler." },
    ],
    officeKicker: "Gayrimenkul ofisi uzantısı",
    officeDescription: "Masaüstü uygulaması platform haberlerini ve ilanlarını alır, gayrimenkul taslaklarını güvenle yükler ve radarınızı ofisinize yakın fırsatlarla bağlar.",
    officeCta: "Entegrasyonu keşfet",
    officeSync: "Güvenli senkronizasyon",
    officeStats: ["Haberler", "İlanlar", "Radar"],
    adLabel: "Buraya reklam verin",
    adDescription: "Yönetilebilir reklam alanı",
    sponsorAria: "Ülkeye göre platform sponsoru",
    sponsorLabel: "Yerel sponsor programı",
    sponsorOfficial: "Resmî sponsor:",
    sponsorAvailable: "Sponsorluk alanı müsait",
    sponsorDescription: "Sponsor kimliği seçilen ülkeye göre otomatik değişir ve platform sayfalarında tutarlı biçimde görünür.",
    sponsorCta: "Resmî sponsor olun",
    sponsorLogo: "Sponsor logosu",
    sponsorPage: "Platform ortağı:",
    sponsorFooter: "Resmî iş ortağının desteğiyle",
    accountKicker: "Doğrulanmış bir adımla başlayın",
    accountTitle: "Hesabınız platformun",
    accountAccent: "anahtarıdır.",
    accountDescription: "Herhangi bir yetki verilmeden önce e-posta ve telefon doğrulaması yapılır. Önce standart hesap açılır, roller incelemeden sonra eklenir.",
    accountCta: "Erken erişim iste",
    quickTitle: "Hızlı bağlantılar",
    usefulTitle: "Faydalı bilgiler",
    contactTitle: "Bize ulaşın",
    quickLinks: ["Ana sayfa", "Satılık gayrimenkuller", "Kiralık gayrimenkuller", "Gayrimenkul ofisleri", "Diğer hizmetler", "Gayrimenkul blogu"],
    usefulLinks: ["Hakkımızda", "Bize reklam verin", "İletişim", "Şartlar ve koşullar", "Gizlilik politikası", "Uygulamayı indir", "SSS"],
    contactLocation: "Nizva · Umman Sultanlığı",
    contactEmail: "info@akarpromax.om",
    contactTeam: "Ekibimizle konuşun",
    footerDescription: "Kapsamlı dijital gayrimenkul platformu. Gayrimenkul arama yolculuğunuzu daha kolay ve güvenilir hale getiriyoruz.",
    footerRights: "© 2026 AkarPromax. Tüm hakları saklıdır.",
    footerTagline: "Gayrimenkul ve profesyonel hizmetler için Umman platformu",
    chatAria: "AkarPromax ile iletişime geç",
    arrow: "→",
    sidebar: [["⌂", "Ana sayfa"], ["▥", "Kitaplar ve programlar"], ["◁", "Bize reklam verin"], ["⌖", "Hakkımızda"], ["♧", "İletişim"], ["⌘", "SSS"], ["▦", "Yönetim paneli"], ["♙", "Kullanıcı yönetimi"], ["◁", "İlan yönetimi"], ["◁", "admin.newsTicker"], ["▣", "Abonelikler"], ["⚑", "Gayrimenkul yönetimi"], ["⚒", "Hizmet yönetimi"], ["♢", "Pazarlamacılar"], ["♧", "Moderatörler ve yetkiler"], ["⚿", "Lisans anahtarları"], ["▤", "Planlar ve fiyatlar"], ["◇", "İndirimler ve kuponlar"], ["▱", "Raporlar ve analizler"], ["⚙", "Sistem ayarları"]],
  },
};

function Brand({ copy }: { copy: Translation }) {
  return (
    <a className="brand" href="#top" aria-label={copy.brandTitle}>
      <span className="brand-mark">A</span>
      <span className="brand-copy"><strong>{copy.brandTitle}</strong><small>{copy.brandSubtitle}</small></span>
    </a>
  );
}

function CountryFlag({ country }: { country: CountryOption }) {
  return <span className="country-flag" aria-hidden="true"><img src={`https://flagcdn.com/24x18/${country.id}.png`} alt="" decoding="async" onError={(event) => { event.currentTarget.parentElement?.classList.add("emoji-fallback"); }} /><span className="country-flag-emoji">{country.flag}</span></span>;
}

function SponsorIdentity({ logoUrl, name, countryCode, compact = false }: { logoUrl: string | null; name: string; countryCode: string; compact?: boolean }) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);

  if (logoUrl && logoUrl !== failedLogoUrl) {
    return <img className={`sponsor-logo-image${compact ? " sponsor-logo-small" : ""}`} src={logoUrl} alt={name} decoding="async" onError={() => setFailedLogoUrl(logoUrl)} />;
  }

  const initial = Array.from(name.trim())[0] || "S";
  return (
    <div className={`sponsor-logo sponsor-logo-fallback${compact ? " sponsor-logo-small" : ""}`} role="img" aria-label={name}>
      <span>{initial}</span>
      {!compact && <strong>{name}</strong>}
      <small>{countryCode.toUpperCase()}</small>
    </div>
  );
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [country, setCountry] = useState<CountryId>("om");
  const [countryOpen, setCountryOpen] = useState(false);
  const [city, setCity] = useState("om-muscat");
  const [cityOpen, setCityOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [themeOpen, setThemeOpen] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [activeSponsor, setActiveSponsor] = useState<PublicSponsor | null>(null);
  const [managedHeroAds, setManagedHeroAds] = useState<PublicAdCampaign[]>([]);
  const [deviceType, setDeviceType] = useState<"desktop" | "mobile">("desktop");
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [heroInteracting, setHeroInteracting] = useState(false);
  const [viewer, setViewer] = useState<ViewerContext>({ authenticated: false, displayName: "Guest", role: "guest", countryCode: null, permissions: [] });
  const dropdownCloseTimers = useRef<Partial<Record<"country" | "city" | "language" | "theme", number>>>({});
  const heroTouchStartX = useRef<number | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const recordedAdEvents = useRef(new Set<string>());
  const copy = translations[locale];
  const direction = locale === "ar" ? "rtl" : "ltr";
  const selectedLanguage = languageOptions.find((option) => option.id === locale) ?? languageOptions[0];
  const selectedTheme = themeOptions.find((option) => option.id === themeMode) ?? themeOptions[0];
  const selectedCountry = countryOptions.find((option) => option.id === country) ?? countryOptions.find((option) => option.id === "om")!;
  const selectedCity = cityOptions.find((option) => option.id === city && option.countryId === country) ?? citiesForCountry(country)[0] ?? cityOptions[0];
  const selectedCurrency = currenciesByCountry[country] ?? currenciesByCountry.om;
  const selectedSponsorTone = sponsorToneByCountry[country] ?? "blue";
  const sponsorContactHref = `mailto:partners@akarpromax.om?subject=${encodeURIComponent(`AkarPromax sponsor — ${selectedCountry.names.en}`)}`;
  const sponsorBannerUrl = activeSponsor?.bannerUrl || sponsorBannerByCountry[country] || "/sponsors/arab-blue.webp";
  const sponsorLogoUrl = activeSponsor?.logoUrl || null;
  const sponsorName = activeSponsor ? (locale === "ar" ? activeSponsor.nameAr : locale === "tr" ? activeSponsor.nameTr : activeSponsor.nameEn) : copy.sponsorAvailable;
  const sponsorTargetHref = activeSponsor?.websiteUrl || sponsorContactHref;
  const sponsorActionLabel = activeSponsor ? (locale === "ar" ? "زيارة الراعي" : locale === "tr" ? "Sponsoru ziyaret et" : "Visit sponsor") : copy.sponsorCta;
  const sponsorPlacements = activeSponsor?.placements ?? ["header", "content", "footer"];
  const fallbackHeroSlides: HeroAdSlide[] = [
    {
      id: "discover",
      mediaType: "image",
      mediaUrl: "/og.png",
      eyebrow: copy.heroEyebrow,
      title: copy.heroTitle,
      accent: copy.heroAccent,
      description: copy.heroSub,
      cta: copy.heroCta,
      href: "#properties",
    },
    {
      id: "country-sponsor",
      mediaType: isVideoAsset(sponsorBannerUrl) ? "video" : "image",
      mediaUrl: sponsorBannerUrl,
      posterUrl: sponsorBannerByCountry[country] || "/sponsors/arab-blue.webp",
      eyebrow: copy.sponsorLabel,
      title: activeSponsor ? sponsorName : locale === "ar" ? "إعلان يتغير حسب الدولة" : locale === "tr" ? "Ülkeye göre değişen reklam" : "Advertising tailored by country",
      accent: selectedCountry.names[locale],
      description: activeSponsor ? copy.sponsorDescription : locale === "ar" ? "مساحة مرنة لعرض حملات الرعاة بالصور أو الفيديو وفق موقع الزائر." : locale === "tr" ? "Ziyaretçinin konumuna göre görsel veya video sponsor kampanyaları için esnek alan." : "A flexible image or video campaign space tailored to each visitor’s location.",
      cta: sponsorActionLabel,
      href: sponsorTargetHref,
      sponsored: Boolean(activeSponsor),
    },
    {
      id: "market",
      mediaType: "image",
      mediaUrl: "/sponsors/arab-blue.webp",
      eyebrow: locale === "ar" ? "فرص عقارية مختارة" : locale === "tr" ? "Seçilmiş gayrimenkul fırsatları" : "Curated property opportunities",
      title: locale === "ar" ? "ابحث بثقة" : locale === "tr" ? "Güvenle arayın" : "Search with confidence",
      accent: locale === "ar" ? "واتخذ قرارك بوضوح" : locale === "tr" ? "ve net karar verin" : "and decide with clarity",
      description: locale === "ar" ? "تجربة عقارية واضحة تجمع الإعلانات والخدمات والمكاتب في مكان واحد." : locale === "tr" ? "İlanları, hizmetleri ve ofisleri tek yerde buluşturan net bir gayrimenkul deneyimi." : "A clear property experience bringing listings, services and offices together.",
      cta: copy.heroCta,
      href: "#properties",
    },
  ];
  const managedHeroSlides: HeroAdSlide[] = managedHeroAds.map((campaign) => ({
    id: `campaign-${campaign.id}`,
    campaignId: campaign.id,
    mediaType: campaign.mediaType,
    mediaUrl: deviceType === "mobile" && campaign.mobileMediaUrl ? campaign.mobileMediaUrl : campaign.mediaUrl,
    posterUrl: campaign.posterUrl || undefined,
    eyebrow: locale === "ar" ? campaign.eyebrowAr : locale === "tr" ? campaign.eyebrowTr : campaign.eyebrowEn,
    title: locale === "ar" ? campaign.titleAr : locale === "tr" ? campaign.titleTr : campaign.titleEn,
    accent: locale === "ar" ? campaign.accentAr : locale === "tr" ? campaign.accentTr : campaign.accentEn,
    description: locale === "ar" ? campaign.descriptionAr : locale === "tr" ? campaign.descriptionTr : campaign.descriptionEn,
    cta: locale === "ar" ? campaign.ctaAr : locale === "tr" ? campaign.ctaTr : campaign.ctaEn,
    href: campaign.targetUrl,
    sponsored: campaign.campaignType === "sponsor",
  }));
  const heroSlides = managedHeroSlides.length ? managedHeroSlides : fallbackHeroSlides;
  const activeHeroSlide = heroSlides[activeHeroIndex % heroSlides.length];
  const canOpenSponsorAdmin = viewer.permissions.includes("sponsors:read");
  const canOpenAdsAdmin = viewer.permissions.includes("ads:read");
  const sidebarIndexes = viewer.role === "super_admin"
    ? copy.sidebar.map((_, index) => index)
    : viewer.role === "sponsor_admin"
      ? [0, 1, 2, 3, 4, 5, 6, 17]
      : viewer.role === "ad_manager"
        ? [0, 1, 2, 3, 4, 5, 17]
      : viewer.role === "country_manager"
        ? [0, 1, 2, 3, 4, 5, 6, 12, 13, 17]
        : viewer.role === "content_editor"
          ? [0, 1, 2, 3, 4, 5, 9]
          : viewer.role === "analyst"
            ? [0, 1, 2, 3, 4, 5, 17]
            : [0, 1, 2, 3, 4, 5];
  const sidebarOpen = sidebarPinned || sidebarHovered;
  const selectHeroSlide = (index: number) => setActiveHeroIndex((index + heroSlides.length) % heroSlides.length);

  const trackSponsorEvent = (placement: "header" | "content" | "footer", eventType: "impression" | "click") => {
    if (!activeSponsor) return;
    void fetch("/api/sponsor-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sponsorId: activeSponsor.id, countryCode: country, placement, eventType }),
      keepalive: true,
    }).catch(() => undefined);
  };

  const trackAdEvent = (eventType: string, campaignId = activeHeroSlide.campaignId) => {
    if (!campaignId) return;
    void fetch("/api/ad-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, eventType, countryCode: country, cityId: city, locale, device: deviceType }),
      keepalive: true,
    }).catch(() => undefined);
  };

  const trackVideoProgress = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!activeHeroSlide.campaignId) return;
    const video = event.currentTarget;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const ratio = video.currentTime / video.duration;
    const milestones: Array<[number, string]> = [[.25, "video_25"], [.5, "video_50"], [.75, "video_75"]];
    for (const [threshold, eventType] of milestones) {
      const key = `${activeHeroSlide.campaignId}:${eventType}`;
      if (ratio >= threshold && !recordedAdEvents.current.has(key)) {
        recordedAdEvents.current.add(key);
        trackAdEvent(eventType);
      }
    }
  };

  const cancelDropdownClose = (key: "country" | "city" | "language" | "theme") => {
    const timer = dropdownCloseTimers.current[key];
    if (timer !== undefined) {
      window.clearTimeout(timer);
      delete dropdownCloseTimers.current[key];
    }
  };

  const scheduleDropdownClose = (key: "country" | "city" | "language" | "theme", close: () => void) => {
    cancelDropdownClose(key);
    dropdownCloseTimers.current[key] = window.setTimeout(() => {
      close();
      delete dropdownCloseTimers.current[key];
    }, 120);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    document.title = copy.metaTitle;
  }, [copy.metaTitle, direction, locale]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const updateDevice = () => setDeviceType(media.matches ? "mobile" : "desktop");
    updateDevice();
    media.addEventListener("change", updateDevice);
    return () => media.removeEventListener("change", updateDevice);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/ads?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}&locale=${locale}&device=${deviceType}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : { campaigns: [] })
      .then((data: { campaigns?: PublicAdCampaign[] }) => {
        setManagedHeroAds(data.campaigns ?? []);
        setActiveHeroIndex(0);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [country, city, locale, deviceType]);

  useEffect(() => {
    if (heroPaused || heroInteracting || heroSlides.length < 2) return;
    const timer = window.setTimeout(() => {
      setActiveHeroIndex((index) => (index + 1) % heroSlides.length);
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [activeHeroIndex, heroInteracting, heroPaused, heroSlides.length]);

  useEffect(() => {
    const campaignId = activeHeroSlide.campaignId;
    const section = heroSectionRef.current;
    if (!campaignId || !section || recordedAdEvents.current.has(`${campaignId}:impression`)) return;
    let timer: number | undefined;
    const record = () => {
      const key = `${campaignId}:impression`;
      if (recordedAdEvents.current.has(key) || document.visibilityState !== "visible") return;
      recordedAdEvents.current.add(key);
      void fetch("/api/ad-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, eventType: "impression", countryCode: country, cityId: city, locale, device: deviceType }),
        keepalive: true,
      }).catch(() => undefined);
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && entries[0].intersectionRatio >= .5) {
        timer ??= window.setTimeout(record, 1000);
      } else if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    }, { threshold: [.5] });
    observer.observe(section);
    return () => {
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [activeHeroSlide.campaignId, city, country, deviceType, locale]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("akarpromax-theme");
    let mounted = true;
    window.queueMicrotask(() => {
      if (!mounted) return;
      if (storedTheme === "system" || storedTheme === "light" || storedTheme === "dark") setThemeMode(storedTheme);
      setThemeReady(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolvedTheme = themeMode === "system" ? (systemTheme.matches ? "dark" : "light") : themeMode;
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.dataset.themeMode = themeMode;
    };
    applyTheme();
    window.localStorage.setItem("akarpromax-theme", themeMode);
    if (themeMode === "system") systemTheme.addEventListener("change", applyTheme);
    return () => systemTheme.removeEventListener("change", applyTheme);
  }, [themeMode, themeReady]);

  useEffect(() => {
    const detectedCountry = detectCountry();
    const detectedCity = detectCity(detectedCountry);
    let mounted = true;
    window.queueMicrotask(() => {
      if (!mounted) return;
      setCountry(detectedCountry);
      setCity(detectedCity);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const availableCities = citiesForCountry(country);
    if (!availableCities.some((option) => option.id === city)) {
      const nextCity = detectCity(country);
      window.queueMicrotask(() => {
        setCity(nextCity);
        if (nextCity) window.localStorage.setItem("akarpromax-city", nextCity);
      });
    }
  }, [country, city]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/user-context", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data: ViewerContext | null) => { if (data) setViewer(data); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/sponsors?country=${encodeURIComponent(country)}`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : { sponsors: [] })
      .then((data: { sponsors?: PublicSponsor[] }) => setActiveSponsor(data.sponsors?.[0] ?? null))
      .catch(() => undefined);
    return () => controller.abort();
  }, [country]);

  useEffect(() => {
    if (!activeSponsor) return;
    activeSponsor.placements.forEach((placement) => {
      if (!["header", "content", "footer"].includes(placement)) return;
      void fetch("/api/sponsor-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorId: activeSponsor.id, countryCode: country, placement, eventType: "impression" }),
        keepalive: true,
      }).catch(() => undefined);
    });
  }, [activeSponsor, country]);

  useEffect(() => () => {
    Object.values(dropdownCloseTimers.current).forEach((timer) => {
      if (timer !== undefined) window.clearTimeout(timer);
    });
  }, []);

  return (
    <main className="reference-app" id="top" dir={direction} data-locale={locale}>
      <aside id="right-sidebar" className={sidebarOpen ? "right-sidebar sidebar-open" : "right-sidebar"} aria-label={copy.sidebarAria} onMouseEnter={() => setSidebarHovered(true)} onMouseLeave={() => setSidebarHovered(false)}>
        <div className="sidebar-head"><Brand copy={copy} /><button type="button" aria-label={copy.closeMenu} onClick={() => { setSidebarPinned(false); setSidebarHovered(false); }}>×</button></div>
        <div className="sidebar-scroll">
          {copy.sidebar.map(([icon, label], index) => ({ icon, label, index })).filter((item) => sidebarIndexes.includes(item.index)).map(({ icon, label, index }) => (
            <a className={index === 0 ? "sidebar-link active" : "sidebar-link"} href={index === 0 ? "#top" : `#module-${index}`} key={`${locale}-${index}-${label}`}>
              <span className="sidebar-icon" aria-hidden="true">{icon}</span><span>{label}</span>
            </a>
          ))}
          {canOpenAdsAdmin && <a className="sidebar-link sidebar-sponsor-admin" href="/admin/ads"><span className="sidebar-icon" aria-hidden="true">▣</span><span>{locale === "ar" ? "مركز الإعلانات" : locale === "tr" ? "Reklam merkezi" : "Advertising center"}</span></a>}
          {canOpenSponsorAdmin && <a className="sidebar-link sidebar-sponsor-admin" href="/admin/sponsors"><span className="sidebar-icon" aria-hidden="true">◆</span><span>{locale === "ar" ? "إدارة الرعاة" : locale === "tr" ? "Sponsor yönetimi" : "Sponsor management"}</span></a>}
        </div>
        <div className="sidebar-foot"><strong>{viewer.authenticated ? viewer.displayName : copy.brandTitle}</strong><span>{roleLabels[locale][viewer.role] ?? viewer.role} © 2026</span></div>
      </aside>

      <div className="site-canvas">
        <div className="sticky-topbar">
        <header className="reference-header">
          <div className="container header-inner">
            <button className="menu-trigger" type="button" aria-label={sidebarPinned ? copy.closeMenu : copy.showMenu} aria-controls="right-sidebar" aria-expanded={sidebarPinned} onClick={() => { setSidebarPinned((pinned) => !pinned); setSidebarHovered(false); }}>☰</button>
            <Brand copy={copy} />
            <div className="header-tools" aria-label={copy.toolsAria}>
              <div className="tool-cluster location-cluster">
              <div className="country-switcher" aria-label={copy.countryAria} onMouseEnter={() => cancelDropdownClose("country")} onMouseLeave={() => scheduleDropdownClose("country", () => setCountryOpen(false))} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { cancelDropdownClose("country"); setCountryOpen(false); } }}>
                <button className="country-trigger" type="button" aria-haspopup="menu" aria-expanded={countryOpen} onClick={() => { setCountryOpen((open) => !open); setCityOpen(false); setLanguageOpen(false); setThemeOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setCountryOpen(false); }}>
                  <CountryFlag country={selectedCountry} /><span>{selectedCountry.names[locale]}</span><span className="country-chevron" aria-hidden="true">⌄</span>
                </button>
                <div className="country-dropdown" role="menu" hidden={!countryOpen}>
                  {countryOptions.map((option) => <button key={option.id} type="button" role="menuitemradio" className={country === option.id ? "country-option active" : "country-option"} aria-label={option.names[locale]} aria-checked={country === option.id} onClick={() => { const nextCity = detectCity(option.id); setActiveSponsor(null); setCountry(option.id); setCity(nextCity); setCountryOpen(false); window.localStorage.setItem("akarpromax-country", option.id); window.localStorage.setItem("akarpromax-city", nextCity); }}><CountryFlag country={option} /><span>{option.names[locale]}</span>{option.id === "om" && <small>{copy.country}</small>}</button>)}
                </div>
              </div>
              <div className="city-switcher" aria-label={copy.cityAria} onMouseEnter={() => cancelDropdownClose("city")} onMouseLeave={() => scheduleDropdownClose("city", () => setCityOpen(false))} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { cancelDropdownClose("city"); setCityOpen(false); } }}>
                <button className="city-trigger" type="button" aria-haspopup="menu" aria-expanded={cityOpen} onClick={() => { setCityOpen((open) => !open); setCountryOpen(false); setLanguageOpen(false); setThemeOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setCityOpen(false); }}>
                  <span className="city-pin" aria-hidden="true">⌖</span><span>{selectedCity.names[locale]}</span><span className="city-chevron" aria-hidden="true">⌄</span>
                </button>
                <div className="city-dropdown" role="menu" hidden={!cityOpen}>
                  {citiesForCountry(country).map((option) => <button key={option.id} type="button" role="menuitemradio" className={city === option.id ? "city-option active" : "city-option"} aria-label={option.names[locale]} aria-checked={city === option.id} onClick={() => { setCity(option.id); setCityOpen(false); window.localStorage.setItem("akarpromax-city", option.id); }}><span className="city-pin" aria-hidden="true">⌖</span><span>{option.names[locale]}</span></button>)}
                </div>
              </div>
              </div>
              <div className="tool-cluster preference-cluster">
              <a className="currency-chip" href="#top" dir="auto" aria-label={`${copy.currencyAria}: ${selectedCurrency.names[locale]} (${selectedCurrency.code})`} title={selectedCurrency.names[locale]}>{selectedCurrency.symbol} {selectedCurrency.code}</a>
              <div className="language-switcher" aria-label={copy.languageAria} onMouseEnter={() => cancelDropdownClose("language")} onMouseLeave={() => scheduleDropdownClose("language", () => setLanguageOpen(false))} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { cancelDropdownClose("language"); setLanguageOpen(false); } }}>
                <button className="language-trigger" type="button" aria-haspopup="menu" aria-expanded={languageOpen} onClick={() => { setLanguageOpen((open) => !open); setCountryOpen(false); setCityOpen(false); setThemeOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setLanguageOpen(false); }}>
                  <span className="language-symbol" aria-hidden="true">{selectedLanguage.symbol}</span><span>{selectedLanguage.short}</span><span className="language-chevron" aria-hidden="true">⌄</span>
                </button>
                <div className="language-dropdown" role="menu" hidden={!languageOpen}>
                  {languageOptions.map((option) => <button key={option.id} type="button" role="menuitemradio" className={locale === option.id ? "language-option active" : "language-option"} aria-label={option.label} aria-checked={locale === option.id} onClick={() => { setLocale(option.id); setLanguageOpen(false); }}><span className="language-symbol" aria-hidden="true">{option.symbol}</span><span>{option.label}</span><small>{option.short}</small></button>)}
                </div>
              </div>
              <div className="theme-switcher" aria-label={copy.themeAria} onMouseEnter={() => cancelDropdownClose("theme")} onMouseLeave={() => scheduleDropdownClose("theme", () => setThemeOpen(false))} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { cancelDropdownClose("theme"); setThemeOpen(false); } }}>
                <button className="theme-trigger" type="button" aria-haspopup="menu" aria-expanded={themeOpen} title={`${copy.themeAria}: ${copy[selectedTheme.labelKey]}`} onClick={() => { setThemeOpen((open) => !open); setCountryOpen(false); setCityOpen(false); setLanguageOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setThemeOpen(false); }}>
                  <span className="theme-symbol" aria-hidden="true">{selectedTheme.symbol}</span><span>{copy[selectedTheme.labelKey]}</span><span className="theme-chevron" aria-hidden="true">⌄</span>
                </button>
                <div className="theme-dropdown" role="menu" hidden={!themeOpen}>
                  {themeOptions.map((option) => <button key={option.id} type="button" role="menuitemradio" className={themeMode === option.id ? "theme-option active" : "theme-option"} aria-checked={themeMode === option.id} onClick={() => { setThemeMode(option.id); setThemeOpen(false); }}><span className="theme-symbol" aria-hidden="true">{option.symbol}</span><span>{copy[option.labelKey]}</span></button>)}
                </div>
              </div>
              </div>
              <a className="office-tool" href="#top" aria-label={copy.officeAppAria} title={copy.officeAppAria}>▣</a>
            </div>
            <div className="header-actions"><a className="admin-chip" href={canOpenAdsAdmin ? "/admin/ads" : canOpenSponsorAdmin ? "/admin/sponsors" : "#account"}><span className="admin-label">{roleLabels[locale][viewer.role] ?? "Admin"}</span><span aria-hidden="true">♙</span></a><a className="header-login" href="#account">{copy.login}</a><a className="header-register" href="#account">{copy.register}</a></div>
          </div>
        </header>

        <div className="news-ticker" role="status" aria-label={copy.tickerAria}>
          <div className="container ticker-inner"><span className="ticker-label">{copy.tickerLabel}</span><span className="ticker-pulse" aria-hidden="true" />
            <div className="ticker-track">{copy.ticker.map((item, index) => <span key={`${locale}-ticker-${index}`}>{index > 0 && " • "}{item}</span>)}</div>
            <button type="button" aria-label={copy.tickerPause}>Ⅱ</button>
          </div>
        </div>
        </div>

        <section
          ref={heroSectionRef}
          className={`hero-ad hero-ad-slider${heroPaused || heroInteracting ? " is-paused" : ""}`}
          aria-label={copy.heroAria}
          aria-roledescription={locale === "ar" ? "عرض شرائح إعلاني" : locale === "tr" ? "Reklam slayt gösterisi" : "Advertisement carousel"}
          tabIndex={0}
          onMouseEnter={() => setHeroInteracting(true)}
          onMouseLeave={() => setHeroInteracting(false)}
          onFocusCapture={() => setHeroInteracting(true)}
          onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeroInteracting(false); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") selectHeroSlide(activeHeroIndex - 1);
            if (event.key === "ArrowRight") selectHeroSlide(activeHeroIndex + 1);
          }}
          onTouchStart={(event) => { heroTouchStartX.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            if (heroTouchStartX.current === null) return;
            const distance = (event.changedTouches[0]?.clientX ?? heroTouchStartX.current) - heroTouchStartX.current;
            if (Math.abs(distance) > 48) selectHeroSlide(activeHeroIndex + (distance > 0 ? -1 : 1));
            heroTouchStartX.current = null;
          }}
        >
          <div className="hero-ad-media" key={`${activeHeroSlide.id}-${activeHeroSlide.mediaUrl}`}>
            {activeHeroSlide.mediaType === "video"
              ? <video className="hero-ad-asset" src={activeHeroSlide.mediaUrl} poster={activeHeroSlide.posterUrl} autoPlay muted loop playsInline preload="metadata" onPlay={() => { const key = `${activeHeroSlide.campaignId}:video_start`; if (activeHeroSlide.campaignId && !recordedAdEvents.current.has(key)) { recordedAdEvents.current.add(key); trackAdEvent("video_start"); } }} onTimeUpdate={trackVideoProgress} onEnded={() => trackAdEvent("video_complete")} />
              : <img className="hero-ad-asset" src={activeHeroSlide.mediaUrl} alt="" decoding="async" fetchPriority={activeHeroIndex === 0 ? "high" : "auto"} />}
          </div>
          <div className="container hero-ad-inner">
            <div className="hero-ad-copy">
              <p>{activeHeroSlide.eyebrow}</p>
              <h2>{activeHeroSlide.title}<br /><strong>{activeHeroSlide.accent}</strong></h2>
              <span>{activeHeroSlide.description}</span>
              <a href={activeHeroSlide.href} target={activeHeroSlide.href.startsWith("http") ? "_blank" : undefined} rel={activeHeroSlide.sponsored ? "sponsored noopener" : undefined} onClick={() => { if (activeHeroSlide.sponsored) trackSponsorEvent("header", "click"); if (activeHeroSlide.campaignId) trackAdEvent("click"); }}>{activeHeroSlide.cta} <b>{copy.arrow}</b></a>
            </div>
            <div className="hero-ad-controls" aria-label={locale === "ar" ? "التحكم في الإعلانات" : locale === "tr" ? "Reklam kontrolleri" : "Advertisement controls"}>
              <button className="hero-arrow" type="button" onClick={() => selectHeroSlide(activeHeroIndex - 1)} aria-label={locale === "ar" ? "الإعلان السابق" : locale === "tr" ? "Önceki reklam" : "Previous advertisement"}>‹</button>
              <div className="hero-ad-dots">
                {heroSlides.map((slide, index) => <button key={slide.id} type="button" className={index === activeHeroIndex % heroSlides.length ? "active" : ""} aria-label={`${locale === "ar" ? "عرض الإعلان" : locale === "tr" ? "Reklamı göster" : "Show advertisement"} ${index + 1}`} aria-current={index === activeHeroIndex % heroSlides.length ? "true" : undefined} onClick={() => selectHeroSlide(index)}><span /></button>)}
              </div>
              <button className="hero-pause" type="button" onClick={() => setHeroPaused((paused) => !paused)} aria-label={heroPaused ? locale === "ar" ? "تشغيل الإعلانات تلقائيًا" : locale === "tr" ? "Otomatik oynatmayı başlat" : "Start advertisement autoplay" : locale === "ar" ? "إيقاف الإعلانات مؤقتًا" : locale === "tr" ? "Reklamları duraklat" : "Pause advertisements"}>{heroPaused ? "▶" : "Ⅱ"}</button>
              <button className="hero-arrow" type="button" onClick={() => selectHeroSlide(activeHeroIndex + 1)} aria-label={locale === "ar" ? "الإعلان التالي" : locale === "tr" ? "Sonraki reklam" : "Next advertisement"}>›</button>
            </div>
          </div>
        </section>

        {sponsorPlacements.includes("header") && <section className="country-sponsor container" id="sponsors" aria-label={copy.sponsorAria} data-sponsor-country={country}>
          <div className={`sponsor-ribbon sponsor-tone-${selectedSponsorTone} sponsor-ribbon-image`}>
            <div className="sponsor-ribbon-visual" aria-hidden="true">{isVideoAsset(sponsorBannerUrl) ? <video className="sponsor-visual-image" src={sponsorBannerUrl} autoPlay muted loop playsInline preload="metadata" /> : <img className="sponsor-visual-image" src={sponsorBannerUrl} alt="" decoding="async" />}</div>
            <div className="sponsor-copy"><p>{copy.sponsorLabel}</p><h2>{copy.sponsorOfficial} {selectedCountry.names[locale]}</h2><span>{copy.sponsorDescription}</span><a className="sponsor-cta" href={sponsorTargetHref} target={activeSponsor?.websiteUrl ? "_blank" : undefined} rel={activeSponsor?.websiteUrl ? "sponsored noopener" : undefined} onClick={() => trackSponsorEvent("header", "click")}>{sponsorActionLabel} <b>{copy.arrow}</b></a></div>
            <div className="sponsor-brand-placeholder"><SponsorIdentity logoUrl={sponsorLogoUrl} name={sponsorName} countryCode={selectedCountry.id} /><div className="sponsor-brand-details"><small>{sponsorLogoUrl ? copy.sponsorLogo : locale === "ar" ? "هوية الراعي" : locale === "tr" ? "Sponsor kimliği" : "Sponsor identity"}</small><strong>{sponsorName}</strong></div><span className="sponsor-country-chip"><CountryFlag country={selectedCountry} />{selectedCountry.names[locale]}</span></div>
          </div>
        </section>}

        <section className="welcome-band" id="about">
          <div className="container welcome-grid">
            <div className="welcome-copy"><p className="section-kicker">{copy.welcomeKicker}</p><h1>{copy.welcomeTitle}<br /><em>{copy.welcomeAccent}</em></h1><p>{copy.welcomeDescription}</p><div className="welcome-actions"><a className="button-primary" href="#properties">{copy.browse} <b>{copy.arrow}</b></a><a className="button-quiet" href="#account">{copy.join}</a></div></div>
            <div className="welcome-visual" aria-label={copy.visualAria}><div className="visual-ring" /><div className="visual-card"><span>{copy.visualTag}</span><strong>OM</strong><small>{copy.visualSmall}</small></div></div>
          </div>
        </section>

        <section className="content-section container" id="properties" aria-labelledby="property-title">
          <div className="section-title-row"><div><p className="section-kicker">{copy.propertiesKicker}</p><h2 id="property-title">{copy.propertiesTitle}<br />{copy.propertiesAccent}</h2></div><a className="section-link" href="#account">{copy.viewAll} <b>{copy.arrow}</b></a></div>
          <div className="property-grid reference-cards">
            {copy.propertyCards.map((card, index) => <article className={index === 0 ? "reference-card feature-card" : "reference-card"} key={`${locale}-card-${index}`}><div className={`card-image card-${index === 0 ? "house" : index === 1 ? "map" : "coast"}`}><span>{card.tag}</span></div><div className="card-body"><p>{card.meta}</p><h3>{card.title}</h3>{card.link && <a href="#account">{card.link} <b>{copy.arrow}</b></a>}</div></article>)}
          </div>
          {sponsorPlacements.includes("content") && <aside className={`sponsor-inline sponsor-tone-${selectedSponsorTone}`} aria-label={copy.sponsorAria}><span className="sponsor-inline-label">{copy.sponsorFooter}</span><SponsorIdentity logoUrl={sponsorLogoUrl} name={sponsorName} countryCode={selectedCountry.id} compact /><div><strong>{copy.sponsorPage} {selectedCountry.names[locale]}</strong><span>{sponsorName}</span></div><a href={sponsorTargetHref} target={activeSponsor?.websiteUrl ? "_blank" : undefined} rel={activeSponsor?.websiteUrl ? "sponsored noopener" : undefined} onClick={() => trackSponsorEvent("content", "click")}>{sponsorActionLabel} <b>{copy.arrow}</b></a></aside>}
        </section>

        <section className="services-band" id="services" aria-labelledby="services-title">
          <div className="container"><div className="section-title-row"><div><p className="section-kicker">{copy.servicesKicker}</p><h2 id="services-title">{copy.servicesTitle}<br />{copy.servicesAccent}</h2></div><span className="muted-note">{copy.servicesNote.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</span></div>
            <div className="service-grid">{copy.services.map((service, index) => <article id={`module-${index + 1}`} key={`${locale}-service-${index}`}><span className="service-number">{String(index + 1).padStart(2, "0")}</span><div><h3>{service.title}</h3><p>{service.description}</p></div><b>↗</b></article>)}</div>
          </div>
        </section>

        <section className="office-band" id="offices"><div className="container office-grid"><div className="office-copy"><p className="section-kicker">{copy.officeKicker}</p><h2>AkarPromax<br />Office</h2><p>{copy.officeDescription}</p><a className="button-primary" href="#account">{copy.officeCta} <b>{copy.arrow}</b></a></div><div className="office-panel"><span className="panel-orbit orbit-one" /><span className="panel-orbit orbit-two" /><div className="office-panel-label">{copy.officeSync}</div><div className="office-panel-value">24<span>/</span>7</div><div className="office-panel-foot">{copy.officeStats.map((item) => <span key={item}>{item}</span>)}</div></div></div></section>

        <section className="account-band" id="account"><div className="container account-inner"><div><p className="section-kicker">{copy.accountKicker}</p><h2>{copy.accountTitle}<br />{copy.accountAccent}</h2></div><div className="account-copy"><p>{copy.accountDescription}</p><a className="button-primary" href="mailto:hello@akarpromax.om?subject=Join%20request">{copy.accountCta} <b>{copy.arrow}</b></a></div></div></section>

        <footer className="reference-footer"><div className="container footer-grid"><div className="footer-about"><Brand copy={copy} /><p>{copy.footerDescription}</p><div className="socials"><a href="#top" aria-label="Facebook">f</a><a href="#top" aria-label="X">𝕏</a><a href="#top" aria-label="Instagram">◎</a><a href="#top" aria-label="LinkedIn">in</a></div></div><div><h3>{copy.quickTitle}</h3>{copy.quickLinks.map((item) => <a href="#top" key={`${locale}-quick-${item}`}>{item}</a>)}</div><div><h3>{copy.usefulTitle}</h3>{copy.usefulLinks.map((item) => <a href="#top" key={`${locale}-useful-${item}`}>{item}</a>)}</div><div><h3>{copy.contactTitle}</h3><a href="#top">{copy.contactLocation}　⌖</a><a href="mailto:info@akarpromax.om">{copy.contactEmail}　✉</a><a href="#top">{copy.contactTeam}</a></div></div>{sponsorPlacements.includes("footer") && <div className={`container footer-sponsor sponsor-tone-${selectedSponsorTone}`}><SponsorIdentity logoUrl={sponsorLogoUrl} name={sponsorName} countryCode={selectedCountry.id} compact /><div><small>{copy.sponsorFooter}</small><strong>{sponsorName} — {selectedCountry.names[locale]}</strong></div><span className="sponsor-country-chip"><CountryFlag country={selectedCountry} />{selectedCountry.names[locale]}</span><a href={sponsorTargetHref} target={activeSponsor?.websiteUrl ? "_blank" : undefined} rel={activeSponsor?.websiteUrl ? "sponsored noopener" : undefined} onClick={() => trackSponsorEvent("footer", "click")}>{sponsorActionLabel}</a></div>}<div className="container footer-bottom"><span>{copy.footerRights}</span><span>{copy.footerTagline}</span><div className="payments"><span>Visa</span><span>Mastercard</span></div></div></footer>
        <a className="floating-chat" href="mailto:hello@akarpromax.om" aria-label={copy.chatAria}>⌁</a>
      </div>
    </main>
  );
}
