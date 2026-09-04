// AkarProMax — Oman launch data seed (geography + professional services taxonomy).
//
// Real, production-intended reference data, not the gated demo graph in
// seed-services.ts. It is idempotent: every row is keyed on a natural key
// (country/governorate/city/district code, or country_code+category code) and
// re-running updates names in place rather than duplicating. Safe to run more
// than once and safe to run against the live database.
//
//   node --env-file=.env scripts/seed-oman-launch-data.mjs
//
// It fills:
//   - governorates : all 11 of Oman
//   - cities       : all 61 wilayats, under their governorate
//   - districts    : the well-known districts of the major cities (Muscat
//                    governorate in full, plus Salalah / Sohar / Nizwa / Sur).
//                    Smaller wilayats are left without districts rather than
//                    invented; they can be added from the admin as needed.
//   - service_categories : a two-level professional taxonomy (10 groups, ~40
//                    trades) for country OM.
//
// It does NOT touch users, listings, requests, offers or any operational row.

import postgres from "postgres";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("[seed-oman] DATABASE_URL is not set. Run with --env-file=.env.");
  process.exit(1);
}

const COUNTRY = "OM";

// ── Governorates (11) ───────────────────────────────────────────────────────
const GOVERNORATES = [
  { code: "MCT", ar: "مسقط", en: "Muscat", tr: "Maskat", order: 1 },
  { code: "BAN", ar: "شمال الباطنة", en: "Al Batinah North", tr: "Kuzey Batina", order: 2 },
  { code: "BAS", ar: "جنوب الباطنة", en: "Al Batinah South", tr: "Güney Batina", order: 3 },
  { code: "DAK", ar: "الداخلية", en: "Ad Dakhiliyah", tr: "Dahiliye", order: 4 },
  { code: "SHN", ar: "شمال الشرقية", en: "Ash Sharqiyah North", tr: "Kuzey Şarkiye", order: 5 },
  { code: "SHS", ar: "جنوب الشرقية", en: "Ash Sharqiyah South", tr: "Güney Şarkiye", order: 6 },
  { code: "DHA", ar: "الظاهرة", en: "Ad Dhahirah", tr: "Zahire", order: 7 },
  { code: "BUR", ar: "البريمي", en: "Al Buraimi", tr: "Bureymi", order: 8 },
  { code: "DHO", ar: "ظفار", en: "Dhofar", tr: "Zufar", order: 9 },
  { code: "MUS", ar: "مسندم", en: "Musandam", tr: "Musandam", order: 10 },
  { code: "WUS", ar: "الوسطى", en: "Al Wusta", tr: "Vusta", order: 11 },
];

