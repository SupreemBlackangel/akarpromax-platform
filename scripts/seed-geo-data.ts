import { getDb } from '@/lib/db';
import { countries, governorates, cities, districts, streets } from '@/lib/db/schemas/geo-schema';

const SAUDI_ARABIA = {
  country: {
    code: 'SA',
    nameAr: 'السعودية',
    nameEn: 'Saudi Arabia',
    nameTr: 'Suudi Arabistan',
    phoneCode: '+966',
    currencyCode: 'SAR',
  },
  governorates: [
    { code: 'RIYADH', nameAr: 'الرياض', nameEn: 'Riyadh' },
    { code: 'MAKKAH', nameAr: 'مكة المكرمة', nameEn: 'Makkah' },
    { code: 'MADINAH', nameAr: 'المدينة المنورة', nameEn: 'Madinah' },
    { code: 'EASTERN', nameAr: 'الشرقية', nameEn: 'Eastern Province' },
    { code: 'ASIR', nameAr: 'عسير', nameEn: 'Asir' },
    { code: 'TABUK', nameAr: 'تبوك', nameEn: 'Tabuk' },
    { code: 'HAIL', nameAr: 'حائل', nameEn: 'Hail' },
    { code: 'NORTHERN', nameAr: 'الحدود الشمالية', nameEn: 'Northern Borders' },
    { code: 'JAZAN', nameAr: 'جازان', nameEn: 'Jazan' },
    { code: 'NAJRAN', nameAr: 'نجران', nameEn: 'Najran' },
    { code: 'BAHA', nameAr: 'الباحة', nameEn: 'Al-Baha' },
    { code: 'JOUF', nameAr: 'الجوف', nameEn: 'Al-Jouf' },
    { code: 'QASSIM', nameAr: 'القصيم', nameEn: 'Qassim' },
  ],
  cities: {
    RIYADH: [
      { code: 'RIYADH', nameAr: 'الرياض', nameEn: 'Riyadh' },
      { code: 'KHARJ', nameAr: 'الخرج', nameEn: 'Al-Kharj' },
      { code: 'DUWADIMI', nameAr: 'الدوادمي', nameEn: 'Al-Duwadimi' },
    ],
    MAKKAH: [
      { code: 'MAKKAH', nameAr: 'مكة المكرمة', nameEn: 'Makkah' },
      { code: 'JEDDAH', nameAr: 'جدة', nameEn: 'Jeddah' },
      { code: 'TAIF', nameAr: 'الطائف', nameEn: 'Taif' },
    ],
    MADINAH: [
      { code: 'MADINAH', nameAr: 'المدينة المنورة', nameEn: 'Madinah' },
      { code: 'YANBU', nameAr: 'ينبع', nameEn: 'Yanbu' },
    ],
    EASTERN: [
      { code: 'DAMMAM', nameAr: 'الدمام', nameEn: 'Dammam' },
      { code: 'KHOBAR', nameAr: 'الخبر', nameEn: 'Al-Khobar' },
      { code: 'DHAHRAN', nameAr: 'الظهران', nameEn: 'Dhahran' },
    ],
  },
  districts: {
    RIYADH: [
      { code: 'OLAYA', nameAr: 'العليا', nameEn: 'Olaya' },
      { code: 'NAKHEEL', nameAr: 'النخيل', nameEn: 'Al-Nakheel' },
      { code: 'MALAZ', nameAr: 'الملز', nameEn: 'Al-Malaz' },
    ],
    JEDDAH: [
      { code: 'SAFA', nameAr: 'الصفا', nameEn: 'Al-Safa' },
      { code: 'RAWDAH', nameAr: 'الروضة', nameEn: 'Al-Rawdah' },
      { code: 'HAMRA', nameAr: 'الحمراء', nameEn: 'Al-Hamra' },
    ],
  },
  streets: {
    OLAYA: [
      { nameAr: 'طريق الملك فهد', nameEn: 'King Fahd Road' },
      { nameAr: 'شارع التحلية', nameEn: 'Tahlia Street' },
    ],
    SAFA: [
      { nameAr: 'شارع الأمير سلطان', nameEn: 'Prince Sultan Street' },
      { nameAr: 'شارع الأندلس', nameEn: 'Andalus Street' },
    ],
  },
};

async function seedGeo() {
  console.log('🌱 Seeding geo data...');
  const { db, end } = getDb();
  try {
    const existing = await db.select().from(countries).limit(1);
    if (existing.length > 0) {
      console.log('ℹ️ Geo data already exists. Skipping seed.');
      return;
    }

    const [country] = await db.insert(countries).values(SAUDI_ARABIA.country).returning();

    for (const gov of SAUDI_ARABIA.governorates) {
      const [govRecord] = await db.insert(governorates).values({
        countryId: country.id,
        code: gov.code,
        nameAr: gov.nameAr,
        nameEn: gov.nameEn,
      }).returning();

      const citiesData = (SAUDI_ARABIA.cities as Record<string, Array<{ code: string; nameAr: string; nameEn: string }>>)[gov.code] || [];
      for (const city of citiesData) {
        const [cityRecord] = await db.insert(cities).values({
          governorateId: govRecord.id,
          code: city.code,
          nameAr: city.nameAr,
          nameEn: city.nameEn,
        }).returning();

        const districtsData = (SAUDI_ARABIA.districts as Record<string, Array<{ code: string; nameAr: string; nameEn: string }>>)[city.code] || [];
        for (const district of districtsData) {
          const [districtRecord] = await db.insert(districts).values({
            cityId: cityRecord.id,
            code: district.code,
            nameAr: district.nameAr,
            nameEn: district.nameEn,
          }).returning();

          const streetsData = (SAUDI_ARABIA.streets as Record<string, Array<{ nameAr: string; nameEn: string }>>)[district.code] || [];
          for (const street of streetsData) {
            await db.insert(streets).values({
              districtId: districtRecord.id,
              nameAr: street.nameAr,
              nameEn: street.nameEn,
            });
          }
        }
      }
    }

    console.log('✅ Geo data seeded successfully.');
  } finally {
    await end();
  }
}

seedGeo().catch(console.error);
