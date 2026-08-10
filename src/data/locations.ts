import type { CityOption, CountryId, CountryOption, CurrencyOption } from "@/src/types/site";

export const countryOptions: CountryOption[] = [
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

export const currenciesByCountry: Record<string, CurrencyOption> = {
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

export function isVideoAsset(url: string) {
  return /\.(?:mp4|webm|ogg)(?:[?#].*)?$/i.test(url);
}

export const cityOptions: CityOption[] = [
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

export function citiesForCountry(countryId: CountryId) {
  return cityOptions.filter((city) => city.countryId === countryId);
}

export function detectCity(countryId: CountryId): string {
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

export function detectCityByName(countryId: CountryId, cityName?: string): string {
  if (!cityName) return detectCity(countryId);
  const normalized = cityName.trim().toLowerCase();
  const availableCities = citiesForCountry(countryId);
  const match = availableCities.find((city) =>
    Object.values(city.names).some((name) => name.trim().toLowerCase() === normalized),
  );
  return match?.id ?? detectCity(countryId);
}

export function detectCountry(): CountryId {
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

export function selectedCountryOf(country: CountryId): CountryOption {
  return countryOptions.find((option) => option.id === country) ?? countryOptions.find((option) => option.id === "om")!;
}

export function selectedCityOf(countryId: CountryId, city: string): CityOption {
  return cityOptions.find((option) => option.id === city && option.countryId === countryId) ?? citiesForCountry(countryId)[0] ?? cityOptions[0];
}