// ── Wilayats → cities (61), lat/lng for the ones with a known centre ─────────
const WILAYATS = [
  // Muscat (6)
  { gov: "MCT", code: "MCT-MUSCAT", ar: "مسقط", en: "Muscat", tr: "Maskat", lat: "23.6139", lng: "58.5922" },
  { gov: "MCT", code: "MCT-MUTTRAH", ar: "مطرح", en: "Muttrah", tr: "Matrah", lat: "23.6150", lng: "58.5636" },
  { gov: "MCT", code: "MCT-BAWSHAR", ar: "بوشر", en: "Bawshar", tr: "Bevşer", lat: "23.5833", lng: "58.4000" },
  { gov: "MCT", code: "MCT-SEEB", ar: "السيب", en: "Seeb", tr: "Sib", lat: "23.6703", lng: "58.1891" },
  { gov: "MCT", code: "MCT-AMERAT", ar: "العامرات", en: "Al Amerat", tr: "Amerat", lat: "23.5150", lng: "58.4900" },
  { gov: "MCT", code: "MCT-QURAYYAT", ar: "قريات", en: "Qurayyat", tr: "Kureyyat", lat: "23.2583", lng: "58.9083" },
  // Al Batinah North (6)
  { gov: "BAN", code: "BAN-SOHAR", ar: "صحار", en: "Sohar", tr: "Suhar", lat: "24.3475", lng: "56.7089" },
  { gov: "BAN", code: "BAN-SHINAS", ar: "شناص", en: "Shinas", tr: "Şinas", lat: "24.7419", lng: "56.4661" },
  { gov: "BAN", code: "BAN-LIWA", ar: "لوى", en: "Liwa", tr: "Liva", lat: "24.5306", lng: "56.5636" },
  { gov: "BAN", code: "BAN-SAHAM", ar: "صحم", en: "Saham", tr: "Saham", lat: "24.1722", lng: "56.8886" },
  { gov: "BAN", code: "BAN-KHABURAH", ar: "الخابورة", en: "Al Khaburah", tr: "Habura", lat: "23.9781", lng: "57.0906" },
  { gov: "BAN", code: "BAN-SUWAIQ", ar: "السويق", en: "As Suwaiq", tr: "Suveyk", lat: "23.8489", lng: "57.4386" },
  // Al Batinah South (6)
  { gov: "BAS", code: "BAS-RUSTAQ", ar: "الرستاق", en: "Ar Rustaq", tr: "Rüstak", lat: "23.3908", lng: "57.4244" },
  { gov: "BAS", code: "BAS-AWABI", ar: "العوابي", en: "Al Awabi", tr: "Avabi", lat: "23.3097", lng: "57.5286" },
  { gov: "BAS", code: "BAS-NAKHAL", ar: "نخل", en: "Nakhal", tr: "Nahil", lat: "23.3931", lng: "57.8256" },
  { gov: "BAS", code: "BAS-WADIMAAWIL", ar: "وادي المعاول", en: "Wadi Al Maawil", tr: "Vadi Maavil", lat: "23.4667", lng: "57.7000" },
  { gov: "BAS", code: "BAS-BARKA", ar: "بركاء", en: "Barka", tr: "Barka", lat: "23.6786", lng: "57.8886" },
  { gov: "BAS", code: "BAS-MUSANAAH", ar: "المصنعة", en: "Al Musanaah", tr: "Musanaa", lat: "23.7833", lng: "57.6167" },
  // Ad Dakhiliyah (8)
  { gov: "DAK", code: "DAK-NIZWA", ar: "نزوى", en: "Nizwa", tr: "Nizva", lat: "22.9333", lng: "57.5333" },
  { gov: "DAK", code: "DAK-BAHLA", ar: "بهلاء", en: "Bahla", tr: "Bahla", lat: "22.9639", lng: "57.3006" },
  { gov: "DAK", code: "DAK-MANAH", ar: "منح", en: "Manah", tr: "Manah", lat: "22.8028", lng: "57.5906" },
  { gov: "DAK", code: "DAK-HAMRA", ar: "الحمراء", en: "Al Hamra", tr: "Hamra", lat: "23.1167", lng: "57.3000" },
  { gov: "DAK", code: "DAK-ADAM", ar: "أدم", en: "Adam", tr: "Adem", lat: "22.3806", lng: "57.5261" },
  { gov: "DAK", code: "DAK-IZKI", ar: "إزكي", en: "Izki", tr: "İzki", lat: "22.9333", lng: "57.7667" },
  { gov: "DAK", code: "DAK-SAMAIL", ar: "سمائل", en: "Samail", tr: "Semail", lat: "23.3000", lng: "58.0333" },
  { gov: "DAK", code: "DAK-BIDBID", ar: "بدبد", en: "Bidbid", tr: "Bidbid", lat: "23.4167", lng: "58.1333" },
  // Ash Sharqiyah North (6)
  { gov: "SHN", code: "SHN-IBRA", ar: "إبراء", en: "Ibra", tr: "İbra", lat: "22.6906", lng: "58.5336" },
  { gov: "SHN", code: "SHN-MUDAYBI", ar: "المضيبي", en: "Al Mudaybi", tr: "Mudaybi", lat: "22.5722", lng: "58.1300" },
  { gov: "SHN", code: "SHN-BIDIYAH", ar: "بدية", en: "Bidiyah", tr: "Bidiye", lat: "22.4500", lng: "58.8000" },
  { gov: "SHN", code: "SHN-QABIL", ar: "القابل", en: "Al Qabil", tr: "Kabil", lat: "22.6667", lng: "58.6833" },
  { gov: "SHN", code: "SHN-WADIBANIKHALID", ar: "وادي بني خالد", en: "Wadi Bani Khalid", tr: "Vadi Beni Halid", lat: "22.5500", lng: "59.1000" },
  { gov: "SHN", code: "SHN-DIMA", ar: "دماء والطائيين", en: "Dima Wa Al Taeen", tr: "Dima ve Taiyin", lat: "22.9000", lng: "58.9000" },
  // Ash Sharqiyah South (5)
  { gov: "SHS", code: "SHS-SUR", ar: "صور", en: "Sur", tr: "Sur", lat: "22.5667", lng: "59.5289" },
  { gov: "SHS", code: "SHS-KAMIL", ar: "الكامل والوافي", en: "Al Kamil Wal Wafi", tr: "Kamil ve Vafi", lat: "22.2333", lng: "59.2000" },
  { gov: "SHS", code: "SHS-JBBHASSAN", ar: "جعلان بني بوحسن", en: "Jalan Bani Bu Hassan", tr: "Celan Beni Bu Hasan", lat: "22.0167", lng: "59.2833" },
  { gov: "SHS", code: "SHS-JBBALI", ar: "جعلان بني بوعلي", en: "Jalan Bani Bu Ali", tr: "Celan Beni Bu Ali", lat: "22.0000", lng: "59.3333" },
  { gov: "SHS", code: "SHS-MASIRAH", ar: "مصيرة", en: "Masirah", tr: "Masira", lat: "20.6667", lng: "58.8833" },
  // Ad Dhahirah (3)
  { gov: "DHA", code: "DHA-IBRI", ar: "عبري", en: "Ibri", tr: "İbri", lat: "23.2254", lng: "56.5158" },
  { gov: "DHA", code: "DHA-YANQUL", ar: "ينقل", en: "Yanqul", tr: "Yankul", lat: "23.5833", lng: "56.5333" },
  { gov: "DHA", code: "DHA-DHANK", ar: "ضنك", en: "Dhank", tr: "Dank", lat: "23.5556", lng: "56.2547" },
  // Al Buraimi (3)
  { gov: "BUR", code: "BUR-BURAIMI", ar: "البريمي", en: "Al Buraimi", tr: "Bureymi", lat: "24.2500", lng: "55.7931" },
  { gov: "BUR", code: "BUR-MAHDAH", ar: "محضة", en: "Mahdah", tr: "Mahda", lat: "24.3667", lng: "55.9833" },
  { gov: "BUR", code: "BUR-SUNAYNAH", ar: "السنينة", en: "As Sunaynah", tr: "Suneyne", lat: "23.8667", lng: "55.7167" },
  // Dhofar (10)
  { gov: "DHO", code: "DHO-SALALAH", ar: "صلالة", en: "Salalah", tr: "Salala", lat: "17.0194", lng: "54.0897" },
  { gov: "DHO", code: "DHO-TAQAH", ar: "طاقة", en: "Taqah", tr: "Taka", lat: "17.0389", lng: "54.4008" },
  { gov: "DHO", code: "DHO-MIRBAT", ar: "مرباط", en: "Mirbat", tr: "Mirbat", lat: "16.9922", lng: "54.6903" },
  { gov: "DHO", code: "DHO-THUMRAIT", ar: "ثمريت", en: "Thumrait", tr: "Sümreyt", lat: "17.6631", lng: "54.0242" },
  { gov: "DHO", code: "DHO-SADAH", ar: "سدح", en: "Sadah", tr: "Sadah", lat: "17.0561", lng: "55.0708" },
  { gov: "DHO", code: "DHO-RAKHYUT", ar: "رخيوت", en: "Rakhyut", tr: "Rahyut", lat: "16.7419", lng: "53.4197" },
  { gov: "DHO", code: "DHO-DALKUT", ar: "ضلكوت", en: "Dalkut", tr: "Dalkut", lat: "16.7000", lng: "53.2500" },
  { gov: "DHO", code: "DHO-MUQSHIN", ar: "مقشن", en: "Muqshin", tr: "Mukşin", lat: "19.4000", lng: "54.9000" },
  { gov: "DHO", code: "DHO-SHALIM", ar: "شليم وجزر الحلانيات", en: "Shalim and Hallaniyat Islands", tr: "Şalim ve Hallaniyat", lat: "18.1667", lng: "55.6667" },
  { gov: "DHO", code: "DHO-MAZYUNAH", ar: "المزيونة", en: "Al Mazyunah", tr: "Mazyune", lat: "17.9333", lng: "52.7333" },
  // Musandam (4)
  { gov: "MUS", code: "MUS-KHASAB", ar: "خصب", en: "Khasab", tr: "Hasab", lat: "26.1794", lng: "56.2472" },
  { gov: "MUS", code: "MUS-BUKHA", ar: "بخاء", en: "Bukha", tr: "Buha", lat: "26.1583", lng: "56.1394" },
  { gov: "MUS", code: "MUS-DABA", ar: "دبا", en: "Daba Al Bayah", tr: "Diba", lat: "25.6167", lng: "56.2667" },
  { gov: "MUS", code: "MUS-MADHA", ar: "مدحاء", en: "Madha", tr: "Madha", lat: "25.2833", lng: "56.3333" },
  // Al Wusta (4)
  { gov: "WUS", code: "WUS-HAIMA", ar: "هيماء", en: "Haima", tr: "Hayma", lat: "19.9569", lng: "56.2789" },
  { gov: "WUS", code: "WUS-MAHOUT", ar: "محوت", en: "Mahout", tr: "Mahut", lat: "20.8333", lng: "58.1500" },
  { gov: "WUS", code: "WUS-DUQM", ar: "الدقم", en: "Duqm", tr: "Dukm", lat: "19.6667", lng: "57.7000" },
  { gov: "WUS", code: "WUS-JAZER", ar: "الجازر", en: "Al Jazer", tr: "Cazer", lat: "18.9333", lng: "57.8333" },
];

