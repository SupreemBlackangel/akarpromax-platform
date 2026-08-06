import { computeMatchScore, type MatchRequestRow, type MatchProviderRow } from "@/lib/services/match-score";

export type SeedDb = {
  prepare: (query: string) => {
    bind(...values: unknown[]): {
      all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
      first<T = Record<string, unknown>>(): Promise<T | null>;
      run(): Promise<{ meta?: { changes?: number } }>;
    };
  };
  batch(statements: Array<unknown>): Promise<unknown[]>;
};

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

type DynamicField = {
  key: string;
  label_ar: string;
  label_en: string;
  type: string;
  required?: boolean;
  options?: string[];
};

const F = {
  propertyType: { key: "property_type", label_ar: "نوع العقار", label_en: "Property type", type: "select", required: true, options: ["شقة", "فيلا", "مكتب", "محل تجاري", "مستودع"] },
  area: { key: "area_sqm", label_ar: "المساحة (م²)", label_en: "Area (sqm)", type: "number", required: false },
  rooms: { key: "rooms", label_ar: "عدد الغرف", label_en: "Rooms", type: "number", required: false },
  floors: { key: "floors", label_ar: "عدد الأدوار", label_en: "Floors", type: "number", required: false },
  buildingAge: { key: "building_age", label_ar: "عمر المبنى (سنوات)", label_en: "Building age (years)", type: "number", required: false },
  issue: { key: "issue", label_ar: "وصف المشكلة بالتفصيل", label_en: "Describe the issue", type: "textarea", required: true },
  preferredDay: { key: "preferred_day", label_ar: "اليوم المفضل", label_en: "Preferred day", type: "select", required: false, options: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"] },
  preferredTime: { key: "preferred_time", label_ar: "الفترة المفضلة", label_en: "Preferred time", type: "select", required: false, options: ["صباحاً", "بعد الظهر", "مساءً"] },
  access: { key: "access_notes", label_ar: "ملاحظات الوصول والدخول", label_en: "Access notes", type: "textarea", required: false },
  rooms2: { key: "rooms_count", label_ar: "عدد الغرف", label_en: "Rooms count", type: "number", required: false },
  sizeM3: { key: "size_m3", label_ar: "الحجم التقريبي (م³)", label_en: "Approx. size (m³)", type: "number", required: false },
  floorsCarry: { key: "floors_count", label_ar: "عدد الطوابق", label_en: "Floors count", type: "number", required: false },
  serviceType: { key: "service_type", label_ar: "نوع الخدمة", label_en: "Service type", type: "select", required: true, options: ["شامل", "أساسي", "سنوي"] },
  license: { key: "has_license", label_ar: "هل تمتلك الترخيص المطلوب؟", label_en: "Do you hold the required license?", type: "select", required: true, options: ["نعم", "لا", "قيد الإصدار"] },
  brand: { key: "brand_preference", label_ar: "تفضيل العلامة التجارية", label_en: "Brand preference", type: "text", required: false },
  style: { key: "style", label_ar: "النمط المفضل", label_en: "Preferred style", type: "select", required: false, options: ["كلاسيكي", "حديث", "اسكندنافي", "عربي"] },
  materials: { key: "materials", label_ar: "نوع المواد المطلوبة", label_en: "Materials needed", type: "select", required: false, options: ["الأساسية فقط", "عالية الجودة", "مستوردة"] },
  furniture: { key: "furniture_count", label_ar: "عدد القطع", label_en: "Item count", type: "number", required: false },
  distance: { key: "distance_km", label_ar: "المسافة التقريبية (كم)", label_en: "Approx. distance (km)", type: "number", required: false },
  plants: { key: "plants", label_ar: "عدد النباتات", label_en: "Plant count", type: "number", required: false },
  poolType: { key: "pool_type", label_ar: "نوع المسبح", label_en: "Pool type", type: "select", required: true, options: ["سكني", "فندقي", "تجاري"] },
  systemType: { key: "system_type", label_ar: "نوع النظام", label_en: "System type", type: "select", required: false, options: ["كاميرات", "إنذار", "بوابات", "متكامل"] },
  roomsSmart: { key: "rooms_smart", label_ar: "عدد الغرف", label_en: "Rooms", type: "number", required: false },
  budgetNote: { key: "budget_note", label_ar: "ملاحظة على الميزانية", label_en: "Budget note", type: "text", required: false },
};

type CategorySeed = {
  code: string;
  nameAr: string;
  nameEn: string;
  nameTr: string;
  icon: string;
  requiresLicense?: boolean;
  requiresVisit?: boolean;
  priceMin?: number;
  priceMax?: number;
  dynamicFields: DynamicField[];
};

const ROOT_CATEGORIES: CategorySeed[] = [
  { code: "cleaning", nameAr: "تنظيف", nameEn: "Cleaning", nameTr: "Temizlik", icon: "Sparkles", priceMin: 10, priceMax: 50, dynamicFields: [F.propertyType, F.area, F.rooms, F.serviceType, F.preferredDay] },
  { code: "maintenance", nameAr: "صيانة", nameEn: "Maintenance", nameTr: "Bakım", icon: "Wrench", requiresVisit: true, priceMin: 20, priceMax: 200, dynamicFields: [F.issue, F.propertyType, F.buildingAge, F.preferredDay, F.preferredTime] },
  { code: "moving", nameAr: "نقل أثاث", nameEn: "Moving", nameTr: "Taşıma", icon: "Truck", requiresVisit: true, priceMin: 50, priceMax: 300, dynamicFields: [F.furniture, F.distance, F.floorsCarry, F.access] },
  { code: "renovation", nameAr: "تشطيب وترميم", nameEn: "Renovation", nameTr: "Yenileme", icon: "Hammer", requiresLicense: true, requiresVisit: true, priceMin: 500, priceMax: 20000, dynamicFields: [F.propertyType, F.area, F.materials, F.style, F.budgetNote] },
  { code: "home-services", nameAr: "خدمات منزلية", nameEn: "Home services", nameTr: "Ev hizmetleri", icon: "Home", priceMin: 5, priceMax: 80, dynamicFields: [F.propertyType, F.area, F.serviceType, F.preferredTime] },
  { code: "ac-repair", nameAr: "تكييف وتبريد", nameEn: "AC & cooling", nameTr: "Klima ve soğutma", icon: "Snowflake", requiresLicense: true, requiresVisit: true, priceMin: 15, priceMax: 150, dynamicFields: [F.issue, F.buildingAge, F.brand, F.rooms] },
  { code: "electrical", nameAr: "كهرباء", nameEn: "Electrical", nameTr: "Elektrik", icon: "Zap", requiresLicense: true, requiresVisit: true, priceMin: 10, priceMax: 150, dynamicFields: [F.issue, F.propertyType, F.floors, F.preferredTime] },
  { code: "plumbing", nameAr: "سباكة", nameEn: "Plumbing", nameTr: "Sıhhi tesisat", icon: "Droplets", requiresVisit: true, priceMin: 10, priceMax: 120, dynamicFields: [F.issue, F.propertyType, F.buildingAge, F.preferredTime] },
  { code: "carpentry", nameAr: "نجارة", nameEn: "Carpentry", nameTr: "Marangozluk", icon: "Axe", priceMin: 20, priceMax: 300, dynamicFields: [F.issue, F.propertyType, F.materials, F.preferredDay] },
  { code: "painting", nameAr: "دهان", nameEn: "Painting", nameTr: "Boya", icon: "Paintbrush", requiresVisit: true, priceMin: 50, priceMax: 500, dynamicFields: [F.propertyType, F.area, F.style, F.preferredTime] },
  { code: "pest-control", nameAr: "مكافحة آفات", nameEn: "Pest control", nameTr: "Haşere kontrolü", icon: "Bug", priceMin: 15, priceMax: 120, dynamicFields: [F.propertyType, F.issue, F.preferredDay] },
  { code: "landscaping", nameAr: "تنسيق حدائق", nameEn: "Landscaping", nameTr: "Peyzaj", icon: "Trees", priceMin: 50, priceMax: 1000, dynamicFields: [F.propertyType, F.area, F.plants, F.budgetNote] },
  { code: "pool-cleaning", nameAr: "تنظيف مسابح", nameEn: "Pool cleaning", nameTr: "Havuz temizliği", icon: "Waves", priceMin: 20, priceMax: 150, dynamicFields: [F.poolType, F.area, F.serviceType, F.preferredDay] },
  { code: "security", nameAr: "أنظمة أمنية", nameEn: "Security systems", nameTr: "Güvenlik sistemleri", icon: "Shield", requiresLicense: true, priceMin: 80, priceMax: 2000, dynamicFields: [F.systemType, F.propertyType, F.area, F.budgetNote] },
  { code: "smart-home", nameAr: "أنظمة المنزل الذكي", nameEn: "Smart home", nameTr: "Akıllı ev", icon: "Cpu", priceMin: 100, priceMax: 3000, dynamicFields: [F.roomsSmart, F.systemType, F.budgetNote] },
  { code: "interior-design", nameAr: "تصميم داخلي", nameEn: "Interior design", nameTr: "İç mimarlık", icon: "Ruler", priceMin: 100, priceMax: 5000, dynamicFields: [F.propertyType, F.area, F.style, F.budgetNote] },
  { code: "architectural", nameAr: "استشارات معمارية", nameEn: "Architectural consulting", nameTr: "Mimari danışmanlık", icon: "Building2", requiresLicense: true, priceMin: 150, priceMax: 4000, dynamicFields: [F.propertyType, F.area, F.floors, F.budgetNote] },
  { code: "surveying", nameAr: "مساحة", nameEn: "Surveying", nameTr: "Haritacılık", icon: "LandPlot", requiresLicense: true, requiresVisit: true, priceMin: 80, priceMax: 800, dynamicFields: [F.propertyType, F.area, F.budgetNote] },
  { code: "inspection", nameAr: "فحص العقارات", nameEn: "Property inspection", nameTr: "Emlak denetimi", icon: "SearchCheck", requiresLicense: true, requiresVisit: true, priceMin: 60, priceMax: 500, dynamicFields: [F.propertyType, F.area, F.buildingAge, F.preferredTime] },
  { code: "property-management", nameAr: "إدارة أملاك", nameEn: "Property management", nameTr: "Emlak yönetimi", icon: "KeyRound", priceMin: 200, priceMax: 5000, dynamicFields: [F.propertyType, F.area, F.serviceType, F.budgetNote] },
  { code: "legal-services", nameAr: "خدمات قانونية", nameEn: "Legal services", nameTr: "Hukuki hizmetler", icon: "Scale", requiresLicense: true, priceMin: 100, priceMax: 3000, dynamicFields: [F.serviceType, F.budgetNote] },
  { code: "accounting", nameAr: "محاسبة وضرائب", nameEn: "Accounting & tax", nameTr: "Muhasebe ve vergi", icon: "Calculator", requiresLicense: true, priceMin: 80, priceMax: 2000, dynamicFields: [F.serviceType, F.budgetNote] },
  { code: "real-estate-marketing", nameAr: "تسويق عقاري", nameEn: "Real-estate marketing", nameTr: "Gayrimenkul pazarlama", icon: "Megaphone", priceMin: 100, priceMax: 3000, dynamicFields: [F.serviceType, F.propertyType, F.budgetNote] },
  { code: "photography", nameAr: "تصوير عقاري", nameEn: "Property photography", nameTr: "Emlak fotoğrafçılığı", icon: "Camera", priceMin: 30, priceMax: 400, dynamicFields: [F.propertyType, F.area, F.preferredTime] },
  { code: "it-services", nameAr: "خدمات تقنية", nameEn: "IT services", nameTr: "BT hizmetleri", icon: "Monitor", priceMin: 20, priceMax: 500, dynamicFields: [F.serviceType, F.budgetNote] },
];

type ProviderSeed = {
  email: string;
  displayName: string;
  phone: string;
  cityId: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  categories: Array<{ code: string; priceFrom?: number; priceTo?: number; unit: string }>;
  jobsCompleted: number;
  completionRate: number;
  responseRate: number;
  ratingAvg: number;
  ratingCount: number;
};

const PROVIDERS: ProviderSeed[] = [
  {
    email: "provider1@localhost.akarpromax",
    displayName: "شركة النور للخدمات",
    phone: "+968 9123 4001",
    cityId: "om-muscat",
    latitude: 23.578,
    longitude: 58.387,
    radiusKm: 30,
    categories: [
      { code: "cleaning", priceFrom: 10, priceTo: 40, unit: "hour" },
      { code: "maintenance", priceFrom: 20, priceTo: 150, unit: "visit" },
      { code: "home-services", priceFrom: 8, priceTo: 60, unit: "hour" },
      { code: "pest-control", priceFrom: 15, priceTo: 100, unit: "visit" },
    ],
    jobsCompleted: 214,
    completionRate: 98,
    responseRate: 96,
    ratingAvg: 4.8,
    ratingCount: 87,
  },
  {
    email: "provider2@localhost.akarpromax",
    displayName: "مؤسسة البناء الحديث",
    phone: "+968 9123 4002",
    cityId: "om-muscat",
    latitude: 23.616,
    longitude: 58.459,
    radiusKm: 40,
    categories: [
      { code: "renovation", priceFrom: 800, priceTo: 20000, unit: "project" },
      { code: "painting", priceFrom: 60, priceTo: 500, unit: "project" },
      { code: "carpentry", priceFrom: 30, priceTo: 300, unit: "project" },
      { code: "interior-design", priceFrom: 150, priceTo: 4000, unit: "project" },
    ],
    jobsCompleted: 156,
    completionRate: 96,
    responseRate: 92,
    ratingAvg: 4.6,
    ratingCount: 63,
  },
  {
    email: "provider3@localhost.akarpromax",
    displayName: "مجموعة الصيانة الفنية",
    phone: "+968 9123 4003",
    cityId: "om-muscat",
    latitude: 23.548,
    longitude: 58.287,
    radiusKm: 25,
    categories: [
      { code: "ac-repair", priceFrom: 15, priceTo: 120, unit: "visit" },
      { code: "electrical", priceFrom: 12, priceTo: 130, unit: "visit" },
      { code: "plumbing", priceFrom: 12, priceTo: 110, unit: "visit" },
      { code: "pool-cleaning", priceFrom: 20, priceTo: 120, unit: "visit" },
    ],
    jobsCompleted: 301,
    completionRate: 99,
    responseRate: 98,
    ratingAvg: 4.9,
    ratingCount: 132,
  },
  {
    email: "provider4@localhost.akarpromax",
    displayName: "شركة التحرك السريع",
    phone: "+968 9123 4004",
    cityId: "om-muscat",
    latitude: 23.528,
    longitude: 58.31,
    radiusKm: 20,
    categories: [
      { code: "moving", priceFrom: 60, priceTo: 280, unit: "fixed" },
      { code: "landscaping", priceFrom: 80, priceTo: 900, unit: "project" },
      { code: "security", priceFrom: 100, priceTo: 1800, unit: "project" },
      { code: "smart-home", priceFrom: 150, priceTo: 2800, unit: "project" },
    ],
    jobsCompleted: 98,
    completionRate: 94,
    responseRate: 90,
    ratingAvg: 4.4,
    ratingCount: 41,
  },
];

type RequestSeed = {
  reference: string;
  categoryCode: string;
  customerEmail: string;
  title: string;
  description: string;
  urgency: string;
  preferredPeriod: string;
  needsVisit: boolean;
  budgetMin?: number;
  budgetMax?: number;
  latitude: number;
  longitude: number;
  answers: Array<{ key: string; label: string; type: string; value: string }>;
};

const REQUESTS: RequestSeed[] = [
  {
    reference: "SR-2026-1001",
    categoryCode: "cleaning",
    customerEmail: "customer@localhost.akarpromax",
    title: "تنظيف أسبوعي لشقة في الخوير",
    description: "أبحث عن فريق تنظيف منتظم لشقة من 3 غرف في منطقة الخوير، مرة أسبوعياً.",
    urgency: "this_week",
    preferredPeriod: "صباحاً",
    needsVisit: true,
    budgetMin: 15,
    budgetMax: 40,
    latitude: 23.589,
    longitude: 58.388,
    answers: [
      { key: "property_type", label: "نوع العقار", type: "select", value: "شقة" },
      { key: "area_sqm", label: "المساحة (م²)", type: "number", value: "140" },
      { key: "rooms", label: "عدد الغرف", type: "number", value: "3" },
      { key: "service_type", label: "نوع الخدمة", type: "select", value: "شامل" },
      { key: "preferred_day", label: "اليوم المفضل", type: "select", value: "السبت" },
    ],
  },
  {
    reference: "SR-2026-1002",
    categoryCode: "renovation",
    customerEmail: "customer@localhost.akarpromax",
    title: "تشطيب كامل لفيلا في القرم",
    description: "تشطيب كامل لفيلا 300 متر في القرم مع توفير المواد الأولية، مطلوب مقاول معتمد.",
    urgency: "asap",
    preferredPeriod: "بعد الظهر",
    needsVisit: true,
    budgetMin: 8000,
    budgetMax: 25000,
    latitude: 23.615,
    longitude: 58.45,
    answers: [
      { key: "property_type", label: "نوع العقار", type: "select", value: "فيلا" },
      { key: "area_sqm", label: "المساحة (م²)", type: "number", value: "300" },
      { key: "materials", label: "نوع المواد المطلوبة", type: "select", value: "عالية الجودة" },
      { key: "style", label: "النمط المفضل", type: "select", value: "حديث" },
    ],
  },
  {
    reference: "SR-2026-1003",
    categoryCode: "ac-repair",
    customerEmail: "customer@localhost.akarpromax",
    title: "عطل في مكيف الغرفة الرئيسية",
    description: "المكيف لا يبرّد بشكل كافٍ في غرفة رئيسية، بحاجة لزيارة فنية عاجلة.",
    urgency: "urgent",
    preferredPeriod: "مساءً",
    needsVisit: true,
    budgetMin: 20,
    budgetMax: 120,
    latitude: 23.55,
    longitude: 58.29,
    answers: [
      { key: "issue", label: "وصف المشكلة بالتفصيل", type: "textarea", value: "المكيف يعمل لكن التبريد ضعيف منذ يومين" },
      { key: "building_age", label: "عمر المبنى (سنوات)", type: "number", value: "12" },
      { key: "brand_preference", label: "تفضيل العلامة التجارية", type: "text", value: "جنرال" },
      { key: "has_license", label: "هل تمتلك الترخيص المطلوب؟", type: "select", value: "نعم" },
    ],
  },
  {
    reference: "SR-2026-1004",
    categoryCode: "moving",
    customerEmail: "customer@localhost.akarpromax",
    title: "نقل أثاث من الخوض إلى العامرات",
    description: "نقل أثاث شقة من الخوض إلى العامرات، حوالي 20 قطعة تشمل أثاث وغرفة نوم.",
    urgency: "this_week",
    preferredPeriod: "صباحاً",
    needsVisit: true,
    budgetMin: 60,
    budgetMax: 200,
    latitude: 23.529,
    longitude: 58.311,
    answers: [
      { key: "furniture_count", label: "عدد القطع", type: "number", value: "20" },
      { key: "distance_km", label: "المسافة التقريبية (كم)", type: "number", value: "18" },
      { key: "floors_count", label: "عدد الطوابق", type: "number", value: "2" },
    ],
  },
];

export async function seedServicesMarketplace(db: SeedDb): Promise<void> {
  await seedCategories(db);
  await seedUsersAndProviders(db);
  await seedRequests(db);
  await seedDemoJob(db);
}

async function seedCategories(db: SeedDb): Promise<void> {
  const COUNTRY = "OM";
  const sortOrders = new Map<string, number>();
  for (const category of ROOT_CATEGORIES) {
    const existing = await db
      .prepare("SELECT id FROM service_categories WHERE country_code = ?1 AND code = ?2")
      .bind(COUNTRY, category.code)
      .first<{ id: string }>();
    if (existing) {
      await db
        .prepare(
          `UPDATE service_categories
           SET name_ar = ?1, name_en = ?2, name_tr = ?3, icon = ?4, image_url = NULL,
               requires_license = ?5, requires_visit = ?6, price_min = ?7, price_max = ?8,
               dynamic_fields = ?9, sort_order = ?10, updated_at = ?11
           WHERE id = ?12`,
        )
        .bind(
          category.nameAr, category.nameEn, category.nameTr,
          category.icon, category.requiresLicense ? 1 : 0, category.requiresVisit ? 1 : 0,
          category.priceMin ?? null, category.priceMax ?? null,
          JSON.stringify(category.dynamicFields), sortOrders.get(category.code) ?? ROOT_CATEGORIES.indexOf(category) + 1,
          nowSql(), existing.id,
        )
        .run();
      continue;
    }
    await db
      .prepare(
        `INSERT OR IGNORE INTO service_categories
          (id, parent_id, country_code, code, name_ar, name_en, name_tr, description_ar, description_en,
           description_tr, icon, image_url, requires_license, requires_visit, price_min, price_max,
           dynamic_fields, sort_order, is_active, created_at, updated_at)
         VALUES (?1, NULL, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NULL, ?11, ?12, ?13, ?14, ?15, ?16, 1, ?17, ?17)`,
      )
      .bind(
        crypto.randomUUID(), COUNTRY, category.code,
        category.nameAr, category.nameEn, category.nameTr,
        `${category.nameAr} - وصف تفصيلي`, `${category.nameEn} - detailed description`, `${category.nameTr} - ayrıntılı açıklama`,
        category.icon, category.requiresLicense ? 1 : 0, category.requiresVisit ? 1 : 0,
        category.priceMin ?? null, category.priceMax ?? null,
        JSON.stringify(category.dynamicFields), ROOT_CATEGORIES.indexOf(category) + 1,
        nowSql(),
      )
      .run();
  }
}

async function seedUsersAndProviders(db: SeedDb): Promise<void> {
  const existing = await db.prepare("SELECT COUNT(*) AS count FROM service_provider_profiles").bind().first<{ count: number }>();
  if (existing && Number(existing.count) > 0) return;

  const users = [
    { email: "customer@localhost.akarpromax", name: "عميل تجريبي", role: "viewer", country: "om" },
    ...PROVIDERS.map((provider) => ({ email: provider.email, name: provider.displayName, role: "service_provider", country: "om" })),
  ];
  const userStatements = users.map((user) =>
    db.prepare(
      `INSERT OR IGNORE INTO sponsor_access (id, email, display_name, role, country_code, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?6)`,
    ).bind(crypto.randomUUID(), user.email, user.name, user.role, user.country, nowSql()),
  );
  await db.batch(userStatements);

  const categoryIds = new Map<string, string>();
  for (const category of ROOT_CATEGORIES) {
    const row = await db
      .prepare("SELECT id FROM service_categories WHERE country_code = 'OM' AND code = ?1")
      .bind(category.code)
      .first<{ id: string }>();
    if (row) categoryIds.set(category.code, row.id);
  }

  for (const provider of PROVIDERS) {
    const providerId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO service_provider_profiles
          (id, user_id, display_name_ar, display_name_en, bio_ar, bio_en, phone, whatsapp, email,
           country_code, city_id, district_id, governorate, latitude, longitude, service_radius_km,
           status, approved_at, rating_avg, rating_count, jobs_completed, completion_rate, response_rate,
           avg_response_time_min, is_business, business_name, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, NULL, NULL, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, 1, ?23, ?24, ?24)`,
      )
      .bind(
        providerId,
        provider.email,
        provider.displayName,
        provider.displayName,
        `مزود خدمات موثوق في ${provider.cityId}`,
        `Trusted service provider in ${provider.cityId}`,
        provider.phone,
        provider.phone,
        provider.email,
        "OM",
        provider.cityId,
        provider.latitude,
        provider.longitude,
        provider.radiusKm,
        "approved",
        nowSql(),
        provider.ratingAvg,
        provider.ratingCount,
        provider.jobsCompleted,
        provider.completionRate,
        provider.responseRate,
        35,
        provider.displayName,
        nowSql(),
      )
      .run();

    const categoryStatements = provider.categories.map((entry) => {
      const categoryId = categoryIds.get(entry.code);
      if (!categoryId) return null;
      return db
        .prepare(
          `INSERT INTO service_provider_categories (id, provider_id, category_id, price_from, price_to, pricing_unit, is_active, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7)`,
        )
        .bind(crypto.randomUUID(), providerId, categoryId, entry.priceFrom ?? null, entry.priceTo ?? null, entry.unit, nowSql());
    }).filter((statement): statement is NonNullable<typeof statement> => statement != null);
    if (categoryStatements.length) await db.batch(categoryStatements);

    await db
      .prepare(
        `INSERT INTO service_provider_documents (id, provider_id, type, file_name, file_url, file_size, mime_type, verified, created_at)
         VALUES (?1, ?2, 'commercial_registration', ?3, ?4, 0, 'application/pdf', 1, ?5)`,
      )
      .bind(crypto.randomUUID(), providerId, "commercial-registration.pdf", "/uploads/placeholder-commercial-registration.pdf", nowSql())
      .run();

    if (provider.categories[0]) {
      const categoryId = categoryIds.get(provider.categories[0].code);
      await db
        .prepare(
          `INSERT INTO service_provider_portfolio (id, provider_id, category_id, title, description, image_url, year, tags, is_featured, status, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, 2025, ?7, 1, 'active', ?8)`,
        )
        .bind(crypto.randomUUID(), providerId, categoryId ?? null, `مشاريع ${provider.displayName}`, `أعمال منجزة بنجاح عبر عقار بروماكس في ${provider.cityId}`, "/uploads/placeholder-portfolio.jpg", JSON.stringify([provider.categories[0].code]), nowSql())
        .run();
    }
  }
}

async function seedRequests(db: SeedDb): Promise<void> {
  const existing = await db.prepare("SELECT COUNT(*) AS count FROM service_requests WHERE status = 'published'").bind().first<{ count: number }>();
  if (existing && Number(existing.count) > 0) return;

  const categoryIds = new Map<string, string>();
  for (const category of ROOT_CATEGORIES) {
    const row = await db.prepare("SELECT id FROM service_categories WHERE country_code = 'OM' AND code = ?1").bind(category.code).first<{ id: string }>();
    if (row) categoryIds.set(category.code, row.id);
  }

  for (const request of REQUESTS) {
    const categoryId = categoryIds.get(request.categoryCode);
    if (!categoryId) continue;
    const requestId = crypto.randomUUID();
    const created = nowSql();
    await db
      .prepare(
        `INSERT INTO service_requests
          (id, customer_user_id, category_id, country_code, city_id, district_id, latitude, longitude,
           title, description, title_key, description_key, budget_min, budget_max, currency, preferred_date,
           status, urgency, preferred_period, needs_visit, access_notes, short_address, pricing_type,
           reference_number, answers, published_at, matched_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'OM', 'om-muscat', NULL, ?4, ?5, ?6, ?7, NULL, NULL, ?8, ?9, 'OMR', NULL,
           'published', ?10, ?11, ?12, NULL, NULL, 'fixed', ?13, ?14, ?15, NULL, ?15, ?15)`,
      )
      .bind(
        requestId, request.customerEmail, categoryId,
        request.latitude, request.longitude, request.title, request.description,
        request.budgetMin ?? null, request.budgetMax ?? null,
        request.urgency, request.preferredPeriod, request.needsVisit ? 1 : 0,
        request.reference, JSON.stringify(request.answers), created,
      )
      .run();

    await db
      .prepare(
        `INSERT INTO service_request_status_history (id, request_id, from_status, to_status, note, changed_by, created_at)
         VALUES (?1, ?2, 'draft', 'published', 'تم النشر وبدء المطابقة', ?3, ?4)`,
      )
      .bind(crypto.randomUUID(), requestId, request.customerEmail, created)
      .run();

    const answers = request.answers.map((answer) =>
      db.prepare(
        `INSERT INTO service_request_answers (id, request_id, field_key, field_label, field_type, value, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      ).bind(crypto.randomUUID(), requestId, answer.key, answer.label, answer.type, answer.value, created),
    );
    await db.batch(answers);

    await computeAndInsertMatches(db, requestId, categoryId, request.latitude, request.longitude, request.urgency, request.budgetMin, request.budgetMax);
  }
}

