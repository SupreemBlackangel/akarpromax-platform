"use client";

import { useEffect, useState } from "react";

type Locale = "ar" | "en" | "tr";
type CountryId = string;

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

function AdSlot({ copy, tone = "light" }: { copy: Translation; tone?: "light" | "blue" }) {
  return <div className={`ad-slot ad-${tone}`} aria-label={copy.adDescription}><span>{copy.adLabel}</span><small>{copy.adDescription}</small></div>;
}

function CountryFlag({ country }: { country: CountryOption }) {
  return <span className="country-flag" aria-hidden="true"><img src={`https://flagcdn.com/24x18/${country.id}.png`} alt="" decoding="async" onError={(event) => { event.currentTarget.parentElement?.classList.add("emoji-fallback"); }} /><span className="country-flag-emoji">{country.flag}</span></span>;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [country, setCountry] = useState<CountryId>("om");
  const [countryOpen, setCountryOpen] = useState(false);
  const [city, setCity] = useState("om-muscat");
  const [cityOpen, setCityOpen] = useState(false);
  const copy = translations[locale];
  const direction = locale === "ar" ? "rtl" : "ltr";
  const selectedLanguage = languageOptions.find((option) => option.id === locale) ?? languageOptions[0];
  const selectedCountry = countryOptions.find((option) => option.id === country) ?? countryOptions.find((option) => option.id === "om")!;
  const selectedCity = cityOptions.find((option) => option.id === city && option.countryId === country) ?? citiesForCountry(country)[0] ?? cityOptions[0];

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    document.title = copy.metaTitle;
  }, [copy.metaTitle, direction, locale]);

  useEffect(() => {
    const detectedCountry = detectCountry();
    setCountry(detectedCountry);
    const detectedCity = detectCity(detectedCountry);
    setCity(detectedCity);
  }, []);

  useEffect(() => {
    const availableCities = citiesForCountry(country);
    if (!availableCities.some((option) => option.id === city)) {
      const nextCity = detectCity(country);
      setCity(nextCity);
      if (nextCity) window.localStorage.setItem("akarpromax-city", nextCity);
    }
  }, [country, city]);

  return (
    <main className="reference-app" id="top" dir={direction} data-locale={locale}>
      <aside className="right-sidebar" aria-label={copy.sidebarAria}>
        <div className="sidebar-head"><Brand copy={copy} /><button type="button" aria-label={copy.closeMenu}>×</button></div>
        <div className="sidebar-scroll">
          {copy.sidebar.map(([icon, label], index) => (
            <a className={index === 0 ? "sidebar-link active" : "sidebar-link"} href={index === 0 ? "#top" : `#module-${index}`} key={`${locale}-${index}-${label}`}>
              <span className="sidebar-icon" aria-hidden="true">{icon}</span><span>{label}</span>
            </a>
          ))}
        </div>
        <div className="sidebar-foot">{copy.brandTitle} © 2026</div>
      </aside>

      <div className="site-canvas">
        <header className="reference-header">
          <div className="container header-inner">
            <button className="menu-trigger" type="button" aria-label={copy.showMenu}>☰</button>
            <Brand copy={copy} />
            <div className="header-tools" aria-label={copy.toolsAria}>
              <div className="country-switcher" aria-label={copy.countryAria}>
                <button className="country-trigger" type="button" aria-haspopup="menu" aria-expanded={countryOpen} onClick={() => setCountryOpen((open) => !open)} onKeyDown={(event) => { if (event.key === "Escape") setCountryOpen(false); }}>
                  <CountryFlag country={selectedCountry} /><span>{selectedCountry.names[locale]}</span><span className="country-chevron" aria-hidden="true">⌄</span>
                </button>
                <div className="country-dropdown" role="menu" hidden={!countryOpen}>
                  {countryOptions.map((option) => <button key={option.id} type="button" role="menuitem" className={country === option.id ? "country-option active" : "country-option"} aria-label={option.names[locale]} aria-pressed={country === option.id} onClick={() => { const nextCity = detectCity(option.id); setCountry(option.id); setCity(nextCity); setCountryOpen(false); window.localStorage.setItem("akarpromax-country", option.id); window.localStorage.setItem("akarpromax-city", nextCity); }}><CountryFlag country={option} /><span>{option.names[locale]}</span>{option.id === "om" && <small>{copy.country}</small>}</button>)}
                </div>
              </div>
              <div className="city-switcher" aria-label={copy.cityAria}>
                <button className="city-trigger" type="button" aria-haspopup="menu" aria-expanded={cityOpen} onClick={() => setCityOpen((open) => !open)} onKeyDown={(event) => { if (event.key === "Escape") setCityOpen(false); }}>
                  <span className="city-pin" aria-hidden="true">⌖</span><span>{selectedCity.names[locale]}</span><span className="city-chevron" aria-hidden="true">⌄</span>
                </button>
                <div className="city-dropdown" role="menu" hidden={!cityOpen}>
                  {citiesForCountry(country).map((option) => <button key={option.id} type="button" role="menuitem" className={city === option.id ? "city-option active" : "city-option"} aria-label={option.names[locale]} aria-pressed={city === option.id} onClick={() => { setCity(option.id); setCityOpen(false); window.localStorage.setItem("akarpromax-city", option.id); }}><span className="city-pin" aria-hidden="true">⌖</span><span>{option.names[locale]}</span></button>)}
                </div>
              </div>
              <a href="#top" aria-label={copy.currencyAria}>{copy.currency}</a>
              <div className="language-switcher" aria-label={copy.languageAria}>
                <button className="language-trigger" type="button" aria-haspopup="menu" aria-expanded={languageOpen} onClick={() => setLanguageOpen((open) => !open)} onKeyDown={(event) => { if (event.key === "Escape") setLanguageOpen(false); }}>
                  <span className="language-symbol" aria-hidden="true">{selectedLanguage.symbol}</span><span>{selectedLanguage.short}</span><span className="language-chevron" aria-hidden="true">⌄</span>
                </button>
                <div className="language-dropdown" role="menu" hidden={!languageOpen}>
                  {languageOptions.map((option) => <button key={option.id} type="button" role="menuitem" className={locale === option.id ? "language-option active" : "language-option"} aria-label={option.label} aria-pressed={locale === option.id} onClick={() => { setLocale(option.id); setLanguageOpen(false); }}><span className="language-symbol" aria-hidden="true">{option.symbol}</span><span>{option.label}</span><small>{option.short}</small></button>)}
                </div>
              </div>
              <a href="#top" aria-label={copy.officeAppAria}>▣</a>
              <a className="admin-chip" href="#account">Admin　♙</a>
            </div>
            <div className="header-actions"><a href="#account">{copy.login}</a><a className="header-register" href="#account">{copy.register}</a></div>
          </div>
        </header>

        <div className="news-ticker" role="status" aria-label={copy.tickerAria}>
          <div className="container ticker-inner"><span className="ticker-label">{copy.tickerLabel}</span><span className="ticker-pulse" aria-hidden="true" />
            <div className="ticker-track">{copy.ticker.map((item, index) => <span key={`${locale}-ticker-${index}`}>{index > 0 && " • "}{item}</span>)}</div>
            <button type="button" aria-label={copy.tickerPause}>Ⅱ</button>
          </div>
        </div>

        <section className="hero-ad container" aria-label={copy.heroAria}>
          <div className="hero-ad-copy"><p>{copy.heroEyebrow}</p><h2>{copy.heroTitle}<br /><strong>{copy.heroAccent}</strong></h2><span>{copy.heroSub}</span><a href="#properties">{copy.heroCta} <b>{copy.arrow}</b></a></div>
          <div className="hero-ad-footer"><span>●</span><span>●</span><span className="active">●</span><span>●</span></div>
        </section>

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
        </section>

        <section className="services-band" id="services" aria-labelledby="services-title">
          <div className="container"><div className="section-title-row"><div><p className="section-kicker">{copy.servicesKicker}</p><h2 id="services-title">{copy.servicesTitle}<br />{copy.servicesAccent}</h2></div><span className="muted-note">{copy.servicesNote.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</span></div>
            <div className="service-grid">{copy.services.map((service, index) => <article id={`module-${index + 1}`} key={`${locale}-service-${index}`}><span className="service-number">{String(index + 1).padStart(2, "0")}</span><div><h3>{service.title}</h3><p>{service.description}</p></div><b>↗</b></article>)}</div>
          </div>
        </section>

        <section className="office-band" id="offices"><div className="container office-grid"><div className="office-copy"><p className="section-kicker">{copy.officeKicker}</p><h2>AkarPromax<br />Office</h2><p>{copy.officeDescription}</p><a className="button-primary" href="#account">{copy.officeCta} <b>{copy.arrow}</b></a></div><div className="office-panel"><span className="panel-orbit orbit-one" /><span className="panel-orbit orbit-two" /><div className="office-panel-label">{copy.officeSync}</div><div className="office-panel-value">24<span>/</span>7</div><div className="office-panel-foot">{copy.officeStats.map((item) => <span key={item}>{item}</span>)}</div></div></div></section>

        <section className="bottom-ads container" aria-label={copy.adDescription}><AdSlot copy={copy} tone="blue" /><AdSlot copy={copy} tone="blue" /></section>

        <section className="account-band" id="account"><div className="container account-inner"><div><p className="section-kicker">{copy.accountKicker}</p><h2>{copy.accountTitle}<br />{copy.accountAccent}</h2></div><div className="account-copy"><p>{copy.accountDescription}</p><a className="button-primary" href="mailto:hello@akarpromax.om?subject=Join%20request">{copy.accountCta} <b>{copy.arrow}</b></a></div></div></section>

        <footer className="reference-footer"><div className="container footer-grid"><div className="footer-about"><Brand copy={copy} /><p>{copy.footerDescription}</p><div className="socials"><a href="#top" aria-label="Facebook">f</a><a href="#top" aria-label="X">𝕏</a><a href="#top" aria-label="Instagram">◎</a><a href="#top" aria-label="LinkedIn">in</a></div></div><div><h3>{copy.quickTitle}</h3>{copy.quickLinks.map((item) => <a href="#top" key={`${locale}-quick-${item}`}>{item}</a>)}</div><div><h3>{copy.usefulTitle}</h3>{copy.usefulLinks.map((item) => <a href="#top" key={`${locale}-useful-${item}`}>{item}</a>)}</div><div><h3>{copy.contactTitle}</h3><a href="#top">{copy.contactLocation}　⌖</a><a href="mailto:info@akarpromax.om">{copy.contactEmail}　✉</a><a href="#top">{copy.contactTeam}</a></div></div><div className="container footer-bottom"><span>{copy.footerRights}</span><span>{copy.footerTagline}</span><div className="payments"><span>Visa</span><span>Mastercard</span></div></div></footer>
        <a className="floating-chat" href="mailto:hello@akarpromax.om" aria-label={copy.chatAria}>⌁</a>
      </div>
    </main>
  );
}
