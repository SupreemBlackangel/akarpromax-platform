/**
 * The location catalogue for the countries the platform already lists.
 *
 * Migration 0007 says the schema is shared but "environments own their location
 * catalogue", and only Saudi Arabia was ever entered: 13 governorates, 11
 * cities, 6 districts. The other 22 countries had zero. That is not a cosmetic
 * gap -- an advertiser could select Egypt as a country but could not target
 * Cairo, and could not target Manbij at all, because neither row existed for a
 * dropdown to offer.
 *
 * Codes here are country-prefixed (`SY-MANBIJ`) for one reason: they must be
 * globally unambiguous. `isGeoMatch` compares a bare lowercased string with no
 * country in scope, so two cities sharing a code would target each other --
 * Tripoli is in both Lebanon and Libya, and Latakia's spelling collides with
 * nothing but Hama and Homs sit one letter apart in transliteration. The prefix
 * is not the `sa-riyadh` mistake: that value was wrong because the REGISTRY did
 * not contain it. Here the registry defines it, so the visitor context carries
 * the same string and the two agree.
 *
 * Saudi Arabia is deliberately left as it is. Its codes are bare (`JEDDAH`),
 * live campaigns already target them, and rewriting them would break exactly
 * what this work is meant to protect.
 */

/** @typedef {{ code: string, ar: string, en: string, cities?: City[] }} Governorate */
/** @typedef {{ code: string, ar: string, en: string, districts?: District[] }} City */
/** @typedef {{ code: string, ar: string, en: string }} District */

