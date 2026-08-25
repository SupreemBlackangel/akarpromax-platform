import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('auction creation exists and closed auctions are organizer-restricted', () => {
  const src = read('app/api/auctions/route.ts');
  assert.match(src, /export async function POST/);
  assert.match(src, /getClosedAuctionOrganizer/);
  assert.match(src, /CLOSED_AUCTION_ORGANIZER_FORBIDDEN/);
  assert.match(src, /AUCTION_OFFER_REQUIRED/);
});

test('bids are transactional, row-locked, idempotent and block self-bids', () => {
  const src = read('app/api/auctions/[id]/bid/route.ts');
  assert.match(src, /db\.transaction/);
  assert.match(src, /\.for\('update'\)/);
  assert.match(src, /SELF_BID_FORBIDDEN/);
  assert.match(src, /idempotency-key/i);
  assert.match(src, /ensureTermsAcceptance/);
  assert.match(src, /auctionBidIncrement/);
});

test('auction detail never returns bidderId in public bid projection', () => {
  const src = read('app/api/auctions/[id]/route.ts');
  const projection = src.match(/\.select\(\{([\s\S]*?)\}\)\s*\.from\(auctionBids\)/)?.[1] || '';
  assert.ok(projection.length > 0, 'bid projection must exist');
  assert.doesNotMatch(projection, /bidderId/);
});

test('server refuses early ending and distinguishes open seller decision', () => {
  const src = read('app/api/auctions/[id]/end/route.ts');
  assert.match(src, /AUCTION_NOT_FINISHED/);
  assert.match(src, /awaiting_seller_decision/);
  assert.match(src, /settleAuction/);
});

test('settlement creates immutable award and hashed contract', () => {
  const src = read('lib/auctions/settlement.ts');
  assert.match(src, /auctionAwards/);
  assert.match(src, /auctionContracts/);
  assert.match(src, /createHash\('sha256'\)/);
  assert.match(src, /propertySnapshot/);
  assert.match(src, /termsSnapshot/);
});

test('auction terms acceptance persistence migration exists', () => {
  const sql = read('drizzle-pg/0011_auction_hardening_f1.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "auction_terms_acceptance"/);
  assert.match(sql, /auction_terms_acceptance_uidx/);
  assert.match(sql, /auction_bids_idempotency_uidx/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "auction_awards"/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "auction_contracts"/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "auction_events"/);
});

test('open auction seller decision is seller-only', () => {
  const src = read('app/api/auctions/[id]/decision/route.ts');
  assert.match(src, /property\.userId !== session\.userId/);
  assert.match(src, /SELLER_ONLY/);
  assert.match(src, /action === 'reject'/);
  assert.match(src, /settleAuction/);
});

test('contract access is private to parties organizer or admin', () => {
  const src = read('app/api/auctions/[id]/contract/route.ts');
  assert.match(src, /contract\.sellerId === session\.userId/);
  assert.match(src, /contract\.buyerId === session\.userId/);
  assert.match(src, /getClosedAuctionOrganizer/);
  assert.match(src, /status: 403/);
});
