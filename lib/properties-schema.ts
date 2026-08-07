export const PROPERTY_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS property_listings (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    slug VARCHAR(200) NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    listing_type VARCHAR(16) NOT NULL DEFAULT 'for-sale',
    property_type VARCHAR(32) NOT NULL DEFAULT 'villa',
    country_code VARCHAR(8) NOT NULL DEFAULT 'om',
    city_id VARCHAR(100) NULL,
    district TEXT NULL,
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_tr TEXT NOT NULL,
    area_text_ar TEXT NULL,
    area_text_en TEXT NULL,
    area_text_tr TEXT NULL,
    description_ar TEXT NOT NULL,
    description_en TEXT NOT NULL,
    description_tr TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'OMR',
    built_up_area REAL NULL,
    land_area REAL NULL,
    bedrooms INTEGER NOT NULL DEFAULT 0,
    bathrooms INTEGER NOT NULL DEFAULT 0,
    parking_slots INTEGER NOT NULL DEFAULT 0,
    features_ar TEXT NOT NULL DEFAULT '[]',
    features_en TEXT NOT NULL DEFAULT '[]',
    features_tr TEXT NOT NULL DEFAULT '[]',
    image_url TEXT NULL,
    is_featured INTEGER NOT NULL DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 100,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

export const PROPERTY_INDEXES_SQL: string[] = [
  `CREATE INDEX IF NOT EXISTS property_listings_status_country_idx ON property_listings (status, country_code)`,
  `CREATE INDEX IF NOT EXISTS property_listings_featured_priority_idx ON property_listings (is_featured, priority)`,
  `CREATE INDEX IF NOT EXISTS property_listings_city_idx ON property_listings (country_code, city_id)`,
];

function isDuplicateKeyError(message: string): boolean {
  return /duplicate (key|index|column)|already exists/i.test(message);
}

export async function ensurePropertiesSchema(db: D1Database): Promise<void> {
  for (const sql of PROPERTY_TABLES_SQL) {
    await db.prepare(sql).run();
  }
  for (const sql of PROPERTY_INDEXES_SQL) {
    try {
      await db.prepare(sql).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isDuplicateKeyError(message)) throw error;
    }
  }
  await seedProperties(db);
}

type SeedProperty = {
  slug: string;
  listingType: "for-sale" | "for-rent";
  propertyType: string;
  countryCode: string;
  cityId: string;
  district: string;
  titleAr: string;
  titleEn: string;
  titleTr: string;
  areaAr: string;
  areaEn: string;
  areaTr: string;
  descriptionAr: string;
  descriptionEn: string;
  descriptionTr: string;
  price: number;
  builtUpArea: number;
  landArea: number;
  bedrooms: number;
  bathrooms: number;
  parkingSlots: number;
  featuresAr: string[];
  featuresEn: string[];
  featuresTr: string[];
  imageUrl: string;
  isFeatured: number;
  priority: number;
};

