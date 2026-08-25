import postgres from "postgres";

const databaseUrl = String(process.env.DATABASE_URL ?? "").trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const parsedUrl = new URL(databaseUrl);
const localHost = parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost" || parsedUrl.hostname === "[::1]";
const databaseName = parsedUrl.pathname.replace(/^\//, "");
if (!localHost || !/^akarpromax_/i.test(databaseName)) {
  throw new Error("GEO fixtures are restricted to isolated local akarpromax_* databases");
}

const sql = postgres(databaseUrl, { ssl: false, prepare: false, max: 1 });
const cleanup = process.argv.includes("--cleanup");

const IDS = {
  makkah: "10000000-0000-4000-8000-000000000001",
  riyadhRegion: "10000000-0000-4000-8000-000000000002",
  eastern: "10000000-0000-4000-8000-000000000003",
  jeddah: "20000000-0000-4000-8000-000000000001",
  riyadh: "20000000-0000-4000-8000-000000000002",
  dammam: "20000000-0000-4000-8000-000000000003",
  rawdah: "30000000-0000-4000-8000-000000000001",
  olaya: "30000000-0000-4000-8000-000000000002",
  shati: "30000000-0000-4000-8000-000000000003",
  propertyJeddah: "40000000-0000-4000-8000-000000000001",
  propertyRiyadh: "40000000-0000-4000-8000-000000000002",
  propertyDammam: "40000000-0000-4000-8000-000000000003",
  propertyJeddahB: "40000000-0000-4000-8000-000000000004",
  category: "50000000-0000-4000-8000-000000000001",
  providerJeddah: "60000000-0000-4000-8000-000000000001",
  providerRiyadh: "60000000-0000-4000-8000-000000000002",
  providerDammam: "60000000-0000-4000-8000-000000000003",
  providerCategoryJeddah: "70000000-0000-4000-8000-000000000001",
  providerCategoryRiyadh: "70000000-0000-4000-8000-000000000002",
  providerCategoryDammam: "70000000-0000-4000-8000-000000000003",
  adJeddah: "geo-launch-ad-jeddah",
  adRiyadh: "geo-launch-ad-riyadh",
  adDammam: "geo-launch-ad-dammam",
  adSaudi: "geo-launch-ad-saudi",
  adRadiusNear: "geo-launch-ad-radius-near-jeddah",
  adRadiusOutside: "geo-launch-ad-radius-outside-jeddah",
};

const AD_IDS = [
  IDS.adJeddah,
  IDS.adRiyadh,
  IDS.adDammam,
  IDS.adSaudi,
  IDS.adRadiusNear,
  IDS.adRadiusOutside,
];

async function removeFixtures(): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`DELETE FROM ad_creatives WHERE campaign_id IN ${sql(AD_IDS)}`;
    await tx`DELETE FROM ad_campaigns WHERE id IN ${sql(AD_IDS)}`;
    await tx`DELETE FROM service_provider_categories WHERE id IN (${IDS.providerCategoryJeddah}, ${IDS.providerCategoryRiyadh}, ${IDS.providerCategoryDammam})`;
    await tx`DELETE FROM service_provider_profiles WHERE id IN (${IDS.providerJeddah}, ${IDS.providerRiyadh}, ${IDS.providerDammam})`;
    await tx`DELETE FROM service_categories WHERE id = ${IDS.category}`;
    await tx`DELETE FROM properties WHERE id IN (${IDS.propertyJeddah}, ${IDS.propertyRiyadh}, ${IDS.propertyDammam}, ${IDS.propertyJeddahB})`;
    await tx`DELETE FROM governorates WHERE id IN (${IDS.makkah}, ${IDS.riyadhRegion}, ${IDS.eastern})`;
  });
}

