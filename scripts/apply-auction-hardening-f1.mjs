import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('AUCTIONS F1 MIGRATION: FAIL - DATABASE_URL missing');
  process.exit(2);
}

const local = /localhost|127\.0\.0\.1/i.test(url);
const client = new Client({
  connectionString: url,
  ssl: local ? false : { rejectUnauthorized: false },
});

const migrationPath = path.join(process.cwd(), 'drizzle-pg', '0011_auction_hardening_f1.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');

try {
  await client.connect();
  await client.query('BEGIN');
  await client.query(migration);
  await client.query('COMMIT');

  const requiredTables = ['auction_terms', 'auction_terms_acceptance', 'auction_awards', 'auction_contracts', 'auction_events'];
  const tableRows = await client.query(
    `select table_name from information_schema.tables where table_schema='public' and table_name = any($1::text[])`,
    [requiredTables],
  );
  const foundTables = new Set(tableRows.rows.map((row) => row.table_name));
  for (const table of requiredTables) {
    if (!foundTables.has(table)) throw new Error(`missing table ${table}`);
  }

  const propertyColumns = await client.query(
    `select column_name from information_schema.columns where table_schema='public' and table_name='properties' and column_name = any($1::text[])`,
    [['auction_start_date', 'auction_organizer_organization_id', 'auction_created_by_user_id']],
  );
  if (propertyColumns.rowCount !== 3) throw new Error('missing auction property hardening columns');

  const bidColumns = await client.query(
    `select column_name from information_schema.columns where table_schema='public' and table_name='auction_bids' and column_name = any($1::text[])`,
    [['property_id', 'idempotency_key', 'invalidated_at', 'invalidated_by', 'invalidation_reason']],
  );
  if (bidColumns.rowCount !== 5) throw new Error('missing auction bid hardening columns');

  const terms = await client.query(`select role, version, content_hash from auction_terms where is_active=true order by role`);
  if (terms.rowCount < 2) throw new Error('seller/bidder terms were not seeded');

  console.log('AUCTIONS F1 DATABASE MIGRATION: PASS');
  console.log(`TABLES: ${requiredTables.length}/${requiredTables.length}`);
  console.log(`ACTIVE TERMS: ${terms.rowCount}`);
} catch (error) {
  try { await client.query('ROLLBACK'); } catch {}
  console.error('AUCTIONS F1 DATABASE MIGRATION: FAIL');
  console.error(error?.stack || error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