const SEED_PROPERTIES: SeedProperty[] = [
  {
    slug: "modern-sea-view-villa",
    listingType: "for-sale",
    propertyType: "villa",
    countryCode: "om",
    cityId: "om-muscat",
    district: "al-maabeel",
    titleAr: "فيلا عصرية بإطلالة بحرية",
    titleEn: "Modern sea-view villa",
    titleTr: "Deniz manzaralı modern villa",
    areaAr: "المعبر، مسقط",
    areaEn: "Al Ma'abeel, Muscat",
    areaTr: "El Ma'abil, Maskat",
    descriptionAr: "فيلا مستقلة من ثلاث غرف نوم وصالة ومطبخ أمريكي وحديقة خاصة، بمساحة بناء 350 متر مربع على أرض 500 متر مربع، وتتميز بإطلالة بحرية مباشرة وموقع قريب من الخدمات والمدارس.",
    descriptionEn: "A detached three-bedroom villa with living room, American kitchen and private garden, 350 m² built-up area on a 500 m² plot, featuring a direct sea view close to services and schools.",
    descriptionTr: "Üç yatak odalı, salon, amerikan mutfak ve özel bahçeli müstakil villa; 500 m² arsa üzerinde 350 m² inşaat alanı, doğrudan deniz manzarası, hizmetlere ve okullara yakın.",
    price: 189000,
    builtUpArea: 350,
    landArea: 500,
    bedrooms: 3,
    bathrooms: 3,
    parkingSlots: 2,
    featuresAr: ["3 غرف نوم", "صالة + غرفة معيشة", "مطبخ أمريكي", "حديقة خاصة 500م²", "موقف سيارتين", "إطلالة بحرية", "تكييف مركزي", "غرفة خادمة"],
    featuresEn: ["3 bedrooms", "Living room + hall", "American kitchen", "Private garden 500m²", "Two-car parking", "Sea view", "Central AC", "Maids room"],
    featuresTr: ["3 yatak odası", "Salon + oturma odası", "Amerikan mutfak", "Özel bahçe 500m²", "İki araçlık otopark", "Deniz manzarası", "Merkezi klima", "Hizmetçi odası"],
    imageUrl: "/og.png",
    isFeatured: 1,
    priority: 100,
  },
  {
    slug: "apartment-alkhuwair",
    listingType: "for-rent",
    propertyType: "apartment",
    countryCode: "om",
    cityId: "om-muscat",
    district: "alkhuwair",
    titleAr: "شقة فاخرة للإيجار في الخوير",
    titleEn: "Luxury apartment for rent in Al Khuwair",
    titleTr: "Al Khuwair'da kiralık lüks daire",
    areaAr: "الخوير، مسقط",
    areaEn: "Al Khuwair, Muscat",
    areaTr: "Al Huvayr, Maskat",
    descriptionAr: "شقة مفروشة بغرفتي نوم في برج حديث قرب البحر، تشمل موقفًا خاصًا وحمام سباحة وصالة رياضية، ومناسبة للأسر الصغيرة والمهنيين.",
    descriptionEn: "A furnished two-bedroom apartment in a modern tower near the sea, with a private parking slot, swimming pool and gym, ideal for small families and professionals.",
    descriptionTr: "Deniz yakınında modern bir kulede döşeli iki yatak odalı daire; özel otopark, yüzme havuzu ve spor salonu, küçük aileler ve profesyoneller için ideal.",
    price: 650,
    builtUpArea: 120,
    landArea: 0,
    bedrooms: 2,
    bathrooms: 2,
    parkingSlots: 1,
    featuresAr: ["غرفتا نوم", "مفروشة بالكامل", "حمام سباحة", "صالة رياضية", "موقف خاص", "قرب البحر"],
    featuresEn: ["2 bedrooms", "Fully furnished", "Swimming pool", "Gym", "Private parking", "Near the sea"],
    featuresTr: ["2 yatak odası", "Tam döşeli", "Yüzme havuzu", "Spor salonu", "Özel otopark", "Denize yakın"],
    imageUrl: "/og.png",
    isFeatured: 1,
    priority: 200,
  },
  {
    slug: "townhouse-al-seeb",
    listingType: "for-sale",
    propertyType: "townhouse",
    countryCode: "om",
    cityId: "om-seeb",
    district: "al-seeb",
    titleAr: "تاون هاوس في مجمع سكني بالسيب",
    titleEn: "Townhouse in a gated community in Al Seeb",
    titleTr: "El Sib'de güvenlikli sitede sıra ev",
    areaAr: "السيب",
    areaEn: "Al Seeb",
    areaTr: "El Sib",
    descriptionAr: "تاون هاوس بثلاث غرف نوم في مجمع سكني آمن يضم مسبحًا ومسطحات خضراء، بمساحة بناء 220 متر مربع، ويبعد 10 دقائق عن مطار مسقط.",
    descriptionEn: "A three-bedroom townhouse in a secure community with a pool and green spaces, 220 m² built-up area, 10 minutes from Muscat Airport.",
    descriptionTr: "Havuzlu ve yeşil alanlı güvenli bir sitede 3 yatak odalı sıra ev; 220 m² inşaat alanı, Maskat Havalimanı'na 10 dakika.",
    price: 115000,
    builtUpArea: 220,
    landArea: 160,
    bedrooms: 3,
    bathrooms: 3,
    parkingSlots: 2,
    featuresAr: ["3 غرف نوم", "مجمع آمن", "مسبح مشترك", "مسطحات خضراء", "قرب المطار"],
    featuresEn: ["3 bedrooms", "Gated community", "Shared pool", "Green spaces", "Near the airport"],
    featuresTr: ["3 yatak odası", "Güvenlikli site", "Ortak havuz", "Yeşil alanlar", "Havalimanına yakın"],
    imageUrl: "/og.png",
    isFeatured: 1,
    priority: 300,
  },
  {
    slug: "land-al-amarat",
    listingType: "for-sale",
    propertyType: "land",
    countryCode: "om",
    cityId: "om-muscat",
    district: "al-amarat",
    titleAr: "أرض سكنية في العامرات",
    titleEn: "Residential land in Al Amerat",
    titleTr: "El Amirat'ta konut arsası",
    areaAr: "العامرات، مسقط",
    areaEn: "Al Amerat, Muscat",
    areaTr: "El Amirat, Maskat",
    descriptionAr: "أرض سكنية بمساحة 600 متر مربع في حي هادئ قريب من الخدمات والطرق الرئيسية، مناسبة لبناء فيلا عائلية.",
    descriptionEn: "A 600 m² residential plot in a quiet neighbourhood close to services and main roads, suitable for a family villa.",
    descriptionTr: "Hizmetlere ve ana yollara yakın sakin bir mahallede 600 m² konut arsası; aile villası için uygun.",
    price: 85000,
    builtUpArea: 0,
    landArea: 600,
    bedrooms: 0,
    bathrooms: 0,
    parkingSlots: 0,
    featuresAr: ["600م²", "حي هادئ", "قرب الخدمات"],
    featuresEn: ["600m²", "Quiet neighbourhood", "Close to services"],
    featuresTr: ["600m²", "Sakin mahalle", "Hizmetlere yakın"],
    imageUrl: "/og.png",
    isFeatured: 0,
    priority: 400,
  },
];

