#!/usr/bin/env node
/**
 * TEMPORARY demo providers, so the services hub can be looked at with
 * something in it. The owner asked for these on 2026-09-06 and said they will
 * be removed; this script removes them.
 *
 * Every row it writes has an id beginning `demo-provider-`, in this table and
 * in service_provider_categories, and NOTHING else in the database carries that
 * prefix. So the cleanup is exact and needs no judgement:
 *
 *   node scripts/seed-demo-providers.mjs --remove
 *
 * One of the ten is `is_featured`, which is what the hub reads to fill the paid
 * placement at the foot of the page; the other nine fill the grid.
 *
 *   node scripts/seed-demo-providers.mjs --dry-run
 *   node scripts/seed-demo-providers.mjs
 *
 * These are NOT real businesses. The names are invented and marked so in the
 * bio, so nobody mistakes a demo row for a company that exists.
 */

import pg from "pg";

const DRY = process.argv.includes("--dry-run");
const REMOVE = process.argv.includes("--remove");
const PREFIX = "demo-provider-";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

/** Where the office is, so the hub's local scope finds them. */
const PLACE = { country: "SA", governorate: "MAKKAH", city: "JEDDAH" };

const DEMO_BIO_MARK = "بيانات تجريبية للعرض";

const PROVIDERS = [
  { slug: "alnukhba", name: "مؤسسة النخبة للصيانة", trade: "maintenance", bio: "صيانة عامة وتكييف وسباكة لمنازل ومكاتب جدة.", rating: 4.9, ratings: 128, jobs: 340, featured: true },
  { slug: "albina", name: "شركة البناء المتين للمقاولات", trade: "construction", bio: "مقاولات عامة وتشييد مبانٍ سكنية وتجارية.", rating: 4.8, ratings: 96, jobs: 212 },
  { slug: "lamsa", name: "لمسة للتشطيبات الداخلية", trade: "finishing", bio: "تشطيبات وديكورات داخلية وأعمال جبس وأصباغ.", rating: 4.7, ratings: 74, jobs: 158 },
  { slug: "safa", name: "الصفا لخدمات التنظيف", trade: "cleaning", bio: "تنظيف منازل ومكاتب وواجهات وخزانات مياه.", rating: 4.6, ratings: 210, jobs: 512 },
  { slug: "alsari", name: "الساري للنقل والتغليف", trade: "moving", bio: "نقل عفش وتغليف وفك وتركيب داخل جدة وخارجها.", rating: 4.5, ratings: 143, jobs: 389 },
  { slug: "alwaha", name: "الواحة للأعمال الخارجية", trade: "outdoor", bio: "تنسيق حدائق ومظلات وسواتر ومسابح.", rating: 4.6, ratings: 61, jobs: 121 },
  { slug: "meqyas", name: "مكتب مقياس للهندسة والاستشارات", trade: "engineering", bio: "تصميم معماري وإشراف هندسي ورخص بناء.", rating: 4.9, ratings: 52, jobs: 88 },
  { slug: "aldiqqa", name: "الدقة العالية للمساحة", trade: "realestate-services", bio: "مساحة أراضٍ ورفع مساحي وتقارير فنية.", rating: 4.8, ratings: 39, jobs: 94 },
  { slug: "raqim", name: "رقيم للخدمات المهنية", trade: "professional", bio: "محاسبة وتوثيق ومعاملات حكومية.", rating: 4.4, ratings: 27, jobs: 63 },
  { slug: "sanad", name: "سند للخدمات العامة", trade: "general", bio: "خدمات متنوعة للمنازل والمنشآت الصغيرة.", rating: 4.3, ratings: 18, jobs: 41 },
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query("SET search_path = public, akarpromax");

try {
  if (REMOVE) {
    if (DRY) {
      const { rows } = await client.query(
        "SELECT count(*)::int AS n FROM service_provider_profiles WHERE id LIKE $1",
        [`${PREFIX}%`],
      );
      console.log(`DRY RUN — would delete ${rows[0].n} demo provider(s) and their category links`);
    } else {
      await client.query("BEGIN");
      const links = await client.query("DELETE FROM service_provider_categories WHERE provider_id LIKE $1", [`${PREFIX}%`]);
      const profiles = await client.query("DELETE FROM service_provider_profiles WHERE id LIKE $1", [`${PREFIX}%`]);
      await client.query("COMMIT");
      console.log(`removed ${profiles.rowCount} demo provider(s) and ${links.rowCount} category link(s)`);
    }
  } else {
    if (!DRY) await client.query("BEGIN");
    let written = 0;
    for (const [index, provider] of PROVIDERS.entries()) {
      const id = `${PREFIX}${provider.slug}`;
      const categoryId = `svc-${PLACE.country}-${provider.trade}`;
      if (!DRY) {
        await client.query(
          `INSERT INTO service_provider_profiles
             (id, user_id, display_name_ar, display_name_en, bio_ar, business_name, is_business,
              country_code, governorate, city_id, status, approved_at, verified_at,
              rating_avg, rating_count, jobs_completed, completion_rate, response_rate,
              is_featured, featured_rank, is_accepting_requests)
           VALUES ($1, $2, $3, $4, $5, $3, 1, $6, $7, $8, 'approved', now(), now(),
                   $9, $10, $11, 98, 96, $12, $13, 1)
           ON CONFLICT (id) DO UPDATE SET
             display_name_ar = EXCLUDED.display_name_ar, bio_ar = EXCLUDED.bio_ar,
             business_name = EXCLUDED.business_name, status = EXCLUDED.status,
             rating_avg = EXCLUDED.rating_avg, rating_count = EXCLUDED.rating_count,
             jobs_completed = EXCLUDED.jobs_completed,
             is_featured = EXCLUDED.is_featured, featured_rank = EXCLUDED.featured_rank,
             updated_at = now()`,
          [
            id, `${PREFIX}user-${provider.slug}`, provider.name, provider.slug,
            `${provider.bio} (${DEMO_BIO_MARK})`,
            PLACE.country, PLACE.governorate, PLACE.city,
            provider.rating, provider.ratings, provider.jobs,
            provider.featured ? 1 : 0, index,
          ],
        );
        await client.query(
          `INSERT INTO service_provider_categories (id, provider_id, category_id, is_active)
           VALUES ($1, $2, $3, 1) ON CONFLICT (id) DO NOTHING`,
          [`${PREFIX}cat-${provider.slug}`, id, categoryId],
        );
      }
      written += 1;
      console.log(`  ${DRY ? "would write" : "wrote"}  ${id.padEnd(32)} ${provider.featured ? "(the paid placement)" : provider.trade}`);
    }
    if (!DRY) await client.query("COMMIT");
    console.log(DRY ? "\nDRY RUN — nothing was written" : "\ncommitted");
    console.log(`  ${written} demo provider(s). Remove them with: node scripts/seed-demo-providers.mjs --remove`);
  }
} catch (error) {
  if (!DRY) await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
