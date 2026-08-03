import { getRuntimeDb } from "@/lib/runtime-db";
import { createCategory, createListing, createRequest } from "@/lib/services/core";
import { upsertTranslations, invalidateTranslationCache } from "@/lib/i18n/db";
import { LOCALES } from "@/lib/i18n/keys";

const ADMIN = "admin@localhost.akarpromax";
const COUNTRY = "OM";
const CITY = "om-muscat";

const CATEGORIES: Array<{ code: string; nameAr: string; nameEn: string; nameTr: string; sortOrder: number }> = [
  { code: "cleaning", nameAr: "تنظيف", nameEn: "Cleaning", nameTr: "Temizlik", sortOrder: 1 },
  { code: "maintenance", nameAr: "صيانة", nameEn: "Maintenance", nameTr: "Bakım", sortOrder: 2 },
  { code: "moving", nameAr: "نقل أثاث", nameEn: "Moving", nameTr: "Taşıma", sortOrder: 3 },
  { code: "renovation", nameAr: "تشطيب وترميم", nameEn: "Renovation", nameTr: "Yenileme", sortOrder: 4 },
  { code: "home-services", nameAr: "خدمات منزلية", nameEn: "Home services", nameTr: "Ev hizmetleri", sortOrder: 5 },
];

const LISTINGS: Array<{ categoryCode: string; titleKey: string; descriptionKey: string; price: number; unit: string }> = [
  { categoryCode: "cleaning", titleKey: "services.seed.listing1.title", descriptionKey: "services.seed.listing1.desc", price: 15, unit: "hour" },
  { categoryCode: "maintenance", titleKey: "services.seed.listing2.title", descriptionKey: "services.seed.listing2.desc", price: 50, unit: "visit" },
  { categoryCode: "moving", titleKey: "services.seed.listing3.title", descriptionKey: "services.seed.listing3.desc", price: 120, unit: "fixed" },
];

const REQUESTS: Array<{ categoryCode: string; titleKey: string; descriptionKey: string; budgetMin: number; budgetMax: number }> = [
  { categoryCode: "cleaning", titleKey: "services.seed.request1.title", descriptionKey: "services.seed.request1.desc", budgetMin: 10, budgetMax: 25 },
  { categoryCode: "renovation", titleKey: "services.seed.request2.title", descriptionKey: "services.seed.request2.desc", budgetMin: 500, budgetMax: 2000 },
];

const SEED_KEYS: Array<{ key: string; value: Record<(typeof LOCALES)[number], string> }> = [
  { key: "services.seed.listing1.title", value: { ar: "خدمة تنظيف شاملة", en: "Full cleaning service", tr: "Kapsamlı temizlik hizmeti" } },
  { key: "services.seed.listing1.desc", value: { ar: "تنظيف منزلي أو مكتبي حسب الطلب.", en: "Home or office cleaning on demand.", tr: "İsteğe göre ev veya ofis temizliği." } },
  { key: "services.seed.listing2.title", value: { ar: "صيانة عامة للمنزل", en: "General home maintenance", tr: "Genel ev bakımı" } },
  { key: "services.seed.listing2.desc", value: { ar: "إصلاحات كهربائية وسباكة بسيطة.", en: "Simple electrical and plumbing repairs.", tr: "Basit elektrik ve sıhhi tesisat onarımları." } },
  { key: "services.seed.listing3.title", value: { ar: "نقل أثاث بأمان", en: "Safe furniture moving", tr: "Güvenli mobilya taşıma" } },
  { key: "services.seed.listing3.desc", value: { ar: "نقل آمن مع فريق مدرب ومعدات.", en: "Safe moving with trained crew and equipment.", tr: "Eğitimli ekip ve ekipmanla güvenli taşıma." } },
  { key: "services.seed.request1.title", value: { ar: "أبحث عن عامل تنظيف أسبوعي", en: "Looking for a weekly cleaner", tr: "Haftalık temizlikçi arıyorum" } },
  { key: "services.seed.request1.desc", value: { ar: "شقة 3 غرف في مسقط.", en: "3-bedroom flat in Muscat.", tr: "Maskat'ta 3 yatak odalı daire." } },
  { key: "services.seed.request2.title", value: { ar: "تشطيب شقة جديدة", en: "Renovating a new flat", tr: "Yeni daire yenileme" } },
  { key: "services.seed.request2.desc", value: { ar: "تشطيب كامل مع مواد أولية.", en: "Full renovation with materials.", tr: "Malzemelerle kapsamlı yenileme." } },
  { key: "services.category.cleaning", value: { ar: "تنظيف", en: "Cleaning", tr: "Temizlik" } },
  { key: "services.category.maintenance", value: { ar: "صيانة", en: "Maintenance", tr: "Bakım" } },
  { key: "services.category.moving", value: { ar: "نقل أثاث", en: "Moving", tr: "Taşıma" } },
  { key: "services.category.renovation", value: { ar: "تشطيب وترميم", en: "Renovation", tr: "Yenileme" } },
  { key: "services.category.home-services", value: { ar: "خدمات منزلية", en: "Home services", tr: "Ev hizmetleri" } },
];

async function main() {
  const db = await getRuntimeDb();

  const i18nEntries: Array<{ key: string; locale: (typeof LOCALES)[number]; value: string }> = [];
  for (const item of SEED_KEYS) {
    for (const locale of LOCALES) i18nEntries.push({ key: item.key, locale, value: item.value[locale] });
  }
  const { created } = await upsertTranslations(i18nEntries, { userId: "system-seed", ip: "seed" });
  invalidateTranslationCache();
  console.log(`i18n seed: ${created} entries.`);

  const categoryIds = new Map<string, string>();
  for (const category of CATEGORIES) {
    const existing = await db
      .prepare("SELECT id FROM service_categories WHERE country_code = ?1 AND code = ?2")
      .bind(COUNTRY, category.code)
      .first<{ id: string }>();
    if (existing) {
      categoryIds.set(category.code, existing.id);
      continue;
    }
    const id = await createCategory(
      { countryCode: COUNTRY, code: category.code, sortOrder: category.sortOrder },
      { userId: "system-seed", ip: "seed" },
    );
    categoryIds.set(category.code, id);
  }
  console.log(`categories: ${categoryIds.size} ensured.`);

  for (const listing of LISTINGS) {
    const categoryId = categoryIds.get(listing.categoryCode);
    if (!categoryId) continue;
    await createListing(
      {
        providerUserId: ADMIN,
        categoryId,
        countryCode: COUNTRY,
        cityId: CITY,
        titleKey: listing.titleKey,
        descriptionKey: listing.descriptionKey,
        price: listing.price,
        currency: "OMR",
        unit: listing.unit,
        status: "active",
        tags: [listing.categoryCode],
        latitude: 23.588,
        longitude: 58.3829,
      },
      { userId: "system-seed", ip: "seed" },
    );
  }
  console.log(`listings: ${LISTINGS.length} ensured.`);

  for (const request of REQUESTS) {
    const categoryId = categoryIds.get(request.categoryCode);
    if (!categoryId) continue;
    await createRequest(
      {
        customerUserId: ADMIN,
        categoryId,
        countryCode: COUNTRY,
        cityId: CITY,
        titleKey: request.titleKey,
        descriptionKey: request.descriptionKey,
        budgetMin: request.budgetMin,
        budgetMax: request.budgetMax,
        currency: "OMR",
        latitude: 23.588,
        longitude: 58.3829,
      },
      { userId: "system-seed", ip: "seed" },
    );
  }
  console.log(`requests: ${REQUESTS.length} ensured.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
