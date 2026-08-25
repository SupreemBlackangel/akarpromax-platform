import postgres from "postgres";
import { randomUUID } from "crypto";

const url = process.env.DATABASE_URL ?? "";

function svgDataUri(svg: string) {
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

function heroSvg(title: string, subtitle: string, accent: string, bg1: string, bg2: string, width = 1200, height = 400) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg1}"/>
      <stop offset="100%" style="stop-color:${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${width * 0.08}" cy="${height * 0.12}" r="${height * 0.4}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
  <circle cx="${width * 0.92}" cy="${height * 0.88}" r="${height * 0.5}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
  <rect x="${width * 0.55}" y="${height * 0.15}" width="${width * 0.38}" height="${height * 0.7}" rx="20" fill="rgba(255,255,255,0.07)"/>
  <text x="${width * 0.07}" y="${height * 0.32}" font-family="Arial,sans-serif" font-size="${height * 0.11}" font-weight="bold" fill="white">${title}</text>
  <text x="${width * 0.07}" y="${height * 0.50}" font-family="Arial,sans-serif" font-size="${height * 0.055}" fill="rgba(255,255,255,0.8)">${subtitle}</text>
  <rect x="${width * 0.07}" y="${height * 0.60}" width="${width * 0.16}" height="${height * 0.12}" rx="${height * 0.06}" fill="${accent}"/>
  <text x="${width * 0.15}" y="${height * 0.695}" font-family="Arial,sans-serif" font-size="${height * 0.04}" font-weight="bold" fill="white" text-anchor="middle">اكتشف المزيد</text>
  <text x="${width * 0.74}" y="${height * 0.55}" font-family="Arial,sans-serif" font-size="${height * 0.18}" font-weight="bold" fill="rgba(255,255,255,0.12)" text-anchor="middle">AkarProMax</text>
</svg>`;
}

function sideSvg(title: string, stat: string, statLabel: string, bg1: string, bg2: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="225" viewBox="0 0 180 225">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${bg1}"/>
      <stop offset="100%" style="stop-color:${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="180" height="225" rx="12" fill="url(#bg)"/>
  <text x="90" y="45" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="white" text-anchor="middle">${title}</text>
  <rect x="25" y="65" width="130" height="80" rx="10" fill="rgba(255,255,255,0.1)"/>
  <text x="90" y="115" font-family="Arial,sans-serif" font-size="28" font-weight="bold" fill="#f59e0b" text-anchor="middle">${stat}</text>
  <text x="90" y="170" font-family="Arial,sans-serif" font-size="11" fill="rgba(255,255,255,0.7)" text-anchor="middle">${statLabel}</text>
  <rect x="30" y="195" width="120" height="20" rx="10" fill="rgba(255,255,255,0.2)"/>
  <text x="90" y="210" font-family="Arial,sans-serif" font-size="9" fill="white" text-anchor="middle">عرض التفاصيل</text>
</svg>`;
}

