import postgres from "postgres";

// Fills every standard public ad slot with an AkarProMax house campaign that
// uses the luxury property photos in public/ads/house/. Idempotent: re-running
// refreshes the same rows (ON CONFLICT DO UPDATE), and existing AkarProMax
// house campaigns that still use plain SVG data-URIs are switched to photos.

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

// The professional real-estate photos the v1 package displayed on its pages
// (Pexels, hotlinked exactly as v1 did). The hero uses a higher-resolution
// rendition of the same photo.
const PHOTOS = [
  "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?w=1200",
  "https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?w=1200",
  "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?w=1200",
  "https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?w=800",
];
const HERO_PHOTO = "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?w=1600";

const FILLS = [
  {
    id: "house-fill-hero", placement: "HERO", photo: HERO_PHOTO, targetUrl: "/properties",
    titleAr: "اكتشف العقارات الفاخرة", titleEn: "Discover Premium Properties", titleTr: "Premium Gayrimenkulleri Keşfedin",
    descAr: "تصفح آلاف العقارات المميزة للبيع والإيجار على عقار بروماكس", descEn: "Browse thousands of premium listings for sale and rent on AkarProMax", descTr: "AkarProMax'te binlerce premium ilanı keşfedin",
    ctaAr: "تصفح الآن", ctaEn: "Browse now", ctaTr: "Şimdi göz at",
  },
  {
    id: "house-fill-left-01", placement: "LEFT_01", photo: PHOTOS[1], targetUrl: "/properties",
    titleAr: "عقارك القادم هنا", titleEn: "Your next property is here", titleTr: "Bir sonraki mülkünüz burada",
    descAr: "فلل وشقق وأراضٍ مختارة بعناية", descEn: "Hand-picked villas, apartments and land", descTr: "Özenle seçilmiş villalar, daireler ve arsalar",
    ctaAr: "اكتشف", ctaEn: "Explore", ctaTr: "Keşfet",
  },
  {
    id: "house-fill-left-02", placement: "LEFT_02", photo: PHOTOS[2], targetUrl: "/advertise",
    titleAr: "أعلن عن عقارك", titleEn: "Advertise your property", titleTr: "Mülkünüzün reklamını yapın",
    descAr: "مساحات إعلانية تصل لعملائك المستهدفين", descEn: "Ad spaces that reach your target customers", descTr: "Hedef kitlenize ulaşan reklam alanları",
    ctaAr: "اعلن معنا", ctaEn: "Advertise", ctaTr: "Reklam ver",
  },
  {
    id: "house-fill-right-01", placement: "RIGHT_01", photo: PHOTOS[3], targetUrl: "/auctions",
    titleAr: "مزادات عقارية موثوقة", titleEn: "Trusted property auctions", titleTr: "Güvenilir emlak müzayedeleri",
    descAr: "شارك في مزادات تديرها جهات معتمدة", descEn: "Join auctions run by verified organizers", descTr: "Onaylı organizatörlerin müzayedelerine katılın",
    ctaAr: "المزادات", ctaEn: "Auctions", ctaTr: "Müzayedeler",
  },
  {
    id: "house-fill-right-02", placement: "RIGHT_02", photo: PHOTOS[0], targetUrl: "/offices",
    titleAr: "مكاتب عقارية معتمدة", titleEn: "Verified real-estate offices", titleTr: "Onaylı emlak ofisleri",
    descAr: "تعامل مع أفضل المكاتب في منطقتك", descEn: "Work with the best offices in your area", descTr: "Bölgenizdeki en iyi ofislerle çalışın",
    ctaAr: "المكاتب", ctaEn: "Offices", ctaTr: "Ofisler",
  },
  {
    id: "house-fill-bottom-01", placement: "BOTTOM_01", photo: PHOTOS[1], targetUrl: "/register",
    titleAr: "انضم إلى عقار بروماكس", titleEn: "Join AkarProMax", titleTr: "AkarProMax'e katılın",
    descAr: "المنصة العقارية الرقمية الشاملة — سجّل مجاناً", descEn: "The complete digital real-estate platform — sign up free", descTr: "Eksiksiz dijital emlak platformu — ücretsiz kaydolun",
    ctaAr: "سجّل الآن", ctaEn: "Sign up", ctaTr: "Kaydol",
  },
  {
    id: "house-fill-bottom-02", placement: "BOTTOM_02", photo: PHOTOS[2], targetUrl: "/services",
    titleAr: "سوق الخدمات العقارية", titleEn: "Property services market", titleTr: "Emlak hizmetleri pazarı",
    descAr: "محترفون موثوقون لكل خدمات عقارك", descEn: "Trusted professionals for every property service", descTr: "Her emlak hizmeti için güvenilir uzmanlar",
    ctaAr: "اطلب خدمة", ctaEn: "Request a service", ctaTr: "Hizmet isteyin",
  },
  {
    id: "house-fill-bottom-03", placement: "BOTTOM_03", photo: PHOTOS[3], targetUrl: "/tools",
    titleAr: "أدوات هندسية مجانية", titleEn: "Free engineering tools", titleTr: "Ücretsiz mühendislik araçları",
    descAr: "حاسبات مساحة وخرسانة وتحويل إحداثيات", descEn: "Area and concrete calculators, coordinate tools", descTr: "Alan ve beton hesaplayıcılar, koordinat araçları",
    ctaAr: "جرّب الآن", ctaEn: "Try now", ctaTr: "Şimdi dene",
  },
];