// ── Districts of the major cities (rest left for admin entry) ────────────────
const DISTRICTS = [
  // Seeb
  ...["المعبيلة|Al Maabela", "الموالح|Al Mawaleh", "الخوض|Al Khoudh", "الحيل|Al Hail", "المابيلة الجنوبية|South Mabela", "الرسيل|Al Rusayl"].map((d) => dist("MCT-SEEB", d)),
  // Bawshar
  ...["الخوير|Al Khuwair", "الغبرة|Al Ghubra", "غلا|Ghala", "العذيبة|Azaiba", "بوشر|Bawshar", "المعبيلة|Ansab", "الأنصب|Al Ansab", "مدينة الإعلام|Madinat Al Ilam"].map((d) => dist("MCT-BAWSHAR", d)),
  // Muttrah
  ...["روي|Ruwi", "دارسيت|Darsait", "الوادي الكبير|Wadi Al Kabir", "القرم|Qurum", "مدينة السلطان قابوس|Madinat Sultan Qaboos", "شاطئ القرم|Shatti Al Qurum", "الحمرية|Al Hamriyah"].map((d) => dist("MCT-MUTTRAH", d)),
  // Muscat (old)
  ...["مسقط القديمة|Old Muscat", "سداب|Sidab", "البستان|Al Bustan", "جبل الأخضر|Riyam", "الحاجر|Al Hajar"].map((d) => dist("MCT-MUSCAT", d)),
  // Al Amerat
  ...["العامرات|Al Amerat", "المحج|Al Mahaj", "الوادي الكبير الجنوبي|South Wadi Kabir"].map((d) => dist("MCT-AMERAT", d)),
  // Salalah
  ...["الدهاريز|Al Dahariz", "السعادة|Al Saada", "عوقد|Awqad", "الوادي|Al Wadi", "صلالة الوسطى|Central Salalah", "الحصن|Al Husn", "الروبات|Ar Robat"].map((d) => dist("DHO-SALALAH", d)),
  // Sohar
  ...["الحمبار|Al Hambar", "المريغات|Al Muraighat", "الطريف|Al Tareef", "صلان|Sallan", "الأبيض|Al Abyadh", "فلج القبائل|Falaj Al Qabail"].map((d) => dist("BAN-SOHAR", d)),
  // Nizwa
  ...["العقر|Al Aqr", "فرق|Firq", "سعال|Saal", "الغنتق|Al Ghantaq", "تنوف|Tanuf"].map((d) => dist("DAK-NIZWA", d)),
  // Sur
  ...["العيجة|Al Aija", "الصفاء|Al Safa", "بلاد صور|Bilad Sur", "الغبيرة|Al Ghubaira"].map((d) => dist("SHS-SUR", d)),
];
function dist(city, s) {
  const [ar, en] = s.split("|");
  const code = `${city}-${en.replace(/[^A-Za-z0-9]+/g, "-").toUpperCase()}`;
  return { city, code, ar, en, tr: en };
}