function bottomSvg(title: string, subtitle: string, bg1: string, bg2: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200" viewBox="0 0 600 200">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg1}"/>
      <stop offset="100%" style="stop-color:${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="200" rx="16" fill="url(#bg)"/>
  <circle cx="520" cy="40" r="80" fill="rgba(255,255,255,0.05)"/>
  <text x="40" y="65" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="white">${title}</text>
  <text x="40" y="105" font-family="Arial,sans-serif" font-size="15" fill="rgba(255,255,255,0.75)">${subtitle}</text>
  <rect x="40" y="135" width="150" height="38" rx="19" fill="#f59e0b"/>
  <text x="115" y="160" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="white" text-anchor="middle">سجّل الآن</text>
  <text x="460" y="90" font-family="Arial,sans-serif" font-size="48" fill="rgba(255,255,255,0.1)">AkarProMax</text>
</svg>`;
}

/* ---------- Campaign rows ---------- */

const campaigns = [
  // ── Hero campaigns (1200×400) ──
  {
    id: "hero-home-001",
    internal_name: "Home Hero — AkarProMax",
    section_scopes: '["global"]',
    page_types: '["home"]',
    placements: '["HERO"]',
    media_url: svgDataUri(heroSvg("مرحباً بك في AkarProMax", "المنصة الأولى للعقارات والخدمات الهندسية", "#f59e0b", "#08265b", "#1672e8")),
    title_ar: "مرحباً بك في AkarProMax",
    description_ar: "اكتشف عقارات للبيع والإيجار وخدمات هندسية في مكان واحد",
    cta_ar: "ابدأ الآن",
    target_url: "/",
    priority: 3, weight: 10,
  },
  {
    id: "hero-services-001",
    internal_name: "Services Hero",
    section_scopes: '["services","global"]',
    page_types: '["services"]',
    placements: '["HERO"]',
    media_url: svgDataUri(heroSvg("خدمات عقارية متكاملة", "استشارات · تقييم · إدارة · تسويق", "#f59e0b", "#08265b", "#1672e8")),
    title_ar: "خدمات عقارية متكاملة",
    description_ar: "استكشف أفضل المكاتب الهندسية والاستشارية في منطقتك",
    cta_ar: "اكتشف الخدمات",
    target_url: "/services",
    priority: 3, weight: 10,
  },
  {
    id: "hero-properties-001",
    internal_name: "Properties Hero",
    section_scopes: '["properties","global"]',
    page_types: '["properties"]',
    placements: '["HERO"]',
    media_url: svgDataUri(heroSvg("عقارات للبيع والإيجار", "آلاف العقارات في جميع أنحاء المملكة", "#d97706", "#0b2854", "#1769ff")),
    title_ar: "عقارات للبيع والإيجار",
    description_ar: "تصفح آلاف العقارات في جميع المناطق",
    cta_ar: "تصفح العقارات",
    target_url: "/properties",
    priority: 3, weight: 10,
  },
  {
    id: "hero-tools-001",
    internal_name: "Tools Hero",
    section_scopes: '["tools","global"]',
    page_types: '["tools"]',
    placements: '["HERO"]',
    media_url: svgDataUri(heroSvg("أدوات هندسية متقدمة", "حاسبات · مخططات · أدوات احترافية", "#10b981", "#064e3b", "#10b981")),
    title_ar: "أدوات هندسية متقدمة",
    description_ar: "حاسبات مساحة وخرسانة وتحويل إحداثيات مجانية",
    cta_ar: "جرّب الآن",
    target_url: "/tools",
    priority: 3, weight: 10,
  },

  // ── Side rail campaigns (180×225) ──
  {
    id: "side-home-001",
    internal_name: "Home Side — Featured",
    section_scopes: '["global"]',
    page_types: '["home"]',
    placements: '["LEFT_01","RIGHT_01"]',
    media_url: svgDataUri(sideSvg("عقارات مميزة", "5000+", "عقار مسجل", "#08265b", "#1672e8")),
    title_ar: "عقارات مميزة",
    description_ar: "أكثر من 5000 عقار مسجل في المنصة",
    cta_ar: "عرض التفاصيل",
    target_url: "/properties",
    priority: 2, weight: 8,
  },
  {
    id: "side-home-002",
    internal_name: "Home Side — Offices",
    section_scopes: '["global"]',
    page_types: '["home"]',
    placements: '["LEFT_02","RIGHT_02"]',
    media_url: svgDataUri(sideSvg("مكاتب عقارية", "200+", "مكتب مسجل", "#7c3aed", "#a855f7")),
    title_ar: "مكاتب عقارية",
    description_ar: "more than 200 مكتب عقاري موثوق",
    cta_ar: "اكتشف المكاتب",
    target_url: "/offices",
    priority: 2, weight: 8,
  },
  {
    id: "side-properties-001",
    internal_name: "Properties Side — Premium",
    section_scopes: '["properties","global"]',
    page_types: '["properties"]',
    placements: '["LEFT_01","RIGHT_01"]',
    media_url: svgDataUri(sideSvg("عقارات VIP", "1200+", "عميل سعيد", "#08265b", "#1672e8")),
    title_ar: "عقارات VIP",
    description_ar: "فرص استثمارية حصرية",
    cta_ar: "عرض العروض",
    target_url: "/properties",
    priority: 2, weight: 8,
  },
  {
    id: "side-properties-002",
    internal_name: "Properties Side — Auctions",
    section_scopes: '["properties","global"]',
    page_types: '["properties"]',
    placements: '["LEFT_02","RIGHT_02"]',
    media_url: svgDataUri(sideSvg("مزادات عقارية", "جديد", "فرص لاتعوّر", "#b91c1c", "#ef4444")),
    title_ar: "مزادات عقارية",
    description_ar: "مزادات حية بأفضل الأسعار",
    cta_ar: "تابع المزادات",
    target_url: "/auctions",
    priority: 2, weight: 8,
  },
  {
    id: "side-services-001",
    internal_name: "Services Side — Top Rated",
    section_scopes: '["services","global"]',
    page_types: '["services"]',
    placements: '["LEFT_01","RIGHT_01"]',
    media_url: svgDataUri(sideSvg("أفضل المكاتب", "4.9", "تقييم العملاء", "#08265b", "#1672e8")),
    title_ar: "أفضل المكاتب",
    description_ar: "تقييم 4.9 من العملاء",
    cta_ar: "شاهد التقييمات",
    target_url: "/services",
    priority: 2, weight: 8,
  },
  {
    id: "side-services-002",
    internal_name: "Services Side — Free Consultation",
    section_scopes: '["services","global"]',
    page_types: '["services"]',
    placements: '["LEFT_02","RIGHT_02"]',
    media_url: svgDataUri(sideSvg("استشارة مجانية", "مجاناً", "احصل على استشارة", "#064e3b", "#10b981")),
    title_ar: "استشارة مجانية",
    description_ar: "احصل على استشارة عقارية مجانية",
    cta_ar: "احجز الآن",
    target_url: "/services",
    priority: 2, weight: 8,
  },

  // ── Bottom campaigns (600×200) ──
  {
    id: "bottom-home-001",
    internal_name: "Home Bottom — Community",
    section_scopes: '["global"]',
    page_types: '["home"]',
    placements: '["BOTTOM_01"]',
    media_url: svgDataUri(bottomSvg("انضم لأكبر مجتمع عقاري", "شارك خبراتك واحصل على فرص حصرية", "#08265b", "#1672e8")),
    title_ar: "انضم لأكبر مجتمع عقاري",
    description_ar: "شارك خبراتك واحصل على فرص حصرية",
    cta_ar: "سجل الآن",
    target_url: "/register",
    priority: 2, weight: 7,
  },
  {
    id: "bottom-home-002",
    internal_name: "Home Bottom — Tools",
    section_scopes: '["global"]',
    page_types: '["home"]',
    placements: '["BOTTOM_02"]',
    media_url: svgDataUri(bottomSvg("أدوات مجانية للمهندسين", "حاسبات هندسية وخطط مشاريع", "#064e3b", "#10b981")),
    title_ar: "أدوات مجانية للمهندسين",
    description_ar: "حاسبات هندسية وخطط مشاريع مجانية",
    cta_ar: "استخدم الأدوات",
    target_url: "/tools",
    priority: 2, weight: 7,
  },
  {
    id: "bottom-home-003",
    internal_name: "Home Bottom — News",
    section_scopes: '["global"]',
    page_types: '["home"]',
    placements: '["BOTTOM_03"]',
    media_url: svgDataUri(bottomSvg("أخبار العقار", "تابع آخر أخبار السوق العقاري", "#7c3aed", "#ec4899")),
    title_ar: "أخبار العقار",
    description_ar: "تابع آخر أخبار السوق العقاري",
    cta_ar: "اقرأ المزيد",
    target_url: "/news",
    priority: 2, weight: 7,
  },
  {
    id: "bottom-properties-001",
    internal_name: "Properties Bottom — Auctions",
    section_scopes: '["properties","global"]',
    page_types: '["properties"]',
    placements: '["BOTTOM_01"]',
    media_url: svgDataUri(bottomSvg("مزادات عقارية مباشرة", "تابع المزادات وسجّل عروضك", "#b91c1c", "#ef4444")),
    title_ar: "مزادات عقارية مباشرة",
    description_ar: "تابع المزادات وسجّل عروضك",
    cta_ar: "شاهد المزادات",
    target_url: "/auctions",
    priority: 2, weight: 7,
  },
  {
    id: "bottom-properties-002",
    internal_name: "Properties Bottom — Add Listing",
    section_scopes: '["properties","global"]',
    page_types: '["properties"]',
    placements: '["BOTTOM_02"]',
    media_url: svgDataUri(bottomSvg("أضف عقارك مجاناً", "اعرض عقارك أمام آلاف الباحثين", "#08265b", "#1672e8")),
    title_ar: "أضف عقارك مجاناً",
    description_ar: "اعرض عقارك أمام آلاف الباحثين",
    cta_ar: "أضف عقارك",
    target_url: "/dashboard/properties/new",
    priority: 2, weight: 7,
  },
  {
    id: "bottom-services-001",
    internal_name: "Services Bottom — Register Office",
    section_scopes: '["services","global"]',
    page_types: '["services"]',
    placements: '["BOTTOM_01"]',
    media_url: svgDataUri(bottomSvg("سجّل مكتبك المجاني", "اعرض خدماتك لآلاف العملاء", "#7c3aed", "#a855f7")),
    title_ar: "سجّل مكتبك المجاني",
    description_ar: "اعرض خدماتك لآلاف العملاء",
    cta_ar: "سجّل الآن",
    target_url: "/register",
    priority: 2, weight: 7,
  },
];

/* ---------- Shared defaults ---------- */
const sharedDefaults = {
  advertiser_name: "AkarProMax",
  campaign_type: "house",
  status: "active",
  media_type: "image",
  channels: '["website"]',
  eyebrow_ar: "إعلان",
  eyebrow_en: "Ad",
  eyebrow_tr: "Reklam",
  accent_ar: "AkarProMax",
  accent_en: "AkarProMax",
  accent_tr: "AkarProMax",
  title_en: "",
  title_tr: "",
  description_en: "",
  description_tr: "",
  cta_en: "Discover",
  cta_tr: "Keşfet",
  countries: "[]",
  cities: "[]",
  languages: '["ar","en","tr"]',
  devices: '["desktop","mobile"]',
  start_at: null,
  end_at: null,
  domains: "[]",
  region_ids: "[]",
  district_ids: "[]",
  latitude: null,
  longitude: null,
  radius_km: null,
  target_all_countries: 1,
  target_all_regions: 1,
  target_all_cities: 1,
  target_all_districts: 1,
  entity_type: null,
  entity_ids: "[]",
  category_ids: "[]",
  property_types: "[]",
  service_categories: "[]",
  office_types: "[]",
  tool_categories: "[]",
  operating_systems: "[]",
  daily_start_time: null,
  daily_end_time: null,
  days_of_week: "[]",
  rotation_group: null,
  pricing_model: "house",
  price: 0,
  budget: 0,
  daily_budget: 0,
  spent_amount: 0,
  max_impressions: 0,
  max_clicks: 0,
  frequency_cap_per_user: 0,
  frequency_cap_period: "day",
  approval_status: "approved",
  is_active: 1,
  is_sponsored: 0,
  is_featured: 0,
  is_fallback: 1,
  is_global: 1,
  total_impressions: 0,
  total_unique_impressions: 0,
  total_clicks: 0,
  total_unique_clicks: 0,
  total_conversions: 0,
};

/* ---------- Creative rows (linked to campaigns) — matches loadCreatives SELECT ---------- */
const creatives = campaigns.map((c, i) => ({
  campaign_id: c.id,
  media_type: "image",
  media_url: c.media_url,
  mobile_media_url: c.media_url,
  tablet_media_url: c.media_url,
  position: i,
  duration_seconds: 6,
  status: "active",
}));

/* ---------- Seed ---------- */

async function seedHeroAds() {
  const client = postgres(url, { ssl: "require", prepare: false });
  try {
    // 1) Upsert campaigns
    const cols = [
      "id", "internal_name", "advertiser_name", "campaign_type", "status",
      "media_type", "media_url", "channels",
      "eyebrow_ar", "eyebrow_en", "eyebrow_tr",
      "title_ar", "title_en", "title_tr",
      "accent_ar", "accent_en", "accent_tr",
      "description_ar", "description_en", "description_tr",
      "cta_ar", "cta_en", "cta_tr",
      "target_url", "countries", "cities", "languages", "devices",
      "priority", "weight", "start_at", "end_at",
      "section_scopes", "page_types", "placements", "domains", "region_ids", "district_ids",
      "latitude", "longitude", "radius_km",
      "target_all_countries", "target_all_regions", "target_all_cities", "target_all_districts",
      "entity_type", "entity_ids", "category_ids",
      "property_types", "service_categories", "office_types", "tool_categories",
      "operating_systems", "daily_start_time", "daily_end_time", "days_of_week", "rotation_group",
      "pricing_model", "price", "budget", "daily_budget", "spent_amount",
      "max_impressions", "max_clicks", "frequency_cap_per_user", "frequency_cap_period",
      "approval_status", "is_active", "is_sponsored", "is_featured", "is_fallback", "is_global",
      "total_impressions", "total_unique_impressions", "total_clicks", "total_unique_clicks", "total_conversions",
    ];

    for (const c of campaigns) {
      const full = { ...sharedDefaults, ...c };
      const vals = cols.map((k) => (full as Record<string, unknown>)[k] ?? null);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      await client.unsafe(
        `INSERT INTO ad_campaigns (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET
          media_url = EXCLUDED.media_url,
          title_ar = EXCLUDED.title_ar,
          description_ar = EXCLUDED.description_ar,
          cta_ar = EXCLUDED.cta_ar,
          placements = EXCLUDED.placements,
          section_scopes = EXCLUDED.section_scopes,
          page_types = EXCLUDED.page_types,
          priority = EXCLUDED.priority,
          weight = EXCLUDED.weight`,
        vals as Parameters<typeof client.unsafe>[1],
      );
    }
    console.log(`Upserted ${campaigns.length} hero/side/bottom campaigns`);

    // 2) Replace creatives for these campaigns
    const campaignIds = campaigns.map((c) => c.id);
    await client.unsafe(
      `DELETE FROM ad_creatives WHERE campaign_id = ANY($1)`,
      [campaignIds],
    );
    for (const cr of creatives) {
      const id = randomUUID();
      await client.unsafe(
        `INSERT INTO ad_creatives (id, campaign_id, media_type, media_url, mobile_media_url, tablet_media_url, position, duration_seconds, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, cr.campaign_id, cr.media_type, cr.media_url, cr.mobile_media_url, cr.tablet_media_url, cr.position, cr.duration_seconds, cr.status],
      );
    }
    console.log(`Upserted ${creatives.length} creatives`);
  } finally {
    await client.end();
  }
}

seedHeroAds().catch((err) => {
  console.error("Hero ad seed failed:", err);
  process.exit(1);
});