async function seedFixtures(): Promise<void> {
  await removeFixtures();
  const country = await sql<{ id: string }[]>`SELECT id FROM countries WHERE upper(code) = 'SA' LIMIT 1`;
  if (!country[0]) throw new Error("Saudi Arabia reference country is missing from the local bootstrap");
  const countryId = country[0].id;

  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO governorates (id, country_id, code, name_ar, name_en, is_active, display_order)
      VALUES
        (${IDS.makkah}, ${countryId}, 'sa-makkah', 'منطقة مكة المكرمة', 'Makkah Region', true, 1),
        (${IDS.riyadhRegion}, ${countryId}, 'sa-riyadh-region', 'منطقة الرياض', 'Riyadh Region', true, 2),
        (${IDS.eastern}, ${countryId}, 'sa-eastern', 'المنطقة الشرقية', 'Eastern Province', true, 3)
    `;
    await tx`
      INSERT INTO cities (id, governorate_id, code, name_ar, name_en, latitude, longitude, is_active, display_order)
      VALUES
        (${IDS.jeddah}, ${IDS.makkah}, 'sa-jeddah', 'جدة', 'Jeddah', '21.543333', '39.172778', true, 1),
        (${IDS.riyadh}, ${IDS.riyadhRegion}, 'sa-riyadh', 'الرياض', 'Riyadh', '24.713552', '46.675296', true, 1),
        (${IDS.dammam}, ${IDS.eastern}, 'sa-dammam', 'الدمام', 'Dammam', '26.420683', '50.088794', true, 1)
    `;
    await tx`
      INSERT INTO districts (id, city_id, code, name_ar, name_en, is_active, display_order)
      VALUES
        (${IDS.rawdah}, ${IDS.jeddah}, 'jeddah-rawdah', 'الروضة', 'Al Rawdah', true, 1),
        (${IDS.olaya}, ${IDS.riyadh}, 'riyadh-olaya', 'العليا', 'Olaya', true, 1),
        (${IDS.shati}, ${IDS.dammam}, 'dammam-shati', 'الشاطئ', 'Al Shati', true, 1)
    `;

    await tx`
      INSERT INTO properties
        (id, title_ar, title_en, description_ar, description_en, deal_type, category, property_type,
         country, governorate, city, district, latitude, longitude, price, currency, area, bedrooms, bathrooms, status)
      VALUES
        (${IDS.propertyJeddah}, '[GEO-TEST] عقار جدة', '[GEO-TEST] Jeddah Property', 'بيانات اختبار محلية معزولة لعقار في جدة.', 'Isolated local Jeddah fixture.', 'sale', 'residential', 'apartment', 'SA', 'sa-makkah', 'sa-jeddah', 'jeddah-rawdah', '21.543333', '39.172778', '1000000', 'SAR', '120', 3, 2, 'approved'),
        (${IDS.propertyRiyadh}, '[GEO-TEST] عقار الرياض', '[GEO-TEST] Riyadh Property', 'بيانات اختبار محلية معزولة لعقار في الرياض.', 'Isolated local Riyadh fixture.', 'sale', 'residential', 'villa', 'SA', 'sa-riyadh-region', 'sa-riyadh', 'riyadh-olaya', '24.713552', '46.675296', '2000000', 'SAR', '300', 4, 4, 'approved'),
        (${IDS.propertyDammam}, '[GEO-TEST] عقار الدمام', '[GEO-TEST] Dammam Property', 'بيانات اختبار محلية معزولة لعقار في الدمام.', 'Isolated local Dammam fixture.', 'rent', 'residential', 'apartment', 'SA', 'sa-eastern', 'sa-dammam', 'dammam-shati', '26.420683', '50.088794', '80000', 'SAR', '150', 3, 3, 'approved'),
        (${IDS.propertyJeddahB}, '[GEO-TEST] عقار جدة ب', '[GEO-TEST] Jeddah Property B', 'بيانات اختبار محلية معزولة لعقار ثانٍ في جدة.', 'Second isolated local Jeddah fixture.', 'rent', 'residential', 'villa', 'SA', 'sa-makkah', 'sa-jeddah', 'jeddah-rawdah', '21.550000', '39.180000', '120000', 'SAR', '240', 4, 3, 'approved')
    `;

    await tx`
      INSERT INTO service_categories
        (id, country_code, code, name_ar, name_en, sort_order, is_active, booking_mode)
      VALUES (${IDS.category}, 'SA', 'geo-test-electrician', '[GEO-TEST] كهربائي', '[GEO-TEST] Electrician', 999, 1, 'both')
    `;
    await tx`
      INSERT INTO service_provider_profiles
        (id, user_id, display_name_ar, display_name_en, bio_ar, bio_en, country_code, governorate,
         city_id, district_id, latitude, longitude, service_radius_km, status, rating_avg, rating_count,
         is_featured, featured_rank, is_accepting_requests)
      VALUES
        (${IDS.providerJeddah}, 'geo-provider-jeddah@local.test', '[GEO-TEST] كهربائي جدة', '[GEO-TEST] Jeddah Electrician', 'بيانات اختبار محلية', 'Local fixture', 'SA', 'sa-makkah', 'sa-jeddah', 'jeddah-rawdah', 21.543333, 39.172778, 25, 'approved', 4.9, 10, 0, 0, 1),
        (${IDS.providerRiyadh}, 'geo-provider-riyadh@local.test', '[GEO-TEST] كهربائي الرياض', '[GEO-TEST] Riyadh Electrician', 'بيانات اختبار محلية', 'Local fixture', 'SA', 'sa-riyadh-region', 'sa-riyadh', 'riyadh-olaya', 24.713552, 46.675296, 25, 'approved', 4.8, 8, 0, 0, 1),
        (${IDS.providerDammam}, 'geo-provider-dammam@local.test', '[GEO-TEST] كهربائي الدمام', '[GEO-TEST] Dammam Electrician', 'بيانات اختبار محلية', 'Local fixture', 'SA', 'sa-eastern', 'sa-dammam', 'dammam-shati', 26.420683, 50.088794, 25, 'approved', 4.7, 6, 0, 0, 1)
    `;
    await tx`
      INSERT INTO service_provider_categories (id, provider_id, category_id, is_active)
      VALUES
        (${IDS.providerCategoryJeddah}, ${IDS.providerJeddah}, ${IDS.category}, 1),
        (${IDS.providerCategoryRiyadh}, ${IDS.providerRiyadh}, ${IDS.category}, 1),
        (${IDS.providerCategoryDammam}, ${IDS.providerDammam}, ${IDS.category}, 1)
    `;

    const adRows = [
      [IDS.adJeddah, 'sa-makkah', 'sa-jeddah', 'jeddah-rawdah', 21.543333, 39.172778],
      [IDS.adRiyadh, 'sa-riyadh-region', 'sa-riyadh', 'riyadh-olaya', 24.713552, 46.675296],
      [IDS.adDammam, 'sa-eastern', 'sa-dammam', 'dammam-shati', 26.420683, 50.088794],
    ] as const;
    for (const [id, region, city, district, latitude, longitude] of adRows) {
      await tx`
        INSERT INTO ad_campaigns
          (id, internal_name, advertiser_name, campaign_type, status, media_type, media_url, channels,
           eyebrow_ar, eyebrow_en, eyebrow_tr, title_ar, title_en, title_tr, accent_ar, accent_en, accent_tr,
           description_ar, description_en, description_tr, cta_ar, cta_en, cta_tr, target_url,
           countries, cities, languages, devices, section_scopes, page_types, placements, region_ids, district_ids,
           latitude, longitude, radius_km, target_all_countries, target_all_regions, target_all_cities,
           target_all_districts, approval_status, is_active, is_fallback, is_global, priority, weight)
        VALUES
          (${id}, ${`[GEO-TEST] ${city}`}, 'Local Geo Fixture', 'platform', 'active', 'image', '/placeholder.svg', '["website"]',
           '', '', '', ${`[GEO-TEST] ${city}`}, ${`[GEO-TEST] ${city}`}, ${`[GEO-TEST] ${city}`}, '', '', '',
           'بيانات اختبار محلية معزولة', 'Isolated local fixture', 'Local fixture', 'عرض', 'View', 'View', '/',
           '["sa"]', ${JSON.stringify([city])}, '["ar","en"]', '["desktop","mobile"]', '["home"]', '["home"]', '["HERO"]',
           ${JSON.stringify([region])}, ${JSON.stringify([district])}, ${latitude}, ${longitude}, NULL,
           0, 0, 0, 0, 'approved', 1, 0, 0, 900, 100)
      `;
    }

    const broadAdRows = [
      [IDS.adSaudi, '[GEO-TEST] Saudi country', null, null, null],
      [IDS.adRadiusNear, '[GEO-TEST] Radius near Jeddah', 21.543333, 39.172778, 10],
      [IDS.adRadiusOutside, '[GEO-TEST] Radius outside Jeddah', 21.750000, 39.172778, 10],
    ] as const;
    for (const [id, title, latitude, longitude, radiusKm] of broadAdRows) {
      await tx`
        INSERT INTO ad_campaigns
          (id, internal_name, advertiser_name, campaign_type, status, media_type, media_url, channels,
           eyebrow_ar, eyebrow_en, eyebrow_tr, title_ar, title_en, title_tr, accent_ar, accent_en, accent_tr,
           description_ar, description_en, description_tr, cta_ar, cta_en, cta_tr, target_url,
           countries, cities, languages, devices, section_scopes, page_types, placements, region_ids, district_ids,
           latitude, longitude, radius_km, target_all_countries, target_all_regions, target_all_cities,
           target_all_districts, approval_status, is_active, is_fallback, is_global, priority, weight)
        VALUES
          (${id}, ${title}, 'Local Geo Fixture', 'platform', 'active', 'image', '/placeholder.svg', '["website"]',
           '', '', '', ${title}, ${title}, ${title}, '', '', '',
           'بيانات اختبار محلية معزولة', 'Isolated local fixture', 'Local fixture', 'عرض', 'View', 'View', '/',
           '["sa"]', '[]', '["ar","en"]', '["desktop","mobile"]', '["home"]', '["home"]', '["HERO"]', '[]', '[]',
           ${latitude}, ${longitude}, ${radiusKm}, 0, 1, 1, 1, 'approved', 1, 0, 0, 850, 100)
      `;
    }
  });
}

try {
  if (cleanup) {
    await removeFixtures();
    console.log(JSON.stringify({ ok: true, action: "cleanup", database: databaseName }));
  } else {
    await seedFixtures();
    console.log(JSON.stringify({ ok: true, action: "seed", database: databaseName, fixturePrefix: "GEO-TEST" }));
  }
} finally {
  await sql.end();
}
