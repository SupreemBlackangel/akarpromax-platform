import mysql from "mysql2/promise";

const conn = await mysql.createConnection({ host: "localhost", port: 3306, user: "root", password: "root", database: "akarpromax", charset: "utf8mb4" });

const countries = JSON.stringify(["om"]);
const cities = JSON.stringify(["om-muscat"]);
const languages = JSON.stringify(["ar", "en", "tr"]);
const devices = JSON.stringify(["desktop", "tablet", "mobile"]);

const campaigns = [
  {
    id: crypto.randomUUID(),
    internal_name: "فيلا البحر — حملة عقارات عُمان",
    advertiser_name: "AkarPromax",
    campaign_type: "property",
    media: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
    tablet: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
    mobile: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
    section_scopes: JSON.stringify(["properties"]),
    page_types: JSON.stringify(["details", "listing", "home"]),
    placements: JSON.stringify(["property_after_gallery", "property_sidebar_top", "property_sidebar_middle", "property_below_price", "property_after_description", "property_before_similar", "property_sidebar_bottom"]),
    is_fallback: 0,
  },
  {
    id: crypto.randomUUID(),
    internal_name: "عقار بروماكس — إعلان الموقع",
    advertiser_name: "AkarPromax",
    campaign_type: "platform",
    media: "https://images.unsplash.com/photo-1560518883-ce09059eeffa",
    tablet: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde",
    mobile: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
    section_scopes: JSON.stringify(["home"]),
    page_types: JSON.stringify(["home"]),
    placements: JSON.stringify(["between_sections", "floating_bottom"]),
    is_fallback: 0,
  },
];

for (const c of campaigns) {
  await conn.execute(
    `INSERT INTO ad_campaigns
      (id, internal_name, advertiser_name, campaign_type, status, media_type,
       media_url, mobile_media_url, tablet_media_url, poster_url,
       eyebrow_ar, eyebrow_en, eyebrow_tr, title_ar, title_en, title_tr,
       accent_ar, accent_en, accent_tr, description_ar, description_en, description_tr,
       cta_ar, cta_en, cta_tr, target_url, countries, cities, languages, devices,
       priority, weight, start_at, end_at,
       section_scopes, page_types, placements,
       target_all_countries,
       approval_status, is_active, is_sponsored, is_featured, is_fallback, is_global)
     VALUES (?, ?, ?, ?, 'active', 'image',
       ?, ?, ?, NULL,
       'عقار مميز', 'Featured', 'Öne çıkan',
       'فيلا فاخرة للإيجار', 'Luxury villa for rent', 'Kiralık lüks villa',
       'بإطلالة بحرية', 'with sea view', 'deniz manzaralı',
       'فيلا حديثة بموقع مميز', 'A modern villa in a prime location', 'Merkezi konumda modern villa',
       'استكشف', 'Explore', 'Keşfet',
       'https://www.youtube.com/', ?, ?, ?, ?,
       10, 100, NULL, NULL,
       ?, ?, ?,
       0,
       'approved', 1, 1, 1, ?, 0)`,
    [
      c.id, c.internal_name, c.advertiser_name, c.campaign_type,
      c.media, c.mobile, c.tablet,
      countries, cities, languages, devices,
      c.section_scopes, c.page_types, c.placements,
      c.is_fallback,
    ],
  );
  console.log("seeded", c.internal_name, c.id);
}
await conn.end();
