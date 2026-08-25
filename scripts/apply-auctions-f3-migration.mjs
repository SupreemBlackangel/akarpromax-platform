import fs from 'node:fs';
import pg from 'pg';

const { Client } = pg;
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('AUCTIONS F3 DATABASE MIGRATION: FAIL - DATABASE_URL missing');
  process.exit(2);
}

const local = /localhost|127\.0\.0\.1/i.test(url);
const client = new Client({
  connectionString: url,
  ssl: local ? false : { rejectUnauthorized: false },
});

const migration = fs.readFileSync('drizzle-pg/0012_auction_contract_closure_f3.sql', 'utf8');

try {
  await client.connect();
  await client.query('BEGIN');
  await client.query(migration);
  await client.query('COMMIT');

  const columns = await client.query(`
    select column_name from information_schema.columns
    where table_schema='public' and table_name='auction_contracts'
      and column_name = any($1::text[])
  `, [['document_html','document_hash','document_mime','document_filename','seller_signed_at','buyer_signed_at']]);
  if (columns.rowCount !== 6) throw new Error('missing auction contract F3 columns');

  const table = await client.query(`
    select 1 from information_schema.tables
    where table_schema='public' and table_name='auction_contract_signatures'
  `);
  if (table.rowCount !== 1) throw new Error('missing auction_contract_signatures table');

  console.log('AUCTIONS F3 DATABASE MIGRATION: PASS');
  console.log('CONTRACT DOCUMENT COLUMNS: 6/6');
  console.log('SIGNATURE TABLE: PASS');
} catch (error) {
  try { await client.query('ROLLBACK'); } catch {}
  console.error('AUCTIONS F3 DATABASE MIGRATION: FAIL');
  console.error(error?.stack || error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
