#!/usr/bin/env node
/**
 * Fill the services hub's ad slots with the platform's own explanation of the
 * page.
 *
 * The nine slots on /services had no campaigns at all, so every one of them
 * drew the grey "مساحة إعلانية / + اعلن هنا" placeholder — the first screen a
 * visitor saw was an empty rectangle the height of the viewport. These are
 * house campaigns (campaign_type "house", pricing_model "house",
 * is_fallback 1): a real paid campaign targeting the same slot outranks them
 * on priority, so they only ever show where nothing else would.
 *
 * The drawings are in public/ads/services/*.svg and carry no small text —
 * the frame prints the Arabic copy from these rows underneath (rails) or over
 * the image (hero), so the explanation lives in the copy and stays editable
 * from the admin without touching an asset.
 *
 * Idempotent: every row is written by id with ON CONFLICT DO UPDATE, so a
 * second run refreshes the same nine rows and inserts nothing new.
 *
 *   node scripts/seed-ads-services-house.mjs --dry-run
 *   node scripts/seed-ads-services-house.mjs
 *
 * DATABASE_URL must be set. Run it on the server.
 */

import pg from "pg";

const DRY = process.argv.includes("--dry-run");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

/** One entry per slot on /services. `placement` is what the matcher compares. */
const FILLS = [
  {
    id: "house-services-hero",
    placement: "web_services_hero",
    media: "/ads/services/how-it-works.svg",
    target: "/service-requests/new",
    eyebrow: ["سوق الخدمات", "Services market", "Hizmet pazarı"],
    title: ["اطلب أي خدمة، وتصلك العروض", "Ask for a service, and the offers come to you", "Bir hizmet isteyin, teklifler size gelsin"],
    accent: ["مجاناً", "Free", "Ücretsiz"],
    description: [
      "انشر طلبك، يصلك عرض من أكثر من مزوّد موثوق في منطقتك، وتختار من يناسبك.",
      "Post your request, receive offers from several trusted providers in your area, and choose who suits you.",
      "Talebinizi yayınlayın, bölgenizdeki birden çok güvenilir sağlayıcıdan teklif alın ve size uyanı seçin.",
    ],
    cta: ["انشر طلبك", "Post a request", "Talep yayınla"],
  },
  {
    id: "house-services-left-01",
    placement: "web_services_side_left_01",
    media: "/ads/services/post-a-request.svg",
    target: "/service-requests/new",
    eyebrow: ["ثلاث خطوات", "Three steps", "Üç adım"],
    title: ["انشر طلبك واستقبل العروض", "Post a request, receive offers", "Talep yayınlayın, teklif alın"],
    accent: ["بلا وسيط", "No middleman", "Aracısız"],
    description: [
      "صف ما تحتاجه، حدّد ميزانيتك، وقارن العروض التي تصلك.",
      "Describe what you need, set your budget, and compare the offers you receive.",
      "İhtiyacınızı yazın, bütçenizi belirleyin ve gelen teklifleri karşılaştırın.",
    ],
    cta: ["ابدأ الآن", "Start now", "Şimdi başla"],
  },
  {
    id: "house-services-left-02",
    placement: "web_services_side_left_02",
    media: "/ads/services/categories.svg",
    target: "/services/catalog",
    eyebrow: ["التصنيفات", "Categories", "Kategoriler"],
    title: ["عشرة تصنيفات وأكثر من أربعين مهنة", "Ten categories, more than forty professions", "On kategori, kırktan fazla meslek"],
    accent: ["كلها هنا", "All here", "Hepsi burada"],
    description: [
      "صيانة وتنظيف ونقل وبناء وتشطيبات وهندسة وخدمات عقارية.",
      "Maintenance, cleaning, moving, building, finishing, engineering and property services.",
      "Bakım, temizlik, nakliye, inşaat, tadilat, mühendislik ve emlak hizmetleri.",
    ],
    cta: ["تصفّح التصنيفات", "Browse categories", "Kategorilere göz at"],
  },
  {
    id: "house-services-right-01",
    placement: "web_services_side_right_01",
    media: "/ads/services/verified-providers.svg",
    target: "/providers",
    eyebrow: ["موثوقية", "Trust", "Güven"],
    title: ["مزوّدون موثّقون بتقييمات حقيقية", "Verified providers, real ratings", "Doğrulanmış sağlayıcılar, gerçek puanlar"],
    accent: ["مراجَعون", "Reviewed", "İncelenmiş"],
    description: [
      "كل مزوّد يمرّ بمراجعة، وتقييمه يأتي ممّن أنجز لهم عملاً.",
      "Every provider is reviewed, and the ratings come from people they finished work for.",
      "Her sağlayıcı incelenir; puanlar iş tamamladığı kişilerden gelir.",
    ],
    cta: ["تصفّح المزوّدين", "Browse providers", "Sağlayıcılara göz at"],
  },
  {
    id: "house-services-right-02",
    placement: "web_services_side_right_02",
    media: "/ads/services/join-as-provider.svg",
    target: "/providers/apply",
    eyebrow: ["للمزوّدين", "For providers", "Sağlayıcılar için"],
    title: ["انضم واستقبل طلبات منطقتك", "Join, and receive your area's requests", "Katılın, bölgenizin taleplerini alın"],
    accent: ["مجاناً", "Free", "Ücretsiz"],
    description: [
      "أنشئ ملفك، اختر تصنيفاتك ومدينتك، وتصلك الطلبات المناسبة.",
      "Create your profile, choose your categories and city, and the right requests reach you.",
      "Profilinizi oluşturun, kategorilerinizi ve şehrinizi seçin; uygun talepler size ulaşsın.",
    ],
    cta: ["قدّم الآن", "Apply now", "Şimdi başvur"],
  },
  {
    id: "house-services-bottom-01",
    placement: "web_services_bottom_01",
    media: "/ads/services/how-it-works.svg",
    target: "/service-requests",
    eyebrow: ["الطلبات المفتوحة", "Open requests", "Açık talepler"],
    title: ["اطّلع على ما يطلبه الناس اليوم", "See what people are asking for today", "Bugün ne istendiğine bakın"],
    accent: ["مباشرة", "Live", "Canlı"],
    description: [
      "كل طلب منشور بميزانيته ومدينته، ومفتوح لعروض المزوّدين.",
      "Every published request carries its budget and its city, and is open to providers' offers.",
      "Yayınlanan her talep bütçesini ve şehrini taşır, sağlayıcı tekliflerine açıktır.",
    ],
    cta: ["تصفّح الطلبات", "Browse requests", "Taleplere göz at"],
  },
  {
    id: "house-services-bottom-02",
    placement: "web_services_bottom_02",
    media: "/ads/services/categories.svg",
    target: "/services/catalog",
    eyebrow: ["دليل المهن", "Profession directory", "Meslek rehberi"],
    title: ["ابحث عن المهنة التي تحتاجها", "Find the profession you need", "İhtiyacınız olan mesleği bulun"],
    accent: ["بالاسم", "By name", "Ada göre"],
    description: [
      "سباكة، كهرباء، تكييف، مساحة، تقييم عقاري وغيرها.",
      "Plumbing, electrics, air-conditioning, surveying, property valuation and more.",
      "Tesisat, elektrik, klima, harita, gayrimenkul değerleme ve daha fazlası.",
    ],
    cta: ["افتح الدليل", "Open the directory", "Rehberi aç"],
  },
  {
    id: "house-services-bottom-03",
    placement: "web_services_bottom_03",
    media: "/ads/services/join-as-provider.svg",
    target: "/providers/apply",
    eyebrow: ["انضم إلينا", "Join us", "Bize katılın"],
    title: ["وسّع عملك مع عقار بروماكس", "Grow your business with AkarProMax", "İşinizi AkarProMax ile büyütün"],
    accent: ["ابدأ اليوم", "Start today", "Bugün başla"],
    description: [
      "ملف واحد يضعك أمام كل من يطلب خدمتك في مدينتك.",
      "One profile puts you in front of everyone asking for your service in your city.",
      "Tek profil, şehrinizde hizmetinizi arayan herkesin karşısına çıkarır.",
    ],
    cta: ["أنشئ ملفك", "Create your profile", "Profilinizi oluşturun"],
  },
];

