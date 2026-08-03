import { translations } from "@/src/data/translations";
import type { Locale } from "@/src/types/site";
import { LOCALES, flattenLeaf } from "@/lib/i18n/keys";
import { upsertTranslations, invalidateTranslationCache } from "@/lib/i18n/db";
import { getRuntimeDb } from "@/lib/runtime-db";

const SERVICES_KEYS: Array<{ key: string; value: Record<Locale, string> }> = [
  { key: "services.marketplaceTitle", value: { ar: "سوق الخدمات", en: "Services Marketplace", tr: "Hizmetler Pazarı" } },
  { key: "services.marketplaceSubtitle", value: { ar: "اطلب الخدمات أو اعرضها في منطقتك", en: "Request or offer services near you", tr: "Bölgenizde hizmet isteyin veya sunun" } },
  { key: "services.browseListings", value: { ar: "تصفح الخدمات", en: "Browse listings", tr: "İlanlara göz at" } },
  { key: "services.postRequest", value: { ar: "أضف طلبًا", en: "Post a request", tr: "Talep ekle" } },
  { key: "services.listings", value: { ar: "الخدمات", en: "Listings", tr: "İlanlar" } },
  { key: "services.requests", value: { ar: "الطلبات", en: "Requests", tr: "Talepler" } },
  { key: "services.offers", value: { ar: "العروض", en: "Offers", tr: "Teklifler" } },
  { key: "services.orders", value: { ar: "الأوامر", en: "Orders", tr: "Siparişler" } },
  { key: "services.reviews", value: { ar: "التقييمات", en: "Reviews", tr: "Değerlendirmeler" } },
  { key: "services.disputes", value: { ar: "النزاعات", en: "Disputes", tr: "Anlaşmazlıklar" } },
  { key: "services.messages", value: { ar: "الرسائل", en: "Messages", tr: "Mesajlar" } },
  { key: "services.price", value: { ar: "السعر", en: "Price", tr: "Fiyat" } },
  { key: "services.budget", value: { ar: "الميزانية", en: "Budget", tr: "Bütçe" } },
  { key: "services.category", value: { ar: "التصنيف", en: "Category", tr: "Kategori" } },
  { key: "services.city", value: { ar: "المدينة", en: "City", tr: "Şehir" } },
  { key: "services.country", value: { ar: "الدولة", en: "Country", tr: "Ülke" } },
  { key: "services.status", value: { ar: "الحالة", en: "Status", tr: "Durum" } },
  { key: "services.createdAt", value: { ar: "تاريخ الإنشاء", en: "Created", tr: "Oluşturulma" } },
  { key: "services.provider", value: { ar: "مقدم الخدمة", en: "Provider", tr: "Sağlayıcı" } },
  { key: "services.customer", value: { ar: "العميل", en: "Customer", tr: "Müşteri" } },
  { key: "services.title", value: { ar: "العنوان", en: "Title", tr: "Başlık" } },
  { key: "services.description", value: { ar: "الوصف", en: "Description", tr: "Açıklama" } },
  { key: "services.actions", value: { ar: "إجراءات", en: "Actions", tr: "İşlemler" } },
  { key: "services.loading", value: { ar: "جارٍ التحميل…", en: "Loading…", tr: "Yükleniyor…" } },
  { key: "services.empty", value: { ar: "لا توجد بيانات بعد", en: "No data yet", tr: "Henüz veri yok" } },
  { key: "services.error", value: { ar: "حدث خطأ أثناء جلب البيانات", en: "Failed to load data", tr: "Veri yüklenirken hata" } },
  { key: "services.save", value: { ar: "حفظ", en: "Save", tr: "Kaydet" } },
  { key: "services.cancel", value: { ar: "إلغاء", en: "Cancel", tr: "İptal" } },
];

async function main() {
  const entries: Array<{ key: string; locale: Locale; value: string }> = [];

  for (const locale of LOCALES) {
    const source = translations[locale] as unknown as Record<string, unknown>;
    const flat = flattenLeaf(source, "home");
    for (const [key, value] of Object.entries(flat)) {
      if (typeof value === "string") entries.push({ key, locale, value });
    }
  }

  for (const item of SERVICES_KEYS) {
    for (const locale of LOCALES) {
      entries.push({ key: item.key, locale, value: item.value[locale] });
    }
  }

  const { created, updated } = await upsertTranslations(entries, {
    userId: "system-seed",
    ip: "seed",
  });
  invalidateTranslationCache();
  console.log(`Seeded i18n: ${created} created, ${updated} updated (${entries.length} entries).`);

  const db = await getRuntimeDb();
  const ns = await db.prepare("SELECT COUNT(*) AS c FROM i18n_namespaces").first<{ c: number }>();
  const keys = await db.prepare("SELECT COUNT(*) AS c FROM i18n_keys").first<{ c: number }>();
  const tr = await db.prepare("SELECT COUNT(*) AS c FROM i18n_translations").first<{ c: number }>();
  console.log(`post-check via runtime-db: ns=${ns?.c} keys=${keys?.c} translations=${tr?.c}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
