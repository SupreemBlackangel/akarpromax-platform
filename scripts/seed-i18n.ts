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

const TOOLS_KEYS: Array<{ key: string; value: Record<Locale, string> }> = [
  { key: "tools.pageTitle", value: { ar: "الأدوات الهندسية", en: "Engineering Tools", tr: "Mühendislik Araçları" } },
  { key: "tools.pageSubtitle", value: { ar: "أدوات احترافية للمهندسين والمساحين", en: "Professional tools for engineers and surveyors", tr: "Mühendisler ve ölçüm uzmanları için profesyonel araçlar" } },
  { key: "tools.land.title", value: { ar: "حدد أرضك", en: "Map My Land", tr: "Arazimi Belirle" } },
  { key: "tools.land.subtitle", value: { ar: "ارفع صورة/PDF الصك واستخرج الإحداثيات", en: "Upload deed image/PDF and extract coordinates", tr: "Tapu görselini/PDF yükleyin ve koordinatları çıkarın" } },
  { key: "tools.coords.title", value: { ar: "تحويل الإحداثيات", en: "Coordinate Converter", tr: "Koordinat Dönüştürücü" } },
  { key: "tools.coords.subtitle", value: { ar: "تحويل بين DD و DMS و DDM و UTM", en: "Convert between DD / DMS / DDM / UTM", tr: "DD / DMS / DDM / UTM arası dönüşüm" } },
  { key: "tools.area.title", value: { ar: "حساب المساحة", en: "Area Calculator", tr: "Alan Hesaplama" } },
  { key: "tools.area.subtitle", value: { ar: "حساب مساحة المضلعات والمثلثات والدوائر", en: "Calculate area of polygons, triangles, circles", tr: "Çokgenler, üçgenler, daireler alanı hesaplama" } },
  { key: "tools.pointsDxf.title", value: { ar: "نقاط ← DXF", en: "Points → DXF", tr: "Noktalar → DXF" } },
  { key: "tools.pointsDxf.subtitle", value: { ar: "ارفع ملف TXT وحوله إلى DXF", en: "Upload TXT file and convert to DXF", tr: "TXT dosyası yükleyin ve DXF'e dönüştürün" } },
  { key: "tools.pdfWord.title", value: { ar: "PDF ← Word", en: "PDF → Word", tr: "PDF → Word" } },
  { key: "tools.pdfWord.subtitle", value: { ar: "ارفع PDF أو صورة واحصل على مستند Word", en: "Upload PDF or image and get Word document", tr: "PDF veya görsel yükleyin ve Word belgesi alın" } },
  { key: "tools.calc.title", value: { ar: "الآلة الحاسبة", en: "Calculator", tr: "Hesap Makinesi" } },
  { key: "tools.calc.subtitle", value: { ar: "آلة حاسبة علمية مع سجل وذاكرة", en: "Scientific calculator with history and memory", tr: "Geçmiş ve hafızalı bilimsel hesap makinesi" } },
  { key: "tools.gate.loginRequired", value: { ar: "تسجيل الدخول مطلوب", en: "Login required", tr: "Giriş gerekli" } },
  { key: "tools.gate.forbidden", value: { ar: "ليس لديك صلاحية", en: "Access denied", tr: "Erişim reddedildi" } },
  { key: "tools.free", value: { ar: "مجاني", en: "Free", tr: "Ücretsiz" } },
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

  for (const item of TOOLS_KEYS) {
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
