import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('settlement freezes a printable HTML contract document and SHA-256 hash', () => {
  const src = read('lib/auctions/settlement.ts');
  assert.match(src, /buildContractDocumentHtml/);
  assert.match(src, /documentHash = createHash\('sha256'\)/);
  assert.match(src, /documentFilename/);
  assert.match(src, /Snapshot ط«ط§ط¨طھ/);
});

test('contract endpoint exposes private immutable HTML with security headers', () => {
  const src = read('app/api/auctions/[id]/contract/route.ts');
  assert.match(src, /format'\) === 'html'/);
  assert.match(src, /X-Contract-Document-SHA256/);
  assert.match(src, /Content-Security-Policy/);
  assert.match(src, /getClosedAuctionOrganizer/);
});

test('party acceptance is row-locked, hash-bound and seller buyer only', () => {
  const src = read('app/api/auctions/[id]/contract/sign/route.ts');
  assert.match(src, /\.for\('update'\)/);
  assert.match(src, /CONTRACT_HASH_MISMATCH/);
  assert.match(src, /CONTRACT_PARTY_ONLY/);
  assert.match(src, /auctionContractSignatures/);
  assert.match(src, /CONTRACT_PARTY_SIGNED/);
  assert.match(src, /CONTRACT_SIGNED/);
});

test('F3 migration persists document metadata and signature audit rows', () => {
  const sql = read('drizzle-pg/0012_auction_contract_closure_f3.sql');
  assert.match(sql, /document_html/);
  assert.match(sql, /document_hash/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "auction_contract_signatures"/);
  assert.match(sql, /auction_contract_signatures_party_uidx/);
});