function campaignRow(f) {
  return {
    id: f.id,
    internal_name: `AkarProMax Fill — ${f.placement}`,
    advertiser_name: "AkarProMax",
    campaign_type: "house",
    status: "active",
    media_type: "image",
    media_url: f.photo,
    channels: '["website"]',
    eyebrow_ar: "إعلان", eyebrow_en: "Ad", eyebrow_tr: "Reklam",
    title_ar: f.titleAr, title_en: f.titleEn, title_tr: f.titleTr,
    accent_ar: "AkarProMax", accent_en: "AkarProMax", accent_tr: "AkarProMax",
    description_ar: f.descAr, description_en: f.descEn, description_tr: f.descTr,
    cta_ar: f.ctaAr, cta_en: f.ctaEn, cta_tr: f.ctaTr,
    target_url: f.targetUrl,
    countries: "[]", cities: "[]", languages: '["ar","en","tr"]', devices: '["desktop","mobile","tablet"]',
    priority: 1, weight: 4, start_at: null, end_at: null,
    section_scopes: '["global"]', page_types: "[]",
    placements: JSON.stringify([f.placement]),
    domains: "[]", region_ids: "[]", district_ids: "[]",
    latitude: null, longitude: null, radius_km: null,
    target_all_countries: 1, target_all_regions: 1, target_all_cities: 1, target_all_districts: 1,
    entity_type: null, entity_ids: "[]", category_ids: "[]",
    property_types: "[]", service_categories: "[]", office_types: "[]", tool_categories: "[]",
    operating_systems: "[]", daily_start_time: null, daily_end_time: null,
    days_of_week: "[]", rotation_group: null,
    pricing_model: "house", price: 0, budget: 0, daily_budget: 0, spent_amount: 0,
    max_impressions: 0, max_clicks: 0, frequency_cap_per_user: 0, frequency_cap_period: "day",
    approval_status: "approved", is_active: 1, is_sponsored: 0, is_featured: 0, is_fallback: 1, is_global: 1,
    total_impressions: 0, total_unique_impressions: 0, total_clicks: 0, total_unique_clicks: 0, total_conversions: 0,
  };
}

async function run() {
  const client = postgres(url, { ssl: "require", prepare: false });
  try {
    for (const fill of FILLS) {
      const row = campaignRow(fill);
      const cols = Object.keys(row);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const updates = ["media_url", "title_ar", "title_en", "title_tr", "description_ar", "description_en", "description_tr", "cta_ar", "cta_en", "cta_tr", "target_url", "placements", "status", "is_active", "deleted_at"]
        .map((c) => (c === "deleted_at" ? "deleted_at = NULL" : `${c} = EXCLUDED.${c}`))
        .join(", ");
      await client.unsafe(
        `INSERT INTO ad_campaigns (${cols.join(", ")}) VALUES (${placeholders})
         ON CONFLICT (id) DO UPDATE SET ${updates}`,
        Object.values(row),
      );
    }
    console.log(`Upserted ${FILLS.length} photo fill campaigns`);

    const updated = await client.unsafe(
      `UPDATE ad_campaigns SET media_url = (ARRAY[$1, $2, $3, $4])[(abs(hashtext(id)) % 4) + 1]
       WHERE advertiser_name = 'AkarProMax' AND campaign_type = 'house'
         AND media_url LIKE 'data:image/svg+xml%'`,
      PHOTOS,
    );
    console.log(`Switched ${updated.count} existing SVG house campaigns to photos`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
