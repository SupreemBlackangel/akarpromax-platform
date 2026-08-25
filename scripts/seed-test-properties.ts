import { getDb } from "@/lib/db";
import { properties } from "@/lib/db/schemas/properties-schema";
import { sql } from "drizzle-orm";

const TEST_PROPERTIES = [
  {
    titleAr: "فيلا فاخرة للبيع في حي النخيل",
    titleEn: "Luxury Villa for Sale in Al Nakheel",
    descriptionAr: "فيلا حديثة مكونة من دورين مع حديقة ومسبح",
    descriptionEn: "Modern two-story villa with garden and pool",
    dealType: "sale",
    category: "residential",
    propertyType: "villa",
    country: "السعودية",
    governorate: "الرياض",
    city: "الرياض",
    district: "النخيل",
    latitude: "24.7136",
    longitude: "46.6753",
    address: "حي النخيل، الرياض",
    price: "2500000",
    currency: "SAR",
    area: "400",
    bedrooms: 5,
    bathrooms: 4,
    status: "approved",
    isFeatured: true,
    isVerified: true,
  },
  {
    titleAr: "شقة فاخرة للإيجار في حي الروضة",
    titleEn: "Luxury Apartment for Rent in Al Rawdah",
    descriptionAr: "شقة 3 غرف في موقع ممتاز",
    descriptionEn: "3-bedroom apartment in excellent location",
    dealType: "rent",
    category: "residential",
    propertyType: "apartment",
    country: "السعودية",
    governorate: "الرياض",
    city: "الرياض",
    district: "الروضة",
    latitude: "24.6877",
    longitude: "46.7219",
    address: "حي الروضة، الرياض",
    price: "80000",
    currency: "SAR",
    area: "150",
    bedrooms: 3,
    bathrooms: 2,
    status: "approved",
    isFeatured: false,
    isVerified: true,
  },
  {
    titleAr: "أرض سكنية للبيع في حي الملقا",
    titleEn: "Residential Land for Sale in Al Malqa",
    descriptionAr: "أرض سكنية على شارعين في حي الملقا",
    descriptionEn: "Residential land on two streets in Al Malqa",
    dealType: "sale",
    category: "land",
    propertyType: "land",
    country: "السعودية",
    governorate: "الرياض",
    city: "الرياض",
    district: "الملقا",
    latitude: "24.7545",
    longitude: "46.6127",
    address: "حي الملقا، الرياض",
    price: "1200000",
    currency: "SAR",
    area: "750",
    status: "approved",
    isFeatured: true,
    isVerified: true,
  },
];

async function seed() {
  console.log("Seeding test properties...");
  const { db, end } = getDb();
  try {
    const existing = await db.select({ count: sql<number>`count(*)` }).from(properties);
    if (existing[0].count > 0) {
      console.log(`Properties already exist (${existing[0].count} rows). Skipping seed.`);
      return;
    }
    for (const prop of TEST_PROPERTIES) {
      await db.insert(properties).values(prop);
    }
    console.log(`Seeded ${TEST_PROPERTIES.length} test properties.`);
  } finally {
    await end();
  }
}
seed().catch(console.error);