const COLUMNS = [
  "id", "internal_name", "advertiser_name", "campaign_type", "status", "media_type", "media_url",
  "channels", "eyebrow_ar", "eyebrow_en", "eyebrow_tr", "title_ar", "title_en", "title_tr",
  "accent_ar", "accent_en", "accent_tr", "description_ar", "description_en", "description_tr",
  "cta_ar", "cta_en", "cta_tr", "target_url", "countries", "cities", "languages", "devices",
  "priority", "weight", "section_scopes", "page_types", "placements",
  "target_all_countries", "target_all_regions", "target_all_cities", "target_all_districts",
  "pricing_model", "approval_status", "is_active", "is_fallback", "is_global",
];

function rowFor(fill) {
  return [
    fill.id,
    `AkarProMax Services — ${fill.placement}`,
    "AkarProMax",
    "house",
    "active",
    "image",
    fill.media,
    '["website"]',
    ...fill.eyebrow, ...fill.title, ...fill.accent, ...fill.description, ...fill.cta,
    fill.target,
    "[]", "[]", '["ar","en","tr"]', '["desktop","tablet","mobile"]',
    // A paid campaign for the same slot has the lower priority number and wins;
    // these only ever fill a slot nothing else wanted.
    900, 1,
    '["services","global"]', '["services"]', JSON.stringify([fill.placement]),
    1, 1, 1, 1,
    "house", "approved", 1, 1, 1,
  ];
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query("SET search_path = public, akarpromax");

let written = 0;
try {
  if (!DRY) await client.query("BEGIN");
  for (const fill of FILLS) {
    const values = rowFor(fill);
    if (values.length !== COLUMNS.length) {
      throw new Error(`${fill.id}: ${values.length} values for ${COLUMNS.length} columns`);
    }
    if (!DRY) {
      const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(", ");
      const updates = COLUMNS.filter((c) => c !== "id").map((c) => `${c} = EXCLUDED.${c}`).join(", ");
      await client.query(
        `INSERT INTO ad_campaigns (${COLUMNS.join(", ")}) VALUES (${placeholders})
         ON CONFLICT (id) DO UPDATE SET ${updates}, updated_at = CURRENT_TIMESTAMP`,
        values,
      );
    }
    written += 1;
    console.log(`  ${DRY ? "would write" : "wrote"}  ${fill.placement.padEnd(30)} ${fill.media}`);
  }
  if (!DRY) await client.query("COMMIT");
} catch (error) {
  if (!DRY) await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

console.log(DRY ? "\nDRY RUN — nothing was written" : "\ncommitted");
console.log(`  ${written} house campaign(s) for the services hub`);