/** @type {Record<string, Governorate[]>} */
export const CATALOGUE = {
  EG: [
    { code: "EG-C", ar: "القاهرة", en: "Cairo", cities: [
      { code: "EG-CAIRO", ar: "القاهرة", en: "Cairo" },
      { code: "EG-NEWCAIRO", ar: "القاهرة الجديدة", en: "New Cairo" },
      { code: "EG-NASRCITY", ar: "مدينة نصر", en: "Nasr City" },
      { code: "EG-MAADI", ar: "المعادي", en: "Maadi" },
      { code: "EG-HELIOPOLIS", ar: "مصر الجديدة", en: "Heliopolis" },
    ] },
    { code: "EG-GZ", ar: "الجيزة", en: "Giza", cities: [
      { code: "EG-GIZA", ar: "الجيزة", en: "Giza" },
      { code: "EG-6OCTOBER", ar: "مدينة 6 أكتوبر", en: "6th of October City" },
      { code: "EG-SHEIKHZAYED", ar: "الشيخ زايد", en: "Sheikh Zayed" },
    ] },
    { code: "EG-ALX", ar: "الإسكندرية", en: "Alexandria", cities: [
      { code: "EG-ALEXANDRIA", ar: "الإسكندرية", en: "Alexandria" },
      { code: "EG-BORGELARAB", ar: "برج العرب", en: "Borg El Arab" },
    ] },
    { code: "EG-QLY", ar: "القليوبية", en: "Qalyubia", cities: [
      { code: "EG-BANHA", ar: "بنها", en: "Banha" },
      { code: "EG-SHUBRA", ar: "شبرا الخيمة", en: "Shubra El Kheima" },
    ] },
    { code: "EG-SHR", ar: "الشرقية", en: "Sharqia", cities: [
      { code: "EG-ZAGAZIG", ar: "الزقازيق", en: "Zagazig" },
      { code: "EG-10RAMADAN", ar: "العاشر من رمضان", en: "10th of Ramadan" },
    ] },
    { code: "EG-DK", ar: "الدقهلية", en: "Dakahlia", cities: [
      { code: "EG-MANSOURA", ar: "المنصورة", en: "Mansoura" },
      { code: "EG-MITGHAMR", ar: "ميت غمر", en: "Mit Ghamr" },
    ] },
    { code: "EG-BH", ar: "البحيرة", en: "Beheira", cities: [
      { code: "EG-DAMANHOUR", ar: "دمنهور", en: "Damanhour" },
    ] },
    { code: "EG-GH", ar: "الغربية", en: "Gharbia", cities: [
      { code: "EG-TANTA", ar: "طنطا", en: "Tanta" },
      { code: "EG-MAHALLA", ar: "المحلة الكبرى", en: "El Mahalla El Kubra" },
    ] },
    { code: "EG-MNF", ar: "المنوفية", en: "Monufia", cities: [
      { code: "EG-SHIBIN", ar: "شبين الكوم", en: "Shibin El Kom" },
    ] },
    { code: "EG-KFS", ar: "كفر الشيخ", en: "Kafr El Sheikh", cities: [
      { code: "EG-KAFRELSHEIKH", ar: "كفر الشيخ", en: "Kafr El Sheikh" },
    ] },
    { code: "EG-DT", ar: "دمياط", en: "Damietta", cities: [
      { code: "EG-DAMIETTA", ar: "دمياط", en: "Damietta" },
      { code: "EG-NEWDAMIETTA", ar: "دمياط الجديدة", en: "New Damietta" },
    ] },
    { code: "EG-PTS", ar: "بورسعيد", en: "Port Said", cities: [
      { code: "EG-PORTSAID", ar: "بورسعيد", en: "Port Said" },
    ] },
    { code: "EG-IS", ar: "الإسماعيلية", en: "Ismailia", cities: [
      { code: "EG-ISMAILIA", ar: "الإسماعيلية", en: "Ismailia" },
    ] },
    { code: "EG-SUZ", ar: "السويس", en: "Suez", cities: [
      { code: "EG-SUEZ", ar: "السويس", en: "Suez" },
      { code: "EG-AINSOKHNA", ar: "العين السخنة", en: "Ain Sokhna" },
    ] },
    { code: "EG-BNS", ar: "بني سويف", en: "Beni Suef", cities: [
      { code: "EG-BENISUEF", ar: "بني سويف", en: "Beni Suef" },
    ] },
    { code: "EG-FYM", ar: "الفيوم", en: "Faiyum", cities: [
      { code: "EG-FAIYUM", ar: "الفيوم", en: "Faiyum" },
    ] },
    { code: "EG-MN", ar: "المنيا", en: "Minya", cities: [
      { code: "EG-MINYA", ar: "المنيا", en: "Minya" },
    ] },
    { code: "EG-AST", ar: "أسيوط", en: "Asyut", cities: [
      { code: "EG-ASYUT", ar: "أسيوط", en: "Asyut" },
    ] },
    { code: "EG-SHG", ar: "سوهاج", en: "Sohag", cities: [
      { code: "EG-SOHAG", ar: "سوهاج", en: "Sohag" },
    ] },
    { code: "EG-KN", ar: "قنا", en: "Qena", cities: [
      { code: "EG-QENA", ar: "قنا", en: "Qena" },
    ] },
    { code: "EG-LX", ar: "الأقصر", en: "Luxor", cities: [
      { code: "EG-LUXOR", ar: "الأقصر", en: "Luxor" },
    ] },
    { code: "EG-ASN", ar: "أسوان", en: "Aswan", cities: [
      { code: "EG-ASWAN", ar: "أسوان", en: "Aswan" },
    ] },
    { code: "EG-BA", ar: "البحر الأحمر", en: "Red Sea", cities: [
      { code: "EG-HURGHADA", ar: "الغردقة", en: "Hurghada" },
      { code: "EG-MARSAALAM", ar: "مرسى علم", en: "Marsa Alam" },
    ] },
    { code: "EG-MT", ar: "مطروح", en: "Matrouh", cities: [
      { code: "EG-MARSAMATROUH", ar: "مرسى مطروح", en: "Marsa Matrouh" },
      { code: "EG-ALAMEIN", ar: "العلمين", en: "El Alamein" },
    ] },
    { code: "EG-WAD", ar: "الوادي الجديد", en: "New Valley", cities: [
      { code: "EG-KHARGA", ar: "الخارجة", en: "Kharga" },
    ] },
    { code: "EG-SIN", ar: "شمال سيناء", en: "North Sinai", cities: [
      { code: "EG-ARISH", ar: "العريش", en: "Arish" },
    ] },
    { code: "EG-JS", ar: "جنوب سيناء", en: "South Sinai", cities: [
      { code: "EG-SHARMELSHEIKH", ar: "شرم الشيخ", en: "Sharm El Sheikh" },
      { code: "EG-DAHAB", ar: "دهب", en: "Dahab" },
    ] },
  ],

  SY: [
    { code: "SY-DI", ar: "دمشق", en: "Damascus", cities: [
      { code: "SY-DAMASCUS", ar: "دمشق", en: "Damascus" },
    ] },
    { code: "SY-RD", ar: "ريف دمشق", en: "Rif Dimashq", cities: [
      { code: "SY-DOUMA", ar: "دوما", en: "Douma" },
      { code: "SY-ZABADANI", ar: "الزبداني", en: "Zabadani" },
      { code: "SY-QUDSAYA", ar: "قدسيا", en: "Qudsaya" },
    ] },
    { code: "SY-HL", ar: "حلب", en: "Aleppo", cities: [
      { code: "SY-ALEPPO", ar: "حلب", en: "Aleppo" },
      { code: "SY-MANBIJ", ar: "منبج", en: "Manbij" },
      { code: "SY-ALBAB", ar: "الباب", en: "Al-Bab" },
      { code: "SY-AZAZ", ar: "أعزاز", en: "Azaz" },
      { code: "SY-AFRIN", ar: "عفرين", en: "Afrin" },
      { code: "SY-JARABLUS", ar: "جرابلس", en: "Jarablus" },
      { code: "SY-SAFIRA", ar: "السفيرة", en: "As-Safira" },
    ] },
    { code: "SY-HM", ar: "حماة", en: "Hama", cities: [
      { code: "SY-HAMA", ar: "حماة", en: "Hama" },
      { code: "SY-SALAMIYAH", ar: "سلمية", en: "Salamiyah" },
    ] },
    { code: "SY-HI", ar: "حمص", en: "Homs", cities: [
      { code: "SY-HOMS", ar: "حمص", en: "Homs" },
      { code: "SY-PALMYRA", ar: "تدمر", en: "Palmyra" },
    ] },
    { code: "SY-LA", ar: "اللاذقية", en: "Latakia", cities: [
      { code: "SY-LATAKIA", ar: "اللاذقية", en: "Latakia" },
      { code: "SY-JABLEH", ar: "جبلة", en: "Jableh" },
    ] },
    { code: "SY-TA", ar: "طرطوس", en: "Tartus", cities: [
      { code: "SY-TARTUS", ar: "طرطوس", en: "Tartus" },
      { code: "SY-BANIYAS", ar: "بانياس", en: "Baniyas" },
    ] },
    { code: "SY-ID", ar: "إدلب", en: "Idlib", cities: [
      { code: "SY-IDLIB", ar: "إدلب", en: "Idlib" },
      { code: "SY-MAARRAT", ar: "معرة النعمان", en: "Maarrat al-Numan" },
    ] },
    { code: "SY-RA", ar: "الرقة", en: "Raqqa", cities: [
      { code: "SY-RAQQA", ar: "الرقة", en: "Raqqa" },
      { code: "SY-TABQA", ar: "الطبقة", en: "Tabqa" },
    ] },
    { code: "SY-DY", ar: "دير الزور", en: "Deir ez-Zor", cities: [
      { code: "SY-DEIREZZOR", ar: "دير الزور", en: "Deir ez-Zor" },
      { code: "SY-MAYADIN", ar: "الميادين", en: "Mayadin" },
    ] },
    { code: "SY-HA", ar: "الحسكة", en: "Al-Hasakah", cities: [
      { code: "SY-HASAKAH", ar: "الحسكة", en: "Al-Hasakah" },
      { code: "SY-QAMISHLI", ar: "القامشلي", en: "Qamishli" },
    ] },
    { code: "SY-DR", ar: "درعا", en: "Daraa", cities: [
      { code: "SY-DARAA", ar: "درعا", en: "Daraa" },
    ] },
    { code: "SY-SU", ar: "السويداء", en: "As-Suwayda", cities: [
      { code: "SY-SUWAYDA", ar: "السويداء", en: "As-Suwayda" },
    ] },
    { code: "SY-QU", ar: "القنيطرة", en: "Quneitra", cities: [
      { code: "SY-QUNEITRA", ar: "القنيطرة", en: "Quneitra" },
    ] },
  ],

  AE: [
    { code: "AE-AZ", ar: "أبوظبي", en: "Abu Dhabi", cities: [
      { code: "AE-ABUDHABI", ar: "أبوظبي", en: "Abu Dhabi" },
      { code: "AE-ALAIN", ar: "العين", en: "Al Ain" },
      { code: "AE-ALDHAFRA", ar: "الظفرة", en: "Al Dhafra" },
    ] },
    { code: "AE-DU", ar: "دبي", en: "Dubai", cities: [
      { code: "AE-DUBAI", ar: "دبي", en: "Dubai" },
      { code: "AE-HATTA", ar: "حتا", en: "Hatta" },
    ] },
    { code: "AE-SH", ar: "الشارقة", en: "Sharjah", cities: [
      { code: "AE-SHARJAH", ar: "الشارقة", en: "Sharjah" },
      { code: "AE-KHORFAKKAN", ar: "خورفكان", en: "Khor Fakkan" },
    ] },
    { code: "AE-AJ", ar: "عجمان", en: "Ajman", cities: [
      { code: "AE-AJMAN", ar: "عجمان", en: "Ajman" },
    ] },
    { code: "AE-UQ", ar: "أم القيوين", en: "Umm Al Quwain", cities: [
      { code: "AE-UMMALQUWAIN", ar: "أم القيوين", en: "Umm Al Quwain" },
    ] },
    { code: "AE-RK", ar: "رأس الخيمة", en: "Ras Al Khaimah", cities: [
      { code: "AE-RASALKHAIMAH", ar: "رأس الخيمة", en: "Ras Al Khaimah" },
    ] },
    { code: "AE-FU", ar: "الفجيرة", en: "Fujairah", cities: [
      { code: "AE-FUJAIRAH", ar: "الفجيرة", en: "Fujairah" },
      { code: "AE-DIBBA", ar: "دبا الفجيرة", en: "Dibba Al-Fujairah" },
    ] },
  ],

  QA: [
    { code: "QA-DA", ar: "الدوحة", en: "Doha", cities: [{ code: "QA-DOHA", ar: "الدوحة", en: "Doha" }] },
    { code: "QA-RA", ar: "الريان", en: "Al Rayyan", cities: [{ code: "QA-ALRAYYAN", ar: "الريان", en: "Al Rayyan" }] },
    { code: "QA-WA", ar: "الوكرة", en: "Al Wakrah", cities: [{ code: "QA-ALWAKRAH", ar: "الوكرة", en: "Al Wakrah" }] },
    { code: "QA-KH", ar: "الخور", en: "Al Khor", cities: [{ code: "QA-ALKHOR", ar: "الخور", en: "Al Khor" }] },
    { code: "QA-US", ar: "أم صلال", en: "Umm Salal", cities: [{ code: "QA-UMMSALAL", ar: "أم صلال", en: "Umm Salal" }] },
    { code: "QA-ZA", ar: "الظعاين", en: "Al Daayen", cities: [{ code: "QA-ALDAAYEN", ar: "الظعاين", en: "Al Daayen" }] },
    { code: "QA-SH", ar: "الشمال", en: "Al Shamal", cities: [{ code: "QA-ALSHAMAL", ar: "الشمال", en: "Al Shamal" }] },
    { code: "QA-SW", ar: "الشيحانية", en: "Al Shahaniya", cities: [{ code: "QA-ALSHAHANIYA", ar: "الشيحانية", en: "Al Shahaniya" }] },
  ],

  KW: [
    { code: "KW-KU", ar: "العاصمة", en: "Al Asimah", cities: [{ code: "KW-KUWAITCITY", ar: "مدينة الكويت", en: "Kuwait City" }] },
    { code: "KW-HA", ar: "حولي", en: "Hawalli", cities: [{ code: "KW-HAWALLI", ar: "حولي", en: "Hawalli" }, { code: "KW-SALMIYA", ar: "السالمية", en: "Salmiya" }] },
    { code: "KW-FA", ar: "الفروانية", en: "Al Farwaniyah", cities: [{ code: "KW-FARWANIYA", ar: "الفروانية", en: "Al Farwaniyah" }] },
    { code: "KW-JA", ar: "الجهراء", en: "Al Jahra", cities: [{ code: "KW-JAHRA", ar: "الجهراء", en: "Al Jahra" }] },
    { code: "KW-AH", ar: "الأحمدي", en: "Al Ahmadi", cities: [{ code: "KW-AHMADI", ar: "الأحمدي", en: "Al Ahmadi" }, { code: "KW-FAHAHEEL", ar: "الفحيحيل", en: "Fahaheel" }] },
    { code: "KW-MU", ar: "مبارك الكبير", en: "Mubarak Al-Kabeer", cities: [{ code: "KW-MUBARAKALKABEER", ar: "مبارك الكبير", en: "Mubarak Al-Kabeer" }] },
  ],

  BH: [
    { code: "BH-CA", ar: "العاصمة", en: "Capital", cities: [{ code: "BH-MANAMA", ar: "المنامة", en: "Manama" }] },
    { code: "BH-MU", ar: "المحرق", en: "Muharraq", cities: [{ code: "BH-MUHARRAQ", ar: "المحرق", en: "Muharraq" }] },
    { code: "BH-NO", ar: "الشمالية", en: "Northern", cities: [{ code: "BH-HAMADTOWN", ar: "مدينة حمد", en: "Hamad Town" }] },
    { code: "BH-SO", ar: "الجنوبية", en: "Southern", cities: [{ code: "BH-RIFFA", ar: "الرفاع", en: "Riffa" }, { code: "BH-ISATOWN", ar: "مدينة عيسى", en: "Isa Town" }] },
  ],

  OM: [
    { code: "OM-MA", ar: "مسقط", en: "Muscat", cities: [
      { code: "OM-MUSCAT", ar: "مسقط", en: "Muscat" },
      { code: "OM-SEEB", ar: "السيب", en: "Seeb" },
      { code: "OM-BAWSHAR", ar: "بوشر", en: "Bawshar" },
      { code: "OM-MUTRAH", ar: "مطرح", en: "Mutrah" },
      { code: "OM-AMERAT", ar: "العامرات", en: "Al Amerat" },
      { code: "OM-QURAYYAT", ar: "قريات", en: "Quriyat" },
    ] },
    { code: "OM-BS", ar: "شمال الباطنة", en: "Al Batinah North", cities: [
      { code: "OM-SOHAR", ar: "صحار", en: "Sohar" },
      { code: "OM-SHINAS", ar: "شناص", en: "Shinas" },
      { code: "OM-SAHAM", ar: "صحم", en: "Saham" },
    ] },
    { code: "OM-BJ", ar: "جنوب الباطنة", en: "Al Batinah South", cities: [
      { code: "OM-RUSTAQ", ar: "الرستاق", en: "Rustaq" },
      { code: "OM-BARKA", ar: "بركاء", en: "Barka" },
    ] },
    { code: "OM-DA", ar: "الداخلية", en: "Ad Dakhiliyah", cities: [
      { code: "OM-NIZWA", ar: "نزوى", en: "Nizwa" },
      { code: "OM-BAHLA", ar: "بهلاء", en: "Bahla" },
      { code: "OM-SAMAIL", ar: "سمائل", en: "Samail" },
    ] },
    { code: "OM-SS", ar: "شمال الشرقية", en: "Ash Sharqiyah North", cities: [
      { code: "OM-IBRA", ar: "إبراء", en: "Ibra" },
    ] },
    { code: "OM-SJ", ar: "جنوب الشرقية", en: "Ash Sharqiyah South", cities: [
      { code: "OM-SUR", ar: "صور", en: "Sur" },
    ] },
    { code: "OM-ZA", ar: "الظاهرة", en: "Ad Dhahirah", cities: [
      { code: "OM-IBRI", ar: "عبري", en: "Ibri" },
    ] },
    { code: "OM-BU", ar: "البريمي", en: "Al Buraimi", cities: [
      { code: "OM-BURAIMI", ar: "البريمي", en: "Al Buraimi" },
    ] },
    { code: "OM-WU", ar: "الوسطى", en: "Al Wusta", cities: [
      { code: "OM-HAIMA", ar: "هيماء", en: "Haima" },
      { code: "OM-DUQM", ar: "الدقم", en: "Duqm" },
    ] },
    { code: "OM-ZU", ar: "ظفار", en: "Dhofar", cities: [
      { code: "OM-SALALAH", ar: "صلالة", en: "Salalah" },
    ] },
    { code: "OM-MU", ar: "مسندم", en: "Musandam", cities: [
      { code: "OM-KHASAB", ar: "خصب", en: "Khasab" },
    ] },
  ],

  IQ: [
    { code: "IQ-BG", ar: "بغداد", en: "Baghdad", cities: [{ code: "IQ-BAGHDAD", ar: "بغداد", en: "Baghdad" }] },
    { code: "IQ-BA", ar: "البصرة", en: "Basra", cities: [{ code: "IQ-BASRA", ar: "البصرة", en: "Basra" }] },
    { code: "IQ-NI", ar: "نينوى", en: "Nineveh", cities: [{ code: "IQ-MOSUL", ar: "الموصل", en: "Mosul" }] },
    { code: "IQ-AR", ar: "أربيل", en: "Erbil", cities: [{ code: "IQ-ERBIL", ar: "أربيل", en: "Erbil" }] },
    { code: "IQ-SU", ar: "السليمانية", en: "Sulaymaniyah", cities: [{ code: "IQ-SULAYMANIYAH", ar: "السليمانية", en: "Sulaymaniyah" }] },
    { code: "IQ-DA", ar: "دهوك", en: "Duhok", cities: [{ code: "IQ-DUHOK", ar: "دهوك", en: "Duhok" }] },
    { code: "IQ-NA", ar: "النجف", en: "Najaf", cities: [{ code: "IQ-NAJAF", ar: "النجف", en: "Najaf" }] },
    { code: "IQ-KA", ar: "كربلاء", en: "Karbala", cities: [{ code: "IQ-KARBALA", ar: "كربلاء", en: "Karbala" }] },
    { code: "IQ-BB", ar: "بابل", en: "Babil", cities: [{ code: "IQ-HILLA", ar: "الحلة", en: "Hilla" }] },
    { code: "IQ-AN", ar: "الأنبار", en: "Anbar", cities: [{ code: "IQ-RAMADI", ar: "الرمادي", en: "Ramadi" }, { code: "IQ-FALLUJA", ar: "الفلوجة", en: "Fallujah" }] },
    { code: "IQ-DI", ar: "ديالى", en: "Diyala", cities: [{ code: "IQ-BAQUBA", ar: "بعقوبة", en: "Baquba" }] },
    { code: "IQ-KI", ar: "كركوك", en: "Kirkuk", cities: [{ code: "IQ-KIRKUK", ar: "كركوك", en: "Kirkuk" }] },
    { code: "IQ-SD", ar: "صلاح الدين", en: "Saladin", cities: [{ code: "IQ-TIKRIT", ar: "تكريت", en: "Tikrit" }] },
    { code: "IQ-WA", ar: "واسط", en: "Wasit", cities: [{ code: "IQ-KUT", ar: "الكوت", en: "Kut" }] },
    { code: "IQ-QA", ar: "القادسية", en: "Qadisiyyah", cities: [{ code: "IQ-DIWANIYA", ar: "الديوانية", en: "Diwaniyah" }] },
    { code: "IQ-MA", ar: "ميسان", en: "Maysan", cities: [{ code: "IQ-AMARA", ar: "العمارة", en: "Amarah" }] },
    { code: "IQ-MU", ar: "المثنى", en: "Muthanna", cities: [{ code: "IQ-SAMAWA", ar: "السماوة", en: "Samawah" }] },
    { code: "IQ-DQ", ar: "ذي قار", en: "Dhi Qar", cities: [{ code: "IQ-NASIRIYAH", ar: "الناصرية", en: "Nasiriyah" }] },
  ],

  JO: [
    { code: "JO-AM", ar: "العاصمة", en: "Amman", cities: [{ code: "JO-AMMAN", ar: "عمّان", en: "Amman" }] },
    { code: "JO-IR", ar: "إربد", en: "Irbid", cities: [{ code: "JO-IRBID", ar: "إربد", en: "Irbid" }] },
    { code: "JO-ZA", ar: "الزرقاء", en: "Zarqa", cities: [{ code: "JO-ZARQA", ar: "الزرقاء", en: "Zarqa" }] },
    { code: "JO-BA", ar: "البلقاء", en: "Balqa", cities: [{ code: "JO-SALT", ar: "السلط", en: "Salt" }] },
    { code: "JO-MD", ar: "مادبا", en: "Madaba", cities: [{ code: "JO-MADABA", ar: "مادبا", en: "Madaba" }] },
    { code: "JO-KA", ar: "الكرك", en: "Karak", cities: [{ code: "JO-KARAK", ar: "الكرك", en: "Karak" }] },
    { code: "JO-MA", ar: "معان", en: "Ma'an", cities: [{ code: "JO-MAAN", ar: "معان", en: "Ma'an" }, { code: "JO-PETRA", ar: "البتراء", en: "Petra" }] },
    { code: "JO-AQ", ar: "العقبة", en: "Aqaba", cities: [{ code: "JO-AQABA", ar: "العقبة", en: "Aqaba" }] },
    { code: "JO-JA", ar: "جرش", en: "Jerash", cities: [{ code: "JO-JERASH", ar: "جرش", en: "Jerash" }] },
    { code: "JO-AJ", ar: "عجلون", en: "Ajloun", cities: [{ code: "JO-AJLOUN", ar: "عجلون", en: "Ajloun" }] },
    { code: "JO-MF", ar: "المفرق", en: "Mafraq", cities: [{ code: "JO-MAFRAQ", ar: "المفرق", en: "Mafraq" }] },
    { code: "JO-AT", ar: "الطفيلة", en: "Tafilah", cities: [{ code: "JO-TAFILAH", ar: "الطفيلة", en: "Tafilah" }] },
  ],

  LB: [
    { code: "LB-BA", ar: "بيروت", en: "Beirut", cities: [{ code: "LB-BEIRUT", ar: "بيروت", en: "Beirut" }] },
    { code: "LB-JL", ar: "جبل لبنان", en: "Mount Lebanon", cities: [{ code: "LB-JOUNIEH", ar: "جونية", en: "Jounieh" }, { code: "LB-BAABDA", ar: "بعبدا", en: "Baabda" }] },
    { code: "LB-AS", ar: "الشمال", en: "North", cities: [{ code: "LB-TRIPOLI", ar: "طرابلس", en: "Tripoli" }] },
    { code: "LB-AK", ar: "عكار", en: "Akkar", cities: [{ code: "LB-HALBA", ar: "حلبا", en: "Halba" }] },
    { code: "LB-BI", ar: "البقاع", en: "Beqaa", cities: [{ code: "LB-ZAHLE", ar: "زحلة", en: "Zahle" }] },
    { code: "LB-BH", ar: "بعلبك الهرمل", en: "Baalbek-Hermel", cities: [{ code: "LB-BAALBEK", ar: "بعلبك", en: "Baalbek" }] },
    { code: "LB-JA", ar: "الجنوب", en: "South", cities: [{ code: "LB-SIDON", ar: "صيدا", en: "Sidon" }, { code: "LB-TYRE", ar: "صور", en: "Tyre" }] },
    { code: "LB-NA", ar: "النبطية", en: "Nabatieh", cities: [{ code: "LB-NABATIEH", ar: "النبطية", en: "Nabatieh" }] },
  ],

  PS: [
    { code: "PS-JM", ar: "القدس", en: "Jerusalem", cities: [{ code: "PS-JERUSALEM", ar: "القدس", en: "Jerusalem" }] },
    { code: "PS-RBH", ar: "رام الله والبيرة", en: "Ramallah and al-Bireh", cities: [{ code: "PS-RAMALLAH", ar: "رام الله", en: "Ramallah" }] },
    { code: "PS-NBS", ar: "نابلس", en: "Nablus", cities: [{ code: "PS-NABLUS", ar: "نابلس", en: "Nablus" }] },
    { code: "PS-HBN", ar: "الخليل", en: "Hebron", cities: [{ code: "PS-HEBRON", ar: "الخليل", en: "Hebron" }] },
    { code: "PS-BTH", ar: "بيت لحم", en: "Bethlehem", cities: [{ code: "PS-BETHLEHEM", ar: "بيت لحم", en: "Bethlehem" }] },
    { code: "PS-JEN", ar: "جنين", en: "Jenin", cities: [{ code: "PS-JENIN", ar: "جنين", en: "Jenin" }] },
    { code: "PS-TKM", ar: "طولكرم", en: "Tulkarm", cities: [{ code: "PS-TULKARM", ar: "طولكرم", en: "Tulkarm" }] },
    { code: "PS-QQA", ar: "قلقيلية", en: "Qalqilya", cities: [{ code: "PS-QALQILYA", ar: "قلقيلية", en: "Qalqilya" }] },
    { code: "PS-SLT", ar: "سلفيت", en: "Salfit", cities: [{ code: "PS-SALFIT", ar: "سلفيت", en: "Salfit" }] },
    { code: "PS-JRH", ar: "أريحا", en: "Jericho", cities: [{ code: "PS-JERICHO", ar: "أريحا", en: "Jericho" }] },
    { code: "PS-TBS", ar: "طوباس", en: "Tubas", cities: [{ code: "PS-TUBAS", ar: "طوباس", en: "Tubas" }] },
    { code: "PS-GZA", ar: "غزة", en: "Gaza", cities: [{ code: "PS-GAZA", ar: "غزة", en: "Gaza" }] },
    { code: "PS-KYS", ar: "خان يونس", en: "Khan Yunis", cities: [{ code: "PS-KHANYUNIS", ar: "خان يونس", en: "Khan Yunis" }] },
    { code: "PS-RFH", ar: "رفح", en: "Rafah", cities: [{ code: "PS-RAFAH", ar: "رفح", en: "Rafah" }] },
    { code: "PS-DEB", ar: "دير البلح", en: "Deir al-Balah", cities: [{ code: "PS-DEIRALBALAH", ar: "دير البلح", en: "Deir al-Balah" }] },
    { code: "PS-NGZ", ar: "شمال غزة", en: "North Gaza", cities: [{ code: "PS-JABALIA", ar: "جباليا", en: "Jabalia" }] },
  ],

  YE: [
    { code: "YE-SA", ar: "أمانة العاصمة", en: "Sana'a City", cities: [{ code: "YE-SANAA", ar: "صنعاء", en: "Sana'a" }] },
    { code: "YE-AD", ar: "عدن", en: "Aden", cities: [{ code: "YE-ADEN", ar: "عدن", en: "Aden" }] },
    { code: "YE-TA", ar: "تعز", en: "Taiz", cities: [{ code: "YE-TAIZ", ar: "تعز", en: "Taiz" }] },
    { code: "YE-HU", ar: "الحديدة", en: "Al Hudaydah", cities: [{ code: "YE-HUDAYDAH", ar: "الحديدة", en: "Al Hudaydah" }] },
    { code: "YE-HD", ar: "حضرموت", en: "Hadhramaut", cities: [{ code: "YE-MUKALLA", ar: "المكلا", en: "Mukalla" }, { code: "YE-SEIYUN", ar: "سيئون", en: "Seiyun" }] },
    { code: "YE-IB", ar: "إب", en: "Ibb", cities: [{ code: "YE-IBB", ar: "إب", en: "Ibb" }] },
    { code: "YE-MR", ar: "مأرب", en: "Marib", cities: [{ code: "YE-MARIB", ar: "مأرب", en: "Marib" }] },
    { code: "YE-DH", ar: "ذمار", en: "Dhamar", cities: [{ code: "YE-DHAMAR", ar: "ذمار", en: "Dhamar" }] },
    { code: "YE-LA", ar: "لحج", en: "Lahij", cities: [{ code: "YE-LAHIJ", ar: "لحج", en: "Lahij" }] },
    { code: "YE-AB", ar: "أبين", en: "Abyan", cities: [{ code: "YE-ZINJIBAR", ar: "زنجبار", en: "Zinjibar" }] },
    { code: "YE-SH", ar: "شبوة", en: "Shabwah", cities: [{ code: "YE-ATAQ", ar: "عتق", en: "Ataq" }] },
    { code: "YE-SD", ar: "صعدة", en: "Saada", cities: [{ code: "YE-SAADA", ar: "صعدة", en: "Saada" }] },
    { code: "YE-MW", ar: "المهرة", en: "Al Mahrah", cities: [{ code: "YE-GHAYDAH", ar: "الغيضة", en: "Al Ghaydah" }] },
    { code: "YE-SU", ar: "سقطرى", en: "Socotra", cities: [{ code: "YE-HADIBU", ar: "حديبو", en: "Hadibu" }] },
  ],

  LY: [
    { code: "LY-TB", ar: "طرابلس", en: "Tripoli", cities: [{ code: "LY-TRIPOLI", ar: "طرابلس", en: "Tripoli" }] },
    { code: "LY-BA", ar: "بنغازي", en: "Benghazi", cities: [{ code: "LY-BENGHAZI", ar: "بنغازي", en: "Benghazi" }] },
    { code: "LY-MI", ar: "مصراتة", en: "Misrata", cities: [{ code: "LY-MISRATA", ar: "مصراتة", en: "Misrata" }] },
    { code: "LY-ZA", ar: "الزاوية", en: "Zawiya", cities: [{ code: "LY-ZAWIYA", ar: "الزاوية", en: "Zawiya" }] },
    { code: "LY-JA", ar: "الجبل الأخضر", en: "Jabal al Akhdar", cities: [{ code: "LY-BAYDA", ar: "البيضاء", en: "Bayda" }] },
    { code: "LY-DR", ar: "درنة", en: "Derna", cities: [{ code: "LY-DERNA", ar: "درنة", en: "Derna" }] },
    { code: "LY-SR", ar: "سرت", en: "Sirte", cities: [{ code: "LY-SIRTE", ar: "سرت", en: "Sirte" }] },
    { code: "LY-SB", ar: "سبها", en: "Sabha", cities: [{ code: "LY-SABHA", ar: "سبها", en: "Sabha" }] },
    { code: "LY-TU", ar: "طبرق", en: "Tobruk", cities: [{ code: "LY-TOBRUK", ar: "طبرق", en: "Tobruk" }] },
    { code: "LY-GT", ar: "غات", en: "Ghat", cities: [{ code: "LY-GHAT", ar: "غات", en: "Ghat" }] },
  ],

  TN: [
    { code: "TN-11", ar: "تونس", en: "Tunis", cities: [{ code: "TN-TUNIS", ar: "تونس", en: "Tunis" }] },
    { code: "TN-13", ar: "بن عروس", en: "Ben Arous", cities: [{ code: "TN-BENAROUS", ar: "بن عروس", en: "Ben Arous" }] },
    { code: "TN-12", ar: "أريانة", en: "Ariana", cities: [{ code: "TN-ARIANA", ar: "أريانة", en: "Ariana" }] },
    { code: "TN-14", ar: "منوبة", en: "Manouba", cities: [{ code: "TN-MANOUBA", ar: "منوبة", en: "Manouba" }] },
    { code: "TN-31", ar: "بنزرت", en: "Bizerte", cities: [{ code: "TN-BIZERTE", ar: "بنزرت", en: "Bizerte" }] },
    { code: "TN-51", ar: "سوسة", en: "Sousse", cities: [{ code: "TN-SOUSSE", ar: "سوسة", en: "Sousse" }] },
    { code: "TN-52", ar: "المنستير", en: "Monastir", cities: [{ code: "TN-MONASTIR", ar: "المنستير", en: "Monastir" }] },
    { code: "TN-53", ar: "المهدية", en: "Mahdia", cities: [{ code: "TN-MAHDIA", ar: "المهدية", en: "Mahdia" }] },
    { code: "TN-61", ar: "صفاقس", en: "Sfax", cities: [{ code: "TN-SFAX", ar: "صفاقس", en: "Sfax" }] },
    { code: "TN-71", ar: "قيروان", en: "Kairouan", cities: [{ code: "TN-KAIROUAN", ar: "القيروان", en: "Kairouan" }] },
    { code: "TN-81", ar: "قابس", en: "Gabes", cities: [{ code: "TN-GABES", ar: "قابس", en: "Gabes" }] },
    { code: "TN-82", ar: "مدنين", en: "Medenine", cities: [{ code: "TN-DJERBA", ar: "جربة", en: "Djerba" }] },
    { code: "TN-83", ar: "تطاوين", en: "Tataouine", cities: [{ code: "TN-TATAOUINE", ar: "تطاوين", en: "Tataouine" }] },
    { code: "TN-73", ar: "قفصة", en: "Gafsa", cities: [{ code: "TN-GAFSA", ar: "قفصة", en: "Gafsa" }] },
    { code: "TN-72", ar: "توزر", en: "Tozeur", cities: [{ code: "TN-TOZEUR", ar: "توزر", en: "Tozeur" }] },
    { code: "TN-32", ar: "باجة", en: "Beja", cities: [{ code: "TN-BEJA", ar: "باجة", en: "Beja" }] },
    { code: "TN-21", ar: "نابل", en: "Nabeul", cities: [{ code: "TN-NABEUL", ar: "نابل", en: "Nabeul" }, { code: "TN-HAMMAMET", ar: "الحمامات", en: "Hammamet" }] },
  ],

  DZ: [
    { code: "DZ-16", ar: "الجزائر", en: "Algiers", cities: [{ code: "DZ-ALGIERS", ar: "الجزائر", en: "Algiers" }] },
    { code: "DZ-31", ar: "وهران", en: "Oran", cities: [{ code: "DZ-ORAN", ar: "وهران", en: "Oran" }] },
    { code: "DZ-25", ar: "قسنطينة", en: "Constantine", cities: [{ code: "DZ-CONSTANTINE", ar: "قسنطينة", en: "Constantine" }] },
    { code: "DZ-23", ar: "عنابة", en: "Annaba", cities: [{ code: "DZ-ANNABA", ar: "عنابة", en: "Annaba" }] },
    { code: "DZ-09", ar: "البليدة", en: "Blida", cities: [{ code: "DZ-BLIDA", ar: "البليدة", en: "Blida" }] },
    { code: "DZ-19", ar: "سطيف", en: "Setif", cities: [{ code: "DZ-SETIF", ar: "سطيف", en: "Setif" }] },
    { code: "DZ-06", ar: "بجاية", en: "Bejaia", cities: [{ code: "DZ-BEJAIA", ar: "بجاية", en: "Bejaia" }] },
    { code: "DZ-15", ar: "تيزي وزو", en: "Tizi Ouzou", cities: [{ code: "DZ-TIZIOUZOU", ar: "تيزي وزو", en: "Tizi Ouzou" }] },
    { code: "DZ-05", ar: "باتنة", en: "Batna", cities: [{ code: "DZ-BATNA", ar: "باتنة", en: "Batna" }] },
    { code: "DZ-13", ar: "تلمسان", en: "Tlemcen", cities: [{ code: "DZ-TLEMCEN", ar: "تلمسان", en: "Tlemcen" }] },
    { code: "DZ-30", ar: "ورقلة", en: "Ouargla", cities: [{ code: "DZ-OUARGLA", ar: "ورقلة", en: "Ouargla" }] },
    { code: "DZ-01", ar: "أدرار", en: "Adrar", cities: [{ code: "DZ-ADRAR", ar: "أدرار", en: "Adrar" }] },
    { code: "DZ-47", ar: "غرداية", en: "Ghardaia", cities: [{ code: "DZ-GHARDAIA", ar: "غرداية", en: "Ghardaia" }] },
    { code: "DZ-11", ar: "تمنراست", en: "Tamanrasset", cities: [{ code: "DZ-TAMANRASSET", ar: "تمنراست", en: "Tamanrasset" }] },
  ],

  MA: [
    { code: "MA-CAS", ar: "الدار البيضاء سطات", en: "Casablanca-Settat", cities: [
      { code: "MA-CASABLANCA", ar: "الدار البيضاء", en: "Casablanca" },
      { code: "MA-SETTAT", ar: "سطات", en: "Settat" },
      { code: "MA-MOHAMMEDIA", ar: "المحمدية", en: "Mohammedia" },
    ] },
    { code: "MA-RAB", ar: "الرباط سلا القنيطرة", en: "Rabat-Sale-Kenitra", cities: [
      { code: "MA-RABAT", ar: "الرباط", en: "Rabat" },
      { code: "MA-SALE", ar: "سلا", en: "Sale" },
      { code: "MA-KENITRA", ar: "القنيطرة", en: "Kenitra" },
    ] },
    { code: "MA-MAR", ar: "مراكش آسفي", en: "Marrakesh-Safi", cities: [
      { code: "MA-MARRAKESH", ar: "مراكش", en: "Marrakesh" },
      { code: "MA-ESSAOUIRA", ar: "الصويرة", en: "Essaouira" },
      { code: "MA-SAFI", ar: "آسفي", en: "Safi" },
    ] },
    { code: "MA-FES", ar: "فاس مكناس", en: "Fez-Meknes", cities: [
      { code: "MA-FEZ", ar: "فاس", en: "Fez" },
      { code: "MA-MEKNES", ar: "مكناس", en: "Meknes" },
      { code: "MA-IFRANE", ar: "إفران", en: "Ifrane" },
    ] },
    { code: "MA-TAN", ar: "طنجة تطوان الحسيمة", en: "Tanger-Tetouan-Al Hoceima", cities: [
      { code: "MA-TANGIER", ar: "طنجة", en: "Tangier" },
      { code: "MA-TETOUAN", ar: "تطوان", en: "Tetouan" },
      { code: "MA-ALHOCEIMA", ar: "الحسيمة", en: "Al Hoceima" },
    ] },
    { code: "MA-ORI", ar: "الشرق", en: "Oriental", cities: [
      { code: "MA-OUJDA", ar: "وجدة", en: "Oujda" },
      { code: "MA-NADOR", ar: "الناظور", en: "Nador" },
    ] },
    { code: "MA-SOU", ar: "سوس ماسة", en: "Souss-Massa", cities: [
      { code: "MA-AGADIR", ar: "أكادير", en: "Agadir" },
      { code: "MA-TAROUDANT", ar: "تارودانت", en: "Taroudant" },
    ] },
    { code: "MA-BEN", ar: "بني ملال خنيفرة", en: "Beni Mellal-Khenifra", cities: [
      { code: "MA-BENIMELLAL", ar: "بني ملال", en: "Beni Mellal" },
    ] },
    { code: "MA-DRA", ar: "درعة تافيلالت", en: "Draa-Tafilalet", cities: [
      { code: "MA-ERRACHIDIA", ar: "الرشيدية", en: "Errachidia" },
      { code: "MA-OUARZAZATE", ar: "ورزازات", en: "Ouarzazate" },
    ] },
    { code: "MA-LAA", ar: "العيون الساقية الحمراء", en: "Laayoune-Sakia El Hamra", cities: [
      { code: "MA-LAAYOUNE", ar: "العيون", en: "Laayoune" },
    ] },
    { code: "MA-DAK", ar: "الداخلة وادي الذهب", en: "Dakhla-Oued Ed-Dahab", cities: [
      { code: "MA-DAKHLA", ar: "الداخلة", en: "Dakhla" },
    ] },
    { code: "MA-GUE", ar: "كلميم واد نون", en: "Guelmim-Oued Noun", cities: [
      { code: "MA-GUELMIM", ar: "كلميم", en: "Guelmim" },
    ] },
  ],

  MR: [
    { code: "MR-NKC", ar: "نواكشوط", en: "Nouakchott", cities: [{ code: "MR-NOUAKCHOTT", ar: "نواكشوط", en: "Nouakchott" }] },
    { code: "MR-DN", ar: "داخلت نواذيبو", en: "Dakhlet Nouadhibou", cities: [{ code: "MR-NOUADHIBOU", ar: "نواذيبو", en: "Nouadhibou" }] },
    { code: "MR-TR", ar: "ترارزة", en: "Trarza", cities: [{ code: "MR-ROSSO", ar: "روصو", en: "Rosso" }] },
    { code: "MR-AD", ar: "آدرار", en: "Adrar", cities: [{ code: "MR-ATAR", ar: "أطار", en: "Atar" }] },
    { code: "MR-HC", ar: "الحوض الشرقي", en: "Hodh Ech Chargui", cities: [{ code: "MR-NEMA", ar: "النعمة", en: "Nema" }] },
    { code: "MR-AS", ar: "العصابة", en: "Assaba", cities: [{ code: "MR-KIFFA", ar: "كيفة", en: "Kiffa" }] },
  ],

  SD: [
    { code: "SD-KH", ar: "الخرطوم", en: "Khartoum", cities: [
      { code: "SD-KHARTOUM", ar: "الخرطوم", en: "Khartoum" },
      { code: "SD-OMDURMAN", ar: "أم درمان", en: "Omdurman" },
      { code: "SD-BAHRI", ar: "الخرطوم بحري", en: "Khartoum Bahri" },
    ] },
    { code: "SD-GZ", ar: "الجزيرة", en: "Gezira", cities: [{ code: "SD-WADMEDANI", ar: "ود مدني", en: "Wad Madani" }] },
    { code: "SD-RS", ar: "البحر الأحمر", en: "Red Sea", cities: [{ code: "SD-PORTSUDAN", ar: "بورتسودان", en: "Port Sudan" }] },
    { code: "SD-KS", ar: "كسلا", en: "Kassala", cities: [{ code: "SD-KASSALA", ar: "كسلا", en: "Kassala" }] },
    { code: "SD-GD", ar: "القضارف", en: "Gedaref", cities: [{ code: "SD-GEDAREF", ar: "القضارف", en: "Gedaref" }] },
    { code: "SD-NW", ar: "النيل الأبيض", en: "White Nile", cities: [{ code: "SD-KOSTI", ar: "كوستي", en: "Kosti" }] },
    { code: "SD-NB", ar: "النيل الأزرق", en: "Blue Nile", cities: [{ code: "SD-DAMAZIN", ar: "الدمازين", en: "Ed Damazin" }] },
    { code: "SD-NO", ar: "الشمالية", en: "Northern", cities: [{ code: "SD-DONGOLA", ar: "دنقلا", en: "Dongola" }] },
    { code: "SD-NR", ar: "نهر النيل", en: "River Nile", cities: [{ code: "SD-ATBARA", ar: "عطبرة", en: "Atbara" }] },
    { code: "SD-NK", ar: "شمال كردفان", en: "North Kordofan", cities: [{ code: "SD-ELOBEID", ar: "الأبيض", en: "El Obeid" }] },
    { code: "SD-ND", ar: "شمال دارفور", en: "North Darfur", cities: [{ code: "SD-ELFASHER", ar: "الفاشر", en: "El Fasher" }] },
    { code: "SD-SD", ar: "جنوب دارفور", en: "South Darfur", cities: [{ code: "SD-NYALA", ar: "نيالا", en: "Nyala" }] },
  ],

  SO: [
    { code: "SO-BN", ar: "بنادر", en: "Banadir", cities: [{ code: "SO-MOGADISHU", ar: "مقديشو", en: "Mogadishu" }] },
    { code: "SO-WO", ar: "أوقوي غالبيد", en: "Woqooyi Galbeed", cities: [{ code: "SO-HARGEISA", ar: "هرجيسا", en: "Hargeisa" }] },
    { code: "SO-BR", ar: "بري", en: "Bari", cities: [{ code: "SO-BOSASO", ar: "بوصاصو", en: "Bosaso" }] },
    { code: "SO-NU", ar: "نوغال", en: "Nugal", cities: [{ code: "SO-GAROWE", ar: "غاروي", en: "Garowe" }] },
    { code: "SO-SH", ar: "شبيلي السفلى", en: "Lower Shabelle", cities: [{ code: "SO-MERCA", ar: "مركا", en: "Merca" }] },
    { code: "SO-JH", ar: "جوبا السفلى", en: "Lower Juba", cities: [{ code: "SO-KISMAYO", ar: "كيسمايو", en: "Kismayo" }] },
    { code: "SO-TO", ar: "طوغدير", en: "Togdheer", cities: [{ code: "SO-BURAO", ar: "بورعو", en: "Burao" }] },
  ],

  DJ: [
    { code: "DJ-DJ", ar: "جيبوتي", en: "Djibouti", cities: [{ code: "DJ-DJIBOUTICITY", ar: "مدينة جيبوتي", en: "Djibouti City" }] },
    { code: "DJ-AS", ar: "علي صبيح", en: "Ali Sabieh", cities: [{ code: "DJ-ALISABIEH", ar: "علي صبيح", en: "Ali Sabieh" }] },
    { code: "DJ-TA", ar: "تاجورة", en: "Tadjourah", cities: [{ code: "DJ-TADJOURAH", ar: "تاجورة", en: "Tadjourah" }] },
    { code: "DJ-OB", ar: "أوبوك", en: "Obock", cities: [{ code: "DJ-OBOCK", ar: "أوبوك", en: "Obock" }] },
    { code: "DJ-DI", ar: "دخيل", en: "Dikhil", cities: [{ code: "DJ-DIKHIL", ar: "دخيل", en: "Dikhil" }] },
    { code: "DJ-AR", ar: "أرتا", en: "Arta", cities: [{ code: "DJ-ARTA", ar: "أرتا", en: "Arta" }] },
  ],

  KM: [
    { code: "KM-G", ar: "القمر الكبرى", en: "Grande Comore", cities: [{ code: "KM-MORONI", ar: "موروني", en: "Moroni" }] },
    { code: "KM-A", ar: "أنجوان", en: "Anjouan", cities: [{ code: "KM-MUTSAMUDU", ar: "موتسامودو", en: "Mutsamudu" }] },
    { code: "KM-M", ar: "موهيلي", en: "Moheli", cities: [{ code: "KM-FOMBONI", ar: "فومبوني", en: "Fomboni" }] },
  ],

  TR: [
    { code: "TR-34", ar: "إسطنبول", en: "Istanbul", cities: [
      { code: "TR-ISTANBUL", ar: "إسطنبول", en: "Istanbul" },
      { code: "TR-BEYOGLU", ar: "بي أوغلو", en: "Beyoglu" },
      { code: "TR-KADIKOY", ar: "قاضي كوي", en: "Kadikoy" },
      { code: "TR-BASAKSEHIR", ar: "باشاك شهير", en: "Basaksehir" },
    ] },
    { code: "TR-06", ar: "أنقرة", en: "Ankara", cities: [{ code: "TR-ANKARA", ar: "أنقرة", en: "Ankara" }] },
    { code: "TR-35", ar: "إزمير", en: "Izmir", cities: [{ code: "TR-IZMIR", ar: "إزمير", en: "Izmir" }] },
    { code: "TR-07", ar: "أنطاليا", en: "Antalya", cities: [{ code: "TR-ANTALYA", ar: "أنطاليا", en: "Antalya" }, { code: "TR-ALANYA", ar: "ألانيا", en: "Alanya" }] },
    { code: "TR-16", ar: "بورصة", en: "Bursa", cities: [{ code: "TR-BURSA", ar: "بورصة", en: "Bursa" }] },
    { code: "TR-01", ar: "أضنة", en: "Adana", cities: [{ code: "TR-ADANA", ar: "أضنة", en: "Adana" }] },
    { code: "TR-27", ar: "غازي عنتاب", en: "Gaziantep", cities: [{ code: "TR-GAZIANTEP", ar: "غازي عنتاب", en: "Gaziantep" }] },
    { code: "TR-31", ar: "هطاي", en: "Hatay", cities: [{ code: "TR-ANTAKYA", ar: "أنطاكية", en: "Antakya" }, { code: "TR-ISKENDERUN", ar: "إسكندرون", en: "Iskenderun" }] },
    { code: "TR-33", ar: "مرسين", en: "Mersin", cities: [{ code: "TR-MERSIN", ar: "مرسين", en: "Mersin" }] },
    { code: "TR-42", ar: "قونية", en: "Konya", cities: [{ code: "TR-KONYA", ar: "قونية", en: "Konya" }] },
    { code: "TR-41", ar: "كوجالي", en: "Kocaeli", cities: [{ code: "TR-IZMIT", ar: "إزميت", en: "Izmit" }] },
    { code: "TR-63", ar: "شانلي أورفة", en: "Sanliurfa", cities: [{ code: "TR-SANLIURFA", ar: "شانلي أورفة", en: "Sanliurfa" }] },
    { code: "TR-61", ar: "طرابزون", en: "Trabzon", cities: [{ code: "TR-TRABZON", ar: "طرابزون", en: "Trabzon" }] },
    { code: "TR-55", ar: "سامسون", en: "Samsun", cities: [{ code: "TR-SAMSUN", ar: "سامسون", en: "Samsun" }] },
    { code: "TR-38", ar: "قيصري", en: "Kayseri", cities: [{ code: "TR-KAYSERI", ar: "قيصري", en: "Kayseri" }] },
    { code: "TR-48", ar: "موغلا", en: "Mugla", cities: [{ code: "TR-BODRUM", ar: "بودروم", en: "Bodrum" }, { code: "TR-FETHIYE", ar: "فتحية", en: "Fethiye" }] },
    { code: "TR-10", ar: "بالق أسير", en: "Balikesir", cities: [{ code: "TR-BALIKESIR", ar: "بالق أسير", en: "Balikesir" }] },
    { code: "TR-59", ar: "تكيرداغ", en: "Tekirdag", cities: [{ code: "TR-TEKIRDAG", ar: "تكيرداغ", en: "Tekirdag" }] },
    { code: "TR-54", ar: "سكاريا", en: "Sakarya", cities: [{ code: "TR-SAKARYA", ar: "سكاريا", en: "Sakarya" }] },
    { code: "TR-21", ar: "ديار بكر", en: "Diyarbakir", cities: [{ code: "TR-DIYARBAKIR", ar: "ديار بكر", en: "Diyarbakir" }] },
  ],
};

/** Countries whose catalogue is deliberately left untouched. */
export const SKIP = new Set(["SA"]);
