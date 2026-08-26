/**
 * AkarProMax — live news ticker seed.
 *
 * Inserts 4 real trilingual (ar/en/tr) platform headlines as active `news`
 * rows (global scope) so the public WEBSITE_TICKER serves live content instead
 * of the static fallback strings. One headline links to /properties.
 *
 * Idempotent: a headline is skipped when a row with the same title_ar already
 * exists. Connects through the runtime DB seam (lib/runtime-db), so it works
 * against the configured provider (postgres via DATABASE_URL, mysql, or d1).
 *
 * Safety: refuses NODE_ENV=production unless SEED_NEWS_CONFIRM=true is set
 * explicitly, mirroring the opt-in convention of the other seed scripts.
 *
 * Run: tsx scripts/seed-news.ts   (or: node --env-file=.env --import tsx scripts/seed-news.ts)
 */

const SCRIPT = "seed-news";

if (process.env.NODE_ENV === "production" && process.env.SEED_NEWS_CONFIRM !== "true") {
  console.error(`[${SCRIPT}] NODE_ENV=production — set SEED_NEWS_CONFIRM=true to seed news rows in production.`);
  process.exit(1);
}

type SeedNewsItem = {
  titleAr: string;
  titleEn: string;
  titleTr: string;
  linkUrl: string | null;
  priority: number;
};

const ITEMS: SeedNewsItem[] = [
  {
    titleAr: "منصة عقار بروماكس تنطلق رسميًا — تصفح العقارات والخدمات والمزادات في مكان واحد",
    titleEn: "AkarProMax is officially live — browse properties, services and auctions in one place",
    titleTr: "AkarProMax resmen yayında — gayrimenkul, hizmet ve açık artırmalara tek yerden göz atın",
    linkUrl: "/properties",
    priority: 100,
  },
  {
    titleAr: "سوق الخدمات العقارية: اطلب خدمات التنظيف والصيانة والنقل من مزودين موثوقين",
    titleEn: "Services marketplace: request cleaning, maintenance and moving from trusted providers",
    titleTr: "Hizmet pazarı: temizlik, bakım ve taşıma hizmetlerini güvenilir sağlayıcılardan talep edin",
    linkUrl: null,
    priority: 200,
  },
  {
    titleAr: "أدوات هندسية مجانية: تحديد الأراضي من الصكوك وتحويل الإحداثيات وحساب المساحات",
    titleEn: "Free engineering tools: map land from deeds, convert coordinates and calculate areas",
    titleTr: "Ücretsiz mühendislik araçları: tapudan arazi belirleme, koordinat dönüştürme ve alan hesaplama",
    linkUrl: null,
    priority: 300,
  },
  {
    titleAr: "تطبيق AkarPromax Office للمكاتب العقارية متصل بالمنصة لمزامنة العروض مباشرة",
    titleEn: "The AkarPromax Office app for real estate agencies syncs listings directly with the platform",
    titleTr: "Emlak ofisleri için AkarPromax Office uygulaması ilanları platformla anında senkronize ediyor",
    linkUrl: null,
    priority: 400,
  },
];

async function main() {
  const { getRuntimeDb } = await import("@/lib/runtime-db");
  const db = await getRuntimeDb();

  let created = 0;
  let skipped = 0;
  for (const item of ITEMS) {
    const existing = await db
      .prepare("SELECT id FROM news WHERE title_ar = ?1 LIMIT 1")
      .bind(item.titleAr)
      .first<{ id: string }>();
    if (existing) {
      skipped += 1;
      continue;
    }
    await db
      .prepare(
        `INSERT INTO news
          (id, scope, country_code, city_id, title_ar, title_en, title_tr, link_url, status, priority)
         VALUES (?1, 'global', NULL, NULL, ?2, ?3, ?4, ?5, 'active', ?6)`,
      )
      .bind(crypto.randomUUID(), item.titleAr, item.titleEn, item.titleTr, item.linkUrl, item.priority)
      .run();
    created += 1;
  }

  console.log(`[${SCRIPT}] done — created ${created}, skipped ${skipped} (already present).`);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] failed:`, error);
  process.exit(1);
});