// ── Professional services taxonomy (10 groups, ~40 trades) ───────────────────
// requiresLicense marks trades that legally need a permit/qualification in OM.
const GROUPS = [
  { code: "maintenance", ar: "صيانة", en: "Maintenance", tr: "Bakım", icon: "wrench", order: 1 },
  { code: "finishing", ar: "تشطيبات", en: "Finishing", tr: "Bitirme İşleri", icon: "paint-roller", order: 2 },
  { code: "construction", ar: "بناء ومقاولات", en: "Construction & Contracting", tr: "İnşaat", icon: "hard-hat", order: 3 },
  { code: "cleaning", ar: "تنظيف", en: "Cleaning", tr: "Temizlik", icon: "sparkles", order: 4 },
  { code: "moving", ar: "نقل وتغليف", en: "Moving & Packing", tr: "Taşıma", icon: "truck", order: 5 },
  { code: "outdoor", ar: "أعمال خارجية", en: "Outdoor Works", tr: "Dış Mekan", icon: "trees", order: 6 },
  { code: "engineering", ar: "هندسة واستشارات", en: "Engineering & Consulting", tr: "Mühendislik", icon: "ruler", order: 7 },
  { code: "realestate-services", ar: "خدمات عقارية", en: "Real Estate Services", tr: "Emlak Hizmetleri", icon: "building", order: 8 },
  { code: "professional", ar: "خدمات مهنية", en: "Professional Services", tr: "Profesyonel", icon: "briefcase", order: 9 },
  { code: "general", ar: "خدمات عامة", en: "General Services", tr: "Genel", icon: "hammer", order: 10 },
];
const TRADES = [
  // maintenance
  ["maintenance", "plumbing", "سباكة", "Plumbing", "Sıhhi Tesisat", 0],
  ["maintenance", "electrical", "كهرباء", "Electrical", "Elektrik", 1],
  ["maintenance", "ac-hvac", "تكييف وتبريد", "AC & HVAC", "Klima ve Soğutma", 1],
  ["maintenance", "appliance-repair", "صيانة أجهزة", "Appliance Repair", "Cihaz Tamiri", 0],
  ["maintenance", "cctv-satellite", "أنظمة مراقبة وستلايت", "CCTV & Satellite", "Güvenlik ve Uydu", 0],
  ["maintenance", "elevator", "صيانة مصاعد", "Elevator Maintenance", "Asansör Bakımı", 1],
  // finishing
  ["finishing", "painting", "دهانات", "Painting", "Boya", 0],
  ["finishing", "gypsum", "جبس وديكور", "Gypsum & Decor", "Alçı Dekor", 0],
  ["finishing", "tiling", "بلاط وسيراميك", "Tiling & Ceramic", "Fayans", 0],
  ["finishing", "aluminum-glass", "ألمنيوم وزجاج", "Aluminium & Glass", "Alüminyum ve Cam", 0],
  ["finishing", "carpentry", "نجارة", "Carpentry", "Marangozluk", 0],
  ["finishing", "false-ceiling", "أسقف مستعارة", "False Ceilings", "Asma Tavan", 0],
  // construction
  ["construction", "general-contracting", "مقاولات عامة", "General Contracting", "Genel Müteahhitlik", 1],
  ["construction", "blockwork", "بناء وطوب", "Blockwork & Masonry", "Duvar İşleri", 0],
  ["construction", "waterproofing", "عزل مائي وحراري", "Waterproofing & Insulation", "Yalıtım", 0],
  ["construction", "demolition", "هدم وإزالة", "Demolition", "Yıkım", 1],
  ["construction", "concrete", "أعمال خرسانة", "Concrete Works", "Beton İşleri", 0],
  // cleaning
  ["cleaning", "home-cleaning", "تنظيف منازل", "Home Cleaning", "Ev Temizliği", 0],
  ["cleaning", "deep-cleaning", "تنظيف عميق", "Deep Cleaning", "Derin Temizlik", 0],
  ["cleaning", "tank-cleaning", "تنظيف خزانات", "Water Tank Cleaning", "Su Deposu Temizliği", 0],
  ["cleaning", "facade-cleaning", "تنظيف واجهات", "Facade Cleaning", "Cephe Temizliği", 0],
  ["cleaning", "pest-control", "مكافحة حشرات", "Pest Control", "Haşere Kontrolü", 1],
  // moving
  ["moving", "furniture-moving", "نقل أثاث", "Furniture Moving", "Eşya Taşıma", 0],
  ["moving", "packing", "تغليف", "Packing", "Paketleme", 0],
  ["moving", "furniture-install", "فك وتركيب أثاث", "Furniture Assembly", "Mobilya Kurulumu", 0],
  // outdoor
  ["outdoor", "gardening", "تنسيق حدائق", "Gardening & Landscaping", "Bahçe Düzenleme", 0],
  ["outdoor", "pool-maintenance", "صيانة مسابح", "Pool Maintenance", "Havuz Bakımı", 0],
  ["outdoor", "solar", "طاقة شمسية", "Solar Systems", "Güneş Enerjisi", 1],
  ["outdoor", "shade-tents", "مظلات وسواتر", "Shades & Awnings", "Gölgelik", 0],
  // engineering
  ["engineering", "architecture", "تصميم معماري", "Architectural Design", "Mimari Tasarım", 1],
  ["engineering", "civil", "هندسة مدنية", "Civil Engineering", "İnşaat Mühendisliği", 1],
  ["engineering", "surveying", "مساحة", "Land Surveying", "Arazi Ölçümü", 1],
  ["engineering", "interior-design", "تصميم داخلي", "Interior Design", "İç Mimari", 0],
  ["engineering", "mep", "كهروميكانيك", "MEP Engineering", "Mekanik-Elektrik", 1],
  // real estate services
  ["realestate-services", "valuation", "تقييم عقاري", "Property Valuation", "Gayrimenkul Değerleme", 1],
  ["realestate-services", "property-management", "إدارة أملاك", "Property Management", "Emlak Yönetimi", 0],
  ["realestate-services", "realestate-marketing", "تسويق عقاري", "Real Estate Marketing", "Emlak Pazarlama", 0],
  // professional
  ["professional", "legal", "خدمات قانونية", "Legal Services", "Hukuki Hizmetler", 1],
  ["professional", "accounting", "محاسبة", "Accounting", "Muhasebe", 1],
  ["professional", "translation", "ترجمة", "Translation", "Çeviri", 0],
  // general
  ["general", "handyman", "خدمات متنوعة", "Handyman", "Tamirci", 0],
  ["general", "curtains", "ستائر", "Curtains & Blinds", "Perde", 0],
  ["general", "upholstery", "تنجيد أثاث", "Upholstery", "Döşemecilik", 0],
];