async function computeAndInsertMatches(
  db: SeedDb,
  requestId: string,
  categoryId: string,
  latitude: number,
  longitude: number,
  urgency: string,
  budgetMin?: number,
  budgetMax?: number,
): Promise<void> {
  const profileRows = await db
    .prepare("SELECT * FROM service_provider_profiles WHERE status = 'approved'")
    .bind()
    .all<Record<string, unknown>>();
  const rows = profileRows.results ?? [];
  if (!rows.length) return;

  const request: MatchRequestRow = {
    id: requestId,
    category_id: categoryId,
    country_code: "OM",
    city_id: "om-muscat",
    latitude,
    longitude,
    urgency,
    budget_min: budgetMin ?? null,
    budget_max: budgetMax ?? null,
  };

  const statements = [];
  for (const row of rows) {
    const providerCategories = await db
      .prepare("SELECT category_id, price_from, price_to FROM service_provider_categories WHERE provider_id = ?1")
      .bind(String(row.id))
      .all<{ category_id: string; price_from: number | null; price_to: number | null }>();
    const provider: MatchProviderRow = {
      id: String(row.id),
      user_id: String(row.user_id),
      country_code: String(row.country_code),
      city_id: row.city_id ? String(row.city_id) : null,
      latitude: row.latitude == null ? null : Number(row.latitude),
      longitude: row.longitude == null ? null : Number(row.longitude),
      service_radius_km: row.service_radius_km == null ? null : Number(row.service_radius_km),
      rating_avg: row.rating_avg == null ? null : Number(row.rating_avg),
      rating_count: row.rating_count == null ? null : Number(row.rating_count),
      completion_rate: row.completion_rate == null ? null : Number(row.completion_rate),
      response_rate: row.response_rate == null ? null : Number(row.response_rate),
      status: String(row.status),
      category_ids: (providerCategories.results ?? []).map((entry) => entry.category_id),
      price_ranges: (providerCategories.results ?? []).map((entry) => ({
        category_id: entry.category_id,
        price_from: entry.price_from,
        price_to: entry.price_to,
      })),
    };
    const result = computeMatchScore(request, provider);
    if (!result) continue;
    statements.push(
      db.prepare(
        `INSERT OR IGNORE INTO service_request_matches
          (id, request_id, provider_id, score, distance_km, category_match, rating_bonus, urgency_bonus, budget_fit, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      ).bind(crypto.randomUUID(), requestId, provider.id, result.score, result.distanceKm, result.categoryMatch ? 1 : 0, result.ratingBonus, result.urgencyBonus, result.budgetFit ? 1 : 0, nowSql()),
    );
  }
  if (statements.length) await db.batch(statements);
}

async function seedDemoJob(db: SeedDb): Promise<void> {
  const existing = await db.prepare("SELECT COUNT(*) AS count FROM service_orders WHERE status = 'completed'").bind().first<{ count: number }>();
  if (existing && Number(existing.count) > 0) return;

  const request = await db
    .prepare("SELECT * FROM service_requests WHERE reference_number = 'SR-2026-1001'")
    .bind()
    .first<Record<string, unknown>>();
  const provider = await db
    .prepare("SELECT * FROM service_provider_profiles WHERE user_id = 'provider1@localhost.akarpromax'")
    .bind()
    .first<Record<string, unknown>>();
  if (!request || !provider) return;

  const requestId = String(request.id);
  const providerUserId = String(provider.user_id);
  const customerUserId = String(request.customer_user_id);
  const orderId = crypto.randomUUID();
  const offerId = crypto.randomUUID();
  const acceptedAt = nowSql();
  const completedAt = nowSql();

  await db
    .prepare(
      `INSERT INTO service_offers
        (id, request_id, provider_user_id, listing_id, price, currency, duration_days, message_key, status,
         materials_included, material_cost, labor_cost, visit_fee, tax_amount, total_price, duration_text,
         nearest_date, offer_notes, terms, valid_until, needs_visit, created_at, updated_at)
       VALUES (?1, ?2, ?3, NULL, 25, 'OMR', 30, NULL, 'accepted', 0, 5, 20, 0, 0, 25, '30 يوم', NULL,
         'عرض نظافة شامل مع المواد', 'سعر ثابت، تجديد تلقائي شهري', NULL, 1, ?4, ?4)`,
    )
    .bind(offerId, requestId, providerUserId, acceptedAt)
    .run();

  await db
    .prepare(
      `INSERT INTO service_orders
        (id, request_id, offer_id, customer_user_id, provider_user_id, price, currency, status,
         accepted_at, started_at, completed_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 25, 'OMR', 'completed', ?6, ?6, ?7, ?6, ?7)`,
    )
    .bind(orderId, requestId, offerId, customerUserId, providerUserId, acceptedAt, completedAt)
    .run();

  await db
    .prepare("UPDATE service_requests SET status = 'completed', updated_at = ?1 WHERE id = ?2")
    .bind(completedAt, requestId)
    .run();

  const timeline = [
    { event: "offer_accepted", from: "receiving_offers", to: "offer_selected", note: "تم قبول عرض النظافة" },
    { event: "order_scheduled", from: "offer_selected", to: "scheduled", note: "تم جدولة أول زيارة يوم السبت" },
    { event: "order_in_progress", from: "scheduled", to: "in_progress", note: "بدأت خدمة النظافة الأسبوعية" },
    { event: "order_completed", from: "in_progress", to: "completed", note: "اكتملت الخدمة بنجاح" },
  ];
  const timelineStatements = timeline.map((entry) =>
    db.prepare(
      `INSERT INTO service_job_timeline (id, order_id, event, actor_user_id, from_status, to_status, note, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    ).bind(crypto.randomUUID(), orderId, entry.event, providerUserId, entry.from, entry.to, entry.note, acceptedAt),
  );
  await db.batch(timelineStatements);

  const review1 = crypto.randomUUID();
  const review2 = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO service_reviews
        (id, order_id, reviewer_user_id, reviewee_user_id, rating, comment,
         quality_rating, punctuality_rating, communication_rating, value_rating, recommend, created_at)
       VALUES (?1, ?2, ?3, ?4, 5, 'فريق محترف والتزام في المواعيد', 5, 5, 5, 4, 1, ?5)`,
    )
    .bind(review1, orderId, customerUserId, providerUserId, acceptedAt)
    .run();
  await db
    .prepare(
      `INSERT INTO service_reviews
        (id, order_id, reviewer_user_id, reviewee_user_id, rating, comment, created_at)
       VALUES (?1, ?2, ?3, ?4, 5, 'عميل ملتزم وسهل التواصل', ?5)`,
    )
    .bind(review2, orderId, providerUserId, customerUserId, acceptedAt)
    .run();

  await db
    .prepare(
      `UPDATE service_provider_profiles
       SET rating_avg = ?1, rating_count = ?2, jobs_completed = ?3, updated_at = ?4
       WHERE id = ?5`,
    )
    .bind(4.8, 88, 215, completedAt, String(provider.id))
    .run();
}
