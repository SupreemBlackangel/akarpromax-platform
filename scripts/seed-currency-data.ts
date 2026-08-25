import { getDb } from '@/lib/db';
import { currencies } from '@/lib/db/schemas/currency-schema';

const CURRENCIES = [
  { code: 'SAR', symbol: 'ر.س', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', nameTr: 'Suudi Riyali', exchangeRateToUSD: '3.75', isDefault: true },
  { code: 'AED', symbol: 'د.إ', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', nameTr: 'BAE Dirhemi', exchangeRateToUSD: '3.67', isDefault: false },
  { code: 'KWD', symbol: 'د.ك', nameAr: 'دينار كويتي', nameEn: 'Kuwaiti Dinar', nameTr: 'Kuveyt Dinarı', exchangeRateToUSD: '0.31', isDefault: false },
  { code: 'QAR', symbol: 'ر.ق', nameAr: 'ريال قطري', nameEn: 'Qatari Riyal', nameTr: 'Katar Riyali', exchangeRateToUSD: '3.64', isDefault: false },
  { code: 'BHD', symbol: 'د.ب', nameAr: 'دينار بحريني', nameEn: 'Bahraini Dinar', nameTr: 'Bahreyn Dinarı', exchangeRateToUSD: '0.38', isDefault: false },
  { code: 'OMR', symbol: 'ر.ع', nameAr: 'ريال عماني', nameEn: 'Omani Rial', nameTr: 'Umman Riyali', exchangeRateToUSD: '0.38', isDefault: false },
  { code: 'EGP', symbol: 'ج.م', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound', nameTr: 'Mısır Lirası', exchangeRateToUSD: '48.50', isDefault: false },
  { code: 'JOD', symbol: 'د.أ', nameAr: 'دينار أردني', nameEn: 'Jordanian Dinar', nameTr: 'Ürdün Dinarı', exchangeRateToUSD: '0.71', isDefault: false },
  { code: 'SYP', symbol: 'ل.س', nameAr: 'ليرة سورية', nameEn: 'Syrian Pound', nameTr: 'Suriye Lirası', exchangeRateToUSD: '13000', isDefault: false },
  { code: 'TRY', symbol: '₺', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira', nameTr: 'Türk Lirası', exchangeRateToUSD: '34.00', isDefault: false },
  { code: 'USD', symbol: '$', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', nameTr: 'ABD Doları', exchangeRateToUSD: '1.00', isDefault: false },
  { code: 'EUR', symbol: '€', nameAr: 'يورو', nameEn: 'Euro', nameTr: 'Euro', exchangeRateToUSD: '1.08', isDefault: false },
];

async function seedCurrencies() {
  console.log('🌱 Seeding currencies...');
  const { db, end } = getDb();
  try {
    const existing = await db.select().from(currencies).limit(1);
    if (existing.length > 0) {
      console.log('ℹ️ Currencies already exist. Skipping seed.');
      return;
    }
    for (const currency of CURRENCIES) {
      await db.insert(currencies).values({ ...currency, id: currency.code });
    }
    console.log(`✅ Seeded ${CURRENCIES.length} currencies.`);
  } finally {
    await end();
  }
}

seedCurrencies().catch(console.error);