const sql = postgres(url, { ssl: "require", prepare: false, onnotice: () => {} });
const t = { gov: 0, city: 0, dist: 0, cat: 0 };

async function main() {
  const [{ id: countryId } = {}] = await sql`select id from countries where code = ${COUNTRY} limit 1`;
  if (!countryId) throw new Error(`country ${COUNTRY} not found`);

  // Governorates
  const govId = {};
  for (const g of GOVERNORATES) {
    const rows = await sql`select id from governorates where country_id = ${countryId} and code = ${g.code} limit 1`;
    if (rows[0]) {
      govId[g.code] = rows[0].id;
      await sql`update governorates set name_ar=${g.ar}, name_en=${g.en}, name_tr=${g.tr}, display_order=${g.order}, is_active=true, updated_at=now() where id=${rows[0].id}`;
    } else {
      const [ins] = await sql`insert into governorates (country_id, code, name_ar, name_en, name_tr, display_order, is_active) values (${countryId}, ${g.code}, ${g.ar}, ${g.en}, ${g.tr}, ${g.order}, true) returning id`;
      govId[g.code] = ins.id;
      t.gov++;
    }
  }

  // Cities (wilayats)
  const cityId = {};
  for (const [i, w] of WILAYATS.entries()) {
    const gid = govId[w.gov];
    const rows = await sql`select id from cities where governorate_id = ${gid} and code = ${w.code} limit 1`;
    if (rows[0]) {
      cityId[w.code] = rows[0].id;
      await sql`update cities set name_ar=${w.ar}, name_en=${w.en}, name_tr=${w.tr}, latitude=${w.lat ?? null}, longitude=${w.lng ?? null}, display_order=${i + 1}, is_active=true, updated_at=now() where id=${rows[0].id}`;
    } else {
      const [ins] = await sql`insert into cities (governorate_id, code, name_ar, name_en, name_tr, latitude, longitude, display_order, is_active) values (${gid}, ${w.code}, ${w.ar}, ${w.en}, ${w.tr}, ${w.lat ?? null}, ${w.lng ?? null}, ${i + 1}, true) returning id`;
      cityId[w.code] = ins.id;
      t.city++;
    }
  }

  // Districts
  for (const [i, d] of DISTRICTS.entries()) {
    const cid = cityId[d.city];
    if (!cid) continue;
    const rows = await sql`select id from districts where city_id = ${cid} and code = ${d.code} limit 1`;
    if (rows[0]) {
      await sql`update districts set name_ar=${d.ar}, name_en=${d.en}, name_tr=${d.tr}, is_active=true, updated_at=now() where id=${rows[0].id}`;
    } else {
      await sql`insert into districts (city_id, code, name_ar, name_en, name_tr, display_order, is_active) values (${cid}, ${d.code}, ${d.ar}, ${d.en}, ${d.tr}, ${i + 1}, true)`;
      t.dist++;
    }
  }

  // Service categories — groups first, then trades under them.
  const catId = {};
  for (const g of GROUPS) {
    const id = `svc-${COUNTRY}-${g.code}`;
    catId[g.code] = id;
    await upsertCategory({ id, parentId: null, code: g.code, ar: g.ar, en: g.en, tr: g.tr, icon: g.icon, order: g.order });
  }
  for (const [gi, [group, code, ar, en, tr, lic]] of TRADES.entries()) {
    const id = `svc-${COUNTRY}-${code}`;
    await upsertCategory({ id, parentId: catId[group], code, ar, en, tr, icon: null, order: gi + 1, requiresLicense: lic });
  }

  console.log(`\n[seed-oman] governorates +${t.gov}, cities +${t.city}, districts +${t.dist}, categories +${t.cat} (existing rows were refreshed in place).`);
}

async function upsertCategory({ id, parentId, code, ar, en, tr, icon, order, requiresLicense = 0 }) {
  const rows = await sql`select id from service_categories where country_code = ${COUNTRY} and code = ${code} limit 1`;
  if (rows[0]) {
    await sql`update service_categories set parent_id=${parentId}, name_ar=${ar}, name_en=${en}, name_tr=${tr}, icon=${icon}, sort_order=${order}, requires_license=${requiresLicense}, is_active=1, updated_at=now() where id=${rows[0].id}`;
  } else {
    await sql`insert into service_categories (id, parent_id, country_code, code, name_ar, name_en, name_tr, icon, sort_order, requires_license, requires_visit, price_min, price_max, is_featured, booking_mode, is_active, created_at, updated_at) values (${id}, ${parentId}, ${COUNTRY}, ${code}, ${ar}, ${en}, ${tr}, ${icon}, ${order}, ${requiresLicense}, 0, null, null, 0, 'quotes', 1, now(), now())`;
    t.cat++;
  }
}

main()
  .then(() => sql.end())
  .catch(async (e) => {
    console.error("[seed-oman] FAILED:", e.message);
    await sql.end();
    process.exit(1);
  });