async function seedProperties(db: D1Database): Promise<void> {
  const existing = await db.prepare("SELECT COUNT(*) AS count FROM property_listings WHERE status = 'active'").first<{ count: number }>();
  if (existing && Number(existing.count) > 0) return;

  const statements = SEED_PROPERTIES.map((property) =>
    db.prepare(
      `INSERT OR IGNORE INTO property_listings
        (id, slug, status, listing_type, property_type, country_code, city_id, district,
         title_ar, title_en, title_tr, area_text_ar, area_text_en, area_text_tr,
         description_ar, description_en, description_tr, price, currency,
         built_up_area, land_area, bedrooms, bathrooms, parking_slots,
         features_ar, features_en, features_tr, image_url, is_featured, priority)
       VALUES (?1, ?2, 'active', ?3, ?4, ?5, ?6, ?7,
         ?8, ?9, ?10, ?11, ?12, ?13,
         ?14, ?15, ?16, ?17, 'OMR',
         ?18, ?19, ?20, ?21, ?22,
         ?23, ?24, ?25, ?26, ?27, ?28)`,
    ).bind(
      crypto.randomUUID(), property.slug, property.listingType, property.propertyType,
      property.countryCode, property.cityId, property.district,
      property.titleAr, property.titleEn, property.titleTr,
      property.areaAr, property.areaEn, property.areaTr,
      property.descriptionAr, property.descriptionEn, property.descriptionTr,
      property.price, property.builtUpArea, property.landArea,
      property.bedrooms, property.bathrooms, property.parkingSlots,
      JSON.stringify(property.featuresAr), JSON.stringify(property.featuresEn), JSON.stringify(property.featuresTr),
      property.imageUrl, property.isFeatured, property.priority,
    ),
  );
  await db.batch(statements);
}
