export const COMPANY_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS company_specialties (
    id VARCHAR(32) PRIMARY KEY NOT NULL,
    label_ar TEXT NOT NULL,
    label_en TEXT NOT NULL,
    label_tr TEXT NOT NULL,
    icon TEXT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS organization_specialties (
    organization_id VARCHAR(36) NOT NULL,
    specialty_id VARCHAR(32) NOT NULL,
    PRIMARY KEY (organization_id, specialty_id)
  )`,
];

export const COMPANY_INDEXES_SQL: string[] = [
  `CREATE INDEX IF NOT EXISTS org_specialties_org_idx ON organization_specialties (organization_id)`,
  `CREATE INDEX IF NOT EXISTS org_specialties_spec_idx ON organization_specialties (specialty_id)`,
];

function isDuplicateKeyError(message: string): boolean {
  return /duplicate (key|index|column)|already exists/i.test(message);
}

export async function ensureCompanySchema(db: D1Database): Promise<void> {
  for (const sql of COMPANY_TABLES_SQL) {
    await db.prepare(sql).run();
  }
  for (const sql of COMPANY_INDEXES_SQL) {
    try {
      await db.prepare(sql).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isDuplicateKeyError(message)) throw error;
    }
  }
  await seedCompanySpecialties(db);
}

const SEED_COMPANY_SPECIALTIES: Array<{ id: string; labelAr: string; labelEn: string; labelTr: string; icon: string; sortOrder: number }> = [
  { id: "real-estate", labelAr: "عقارات", labelEn: "Real Estate", labelTr: "Emlak", icon: "🏘️", sortOrder: 1 },
  { id: "construction", labelAr: "construction", labelEn: "Construction", labelTr: "Insaat", icon: "🏗️", sortOrder: 2 },
  { id: "interior-design", labelAr: "تصميم داخلي", labelEn: "Interior Design", labelTr: "Ic Mimarlik", icon: "🎨", sortOrder: 3 },
  { id: "legal-services", labelAr: "خدمات قانونية", labelEn: "Legal Services", labelTr: "Hukuki Hizmetler", icon: "⚖️", sortOrder: 4 },
  { id: "financial-services", labelAr: "خدمات مالية", labelEn: "Financial Services", labelTr: "Finansal Hizmetler", icon: "💰", sortOrder: 5 },
  { id: "insurance", labelAr: "تأمين", labelEn: "Insurance", labelTr: "Sigorta", icon: "🛡️", sortOrder: 6 },
  { id: "technology", labelAr: "تكنولوجيا", labelEn: "Technology", labelTr: "Teknoloji", icon: "💻", sortOrder: 7 },
  { id: "marketing", labelAr: "تسويق", labelEn: "Marketing", labelTr: "Pazarlama", icon: "📣", sortOrder: 8 },
  { id: "logistics", labelAr: "لوجستيات", labelEn: "Logistics", labelTr: "Lojistik", icon: "🚚", sortOrder: 9 },
  { id: "hospitality", labelAr: "ضيافة و سياحة", labelEn: "Hospitality & Tourism", labelTr: "Konaklama ve Turizm", icon: "🏨", sortOrder: 10 },
  { id: "education", labelAr: "تعليم", labelEn: "Education", labelTr: "Egitim", icon: "📚", sortOrder: 11 },
  { id: "healthcare", labelAr: "رعاية صحية", labelEn: "Healthcare", labelTr: "Saglik", icon: "🏥", sortOrder: 12 },
  { id: "automotive", labelAr: "سيارات", labelEn: "Automotive", labelTr: "Otomotiv", icon: "🚗", sortOrder: 13 },
  { id: "retail", labelAr: "تجزئة", labelEn: "Retail", labelTr: "Perakende", icon: "🛍️", sortOrder: 14 },
  { id: "food-beverage", labelAr: "أغذية و مشروبات", labelEn: "Food & Beverage", labelTr: "Gida ve Icecek", icon: "🍽️", sortOrder: 15 },
];

async function seedCompanySpecialties(db: D1Database): Promise<void> {
  const existing = await db.prepare("SELECT COUNT(*) AS count FROM company_specialties").first<{ count: number }>();
  if (existing && Number(existing.count) > 0) return;
  const stmts = SEED_COMPANY_SPECIALTIES.map((s) =>
    db.prepare(
      `INSERT OR IGNORE INTO company_specialties (id, label_ar, label_en, label_tr, icon, is_active, sort_order)
       VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)`,
    ).bind(s.id, s.labelAr, s.labelEn, s.labelTr, s.icon, s.sortOrder),
  );
  await db.batch(stmts);
}
