import fs from 'node:fs';
import crypto from 'node:crypto';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;
const BASE = process.env.AUCTIONS_E2E_BASE || 'http://localhost:3014';

if (!DATABASE_URL) {
  console.error('AUCTIONS F2 E2E: FAIL - DATABASE_URL missing');
  process.exit(2);
}

const sql = postgres(DATABASE_URL, { max: 6, prepare: false });
const stamp = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const password = `Akar!${crypto.randomBytes(9).toString('hex')}`;
const checks = [];

const ids = {
  users: [],
  orgs: [],
  properties: [],
};

function ok(condition, name, detail = '') {
  if (!condition) throw new Error(`${name}${detail ? ` :: ${detail}` : ''}`);
  checks.push(name);
  console.log(`PASS  ${name}`);
}

function hashText(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function api(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    Origin: BASE,
    ...(options.headers || {}),
  };

  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.cookie) headers.Cookie = options.cookie;

  const response = await fetch(`${BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: 'manual',
  });

  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}

  return { status: response.status, response, text, json };
}

function sessionCookie(response) {
  const list = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  const hit = list.find((value) => value.startsWith('akar_session='));
  return hit ? hit.split(';', 1)[0] : null;
}

async function createUser(label, role = 'user') {
  const email = `auction.${label}.${stamp}@example.invalid`;
  const hash = await bcrypt.hash(password, 12);
  const [row] = await sql`
    insert into users
      (email, email_verified_at, name, password_hash, role, status, is_active, preferred_language, created_at)
    values
      (${email}, now(), ${`Auction E2E ${label}`}, ${hash}, ${role}, 'active', true, 'ar', now())
    returning id, email
  `;
  ids.users.push(row.id);
  return row;
}

async function login(user) {
  const r = await api('/api/auth/login', {
    method: 'POST',
    body: { identifier: user.email, password },
  });
  ok(r.status === 200, `LOGIN ${user.email}`, `HTTP ${r.status} ${r.text}`);
  const cookie = sessionCookie(r.response);
  ok(Boolean(cookie), `SESSION ${user.email}`);
  return cookie;
}

async function createOrg({ ownerId, label, type, verified }) {
  const slug = `auc-${label}-${stamp}`.toLowerCase();
  const [org] = await sql`
    insert into organizations
      (name_ar, name_en, slug, type, classification, country_code, city_id, status, verified_at, approved_at, created_at, updated_at)
    values
      (${`منظمة اختبار ${label}`}, ${`Auction ${label}`}, ${slug}, ${type}, 'established', 'SA', 'Jeddah', 'active', ${verified ? sql`now()` : null}, now(), now(), now())
    returning id, type
  `;
  ids.orgs.push(org.id);

  await sql`
    insert into organization_members (organization_id, user_id, role, status, joined_at)
    values (${org.id}, ${ownerId}, 'owner', 'active', now())
  `;

  if (verified) {
    await sql`
      insert into verification_records
        (entity_type, entity_id, type, status, verified_at, source, country_code, created_at)
      values
        ('organization', ${org.id}, 'organization', 'verified', now(), 'manual', 'SA', now())
    `;
  }

  return org;
}

async function saleOfferType() {
  const [row] = await sql`
    select id, code, allow_fixed_auction, allow_open_auction
    from property_offer_types
    where code = 'SALE' and is_active = true
    limit 1
  `;
  ok(Boolean(row?.id), 'SALE OFFER TYPE AVAILABLE');
  ok(row.allow_fixed_auction === true && row.allow_open_auction === true, 'SALE SUPPORTS CLOSED + OPEN AUCTIONS');
  return row;
}

async function createAuctionProperty({ ownerId, officeId = null, label, auctionType, offerTypeId, startPrice }) {
  const [row] = await sql`
    insert into properties
      (user_id, office_id, title_ar, title_en, description_ar, description_en,
       deal_type, category, property_type, country, governorate, city, district,
       address, price, currency, area, status, approved_at, created_at, updated_at)
    values
      (${ownerId}, ${officeId}, ${`عقار مزاد ${label} ${stamp}`}, ${`Auction ${label} ${stamp}`},
       'عقار اختبار آلي للتحقق من محرك المزادات والتزامن والتسوية والعقود.',
       'Automated auction engine end-to-end verification property.',
       'sale', 'residential', 'apartment', 'SA', 'Makkah', 'Jeddah', 'Al Rawdah',
       'Jeddah Auction E2E', ${String(startPrice)}, 'SAR', '150.00', 'approved', now(), now(), now())
    returning id
  `;
  ids.properties.push(row.id);

  await sql`
    insert into property_offers
      (property_id, offer_type_id, marketing_method, auction_type, status, price, currency, negotiable, details, created_at, updated_at)
    values
      (${row.id}, ${offerTypeId}, 'auction', ${auctionType}, 'active', ${String(startPrice)}, 'SAR', false, '{}'::jsonb, now(), now())
  `;

  return row.id;
}

async function forceExpired(propertyId) {
  await sql`
    update properties
    set auction_end_date = now() - interval '1 minute', updated_at = now()
    where id = ${propertyId}
  `;
}

async function cleanup() {
  console.log('');
  console.log('CLEANUP...');

  for (const propertyId of [...ids.properties].reverse()) {
    try { await sql`delete from auction_contracts where property_id = ${propertyId}`; } catch {}
    try { await sql`delete from auction_awards where property_id = ${propertyId}`; } catch {}
    try { await sql`delete from auction_events where property_id = ${propertyId}`; } catch {}
    try { await sql`delete from auction_terms_acceptance where property_id = ${propertyId}`; } catch {}
    try { await sql`delete from auction_bids where property_id = ${propertyId}`; } catch {}
    try { await sql`delete from property_offers where property_id = ${propertyId}`; } catch {}
    try { await sql`delete from properties where id = ${propertyId}`; } catch {}
  }

  for (const orgId of [...ids.orgs].reverse()) {
    try { await sql`delete from verification_records where entity_type = 'organization' and entity_id = ${orgId}`; } catch {}
    try { await sql`delete from organization_members where organization_id = ${orgId}`; } catch {}
    try { await sql`delete from organizations where id = ${orgId}`; } catch {}
  }

  for (const userId of [...ids.users].reverse()) {
    try { await sql`delete from session_revocations where user_id = ${userId}`; } catch {}
    try { await sql`delete from users where id = ${userId}`; } catch {}
  }

  console.log('CLEANUP: DONE');
}

try {
  console.log('');
  console.log('======================================');
  console.log('AKARPROMAX AUCTIONS F2 PRODUCTION E2E');
  console.log('======================================');

  const seller = await createUser('seller');
  const lawOwner = await createUser('law');
  const bidder1 = await createUser('bidder1');
  const bidder2 = await createUser('bidder2');
  const outsider = await createUser('outsider');
  const businessOwner = await createUser('business');

  const sellerCookie = await login(seller);
  const lawCookie = await login(lawOwner);
  const bidder1Cookie = await login(bidder1);
  const bidder2Cookie = await login(bidder2);
  const outsiderCookie = await login(outsider);
  const businessCookie = await login(businessOwner);

  const reOrg = await createOrg({ ownerId: seller.id, label: 're', type: 'real_estate', verified: true });
  const unverifiedReOrg = await createOrg({ ownerId: seller.id, label: 'unverified-re', type: 'real_estate', verified: false });
  const lawOrg = await createOrg({ ownerId: lawOwner.id, label: 'law', type: 'law_office', verified: true });
  const businessOrg = await createOrg({ ownerId: businessOwner.id, label: 'business', type: 'business', verified: true });

  let r = await api('/api/auctions/organizers', { cookie: sellerCookie });
  ok(r.status === 200, 'ORGANIZER DISCOVERY HTTP 200');
  ok((r.json?.data || []).some((x) => x.id === reOrg.id), 'VERIFIED REAL ESTATE OFFICE ELIGIBLE');
  ok(!(r.json?.data || []).some((x) => x.id === unverifiedReOrg.id), 'UNVERIFIED REAL ESTATE OFFICE HIDDEN');

  r = await api('/api/auctions/organizers', { cookie: lawCookie });
  ok(r.status === 200 && (r.json?.data || []).some((x) => x.id === lawOrg.id), 'VERIFIED LAW OFFICE ELIGIBLE');

  r = await api('/api/auctions/organizers', { cookie: businessCookie });
  ok(r.status === 200 && !(r.json?.data || []).some((x) => x.id === businessOrg.id), 'BUSINESS ORGANIZATION NOT ELIGIBLE');

  r = await api('/api/auctions/x/terms');
  ok(r.status === 200 && r.json?.data?.seller && r.json?.data?.bidder, 'ACTIVE SELLER + BIDDER TERMS');
  ok(Boolean(r.json.data.seller.contentHash) && Boolean(r.json.data.bidder.contentHash), 'TERMS HASHES PRESENT');

  const sale = await saleOfferType();

  const fixedId = await createAuctionProperty({
    ownerId: seller.id,
    officeId: reOrg.id,
    label: 'closed-re',
    auctionType: 'fixed',
    offerTypeId: sale.id,
    startPrice: 1000,
  });

  const unverifiedId = await createAuctionProperty({
    ownerId: seller.id,
    officeId: unverifiedReOrg.id,
    label: 'closed-unverified',
    auctionType: 'fixed',
    offerTypeId: sale.id,
    startPrice: 1000,
  });

  const lawId = await createAuctionProperty({
    ownerId: lawOwner.id,
    officeId: lawOrg.id,
    label: 'closed-law',
    auctionType: 'fixed',
    offerTypeId: sale.id,
    startPrice: 1500,
  });

  const businessId = await createAuctionProperty({
    ownerId: businessOwner.id,
    officeId: businessOrg.id,
    label: 'closed-business',
    auctionType: 'fixed',
    offerTypeId: sale.id,
    startPrice: 1500,
  });

  const endDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  r = await api('/api/auctions', {
    method: 'POST', cookie: sellerCookie,
    body: {
      propertyId: unverifiedId,
      type: 'closed',
      organizerOrganizationId: unverifiedReOrg.id,
      startingPrice: 1000,
      bidIncrement: 100,
      endDate,
      acceptSellerTerms: true,
    },
  });
  ok(r.status === 403, 'UNVERIFIED OFFICE CLOSED AUCTION BLOCKED');

  r = await api('/api/auctions', {
    method: 'POST', cookie: businessCookie,
    body: {
      propertyId: businessId,
      type: 'closed',
      organizerOrganizationId: businessOrg.id,
      startingPrice: 1500,
      bidIncrement: 100,
      endDate,
      acceptSellerTerms: true,
    },
  });
  ok(r.status === 403, 'BUSINESS CLOSED AUCTION BLOCKED');

  r = await api('/api/auctions', {
    method: 'POST', cookie: outsiderCookie,
    body: {
      propertyId: fixedId,
      type: 'closed',
      organizerOrganizationId: reOrg.id,
      startingPrice: 1000,
      bidIncrement: 100,
      endDate,
      acceptSellerTerms: true,
    },
  });
  ok(r.status === 403, 'NON-MEMBER CLOSED AUCTION BLOCKED');

  r = await api('/api/auctions', {
    method: 'POST', cookie: lawCookie,
    body: {
      propertyId: lawId,
      type: 'closed',
      organizerOrganizationId: lawOrg.id,
      startingPrice: 1500,
      bidIncrement: 100,
      endDate,
      acceptSellerTerms: true,
    },
  });
  ok(r.status === 201 && r.json?.data?.auctionType === 'fixed', 'LAW OFFICE CLOSED AUCTION CREATE');

  r = await api('/api/auctions', {
    method: 'POST', cookie: sellerCookie,
    body: {
      propertyId: fixedId,
      type: 'closed',
      organizerOrganizationId: reOrg.id,
      startingPrice: 1000,
      bidIncrement: 100,
      minBid: 1100,
      maxBid: 5000,
      endDate,
      acceptSellerTerms: true,
    },
  });
  ok(r.status === 201, 'VERIFIED REAL ESTATE CLOSED AUCTION CREATE', `HTTP ${r.status} ${r.text}`);
  ok(r.json?.data?.auctionStatus === 'active' && r.json?.data?.auctionType === 'fixed', 'CLOSED AUCTION ACTIVE + CANONICAL FIXED');

  r = await api(`/api/auctions/${fixedId}`);
  ok(r.status === 200 && r.json?.data?.id === fixedId, 'PUBLIC CLOSED AUCTION DETAIL');
  ok(r.json?.data?.bidderTerms?.contentHash, 'PUBLIC BIDDER TERMS AVAILABLE');

  r = await api(`/api/auctions/${fixedId}/bid`, {
    method: 'POST', cookie: sellerCookie,
    headers: { 'Idempotency-Key': `self-${stamp}` },
    body: { amount: 1100, termsAccepted: true },
  });
  ok(r.status === 403, 'SELLER SELF-BID BLOCKED');

  r = await api(`/api/auctions/${fixedId}/bid`, {
    method: 'POST', cookie: bidder1Cookie,
    body: { amount: 1100, termsAccepted: true },
  });
  ok(r.status === 400, 'BID WITHOUT IDEMPOTENCY KEY BLOCKED');

  r = await api(`/api/auctions/${fixedId}/bid`, {
    method: 'POST', cookie: bidder1Cookie,
    headers: { 'Idempotency-Key': `no-terms-${stamp}` },
    body: { amount: 1100, termsAccepted: false },
  });
  ok(r.status === 400, 'BID WITHOUT TERMS BLOCKED');

  r = await api(`/api/auctions/${fixedId}/bid`, {
    method: 'POST', cookie: bidder1Cookie,
    headers: { 'Idempotency-Key': `low-${stamp}` },
    body: { amount: 1050, termsAccepted: true },
  });
  ok(r.status === 409, 'BID BELOW INCREMENT BLOCKED');

  const firstKey = `first-${stamp}`;
  r = await api(`/api/auctions/${fixedId}/bid`, {
    method: 'POST', cookie: bidder1Cookie,
    headers: { 'Idempotency-Key': firstKey },
    body: { amount: 1100, termsAccepted: true },
  });
  ok(r.status === 200 && r.json?.data?.idempotent === false, 'FIRST VALID BID');

  r = await api(`/api/auctions/${fixedId}/bid`, {
    method: 'POST', cookie: bidder1Cookie,
    headers: { 'Idempotency-Key': firstKey },
    body: { amount: 1800, termsAccepted: true },
  });
  ok(r.status === 200 && r.json?.data?.idempotent === true, 'DUPLICATE BID IDEMPOTENT');
  ok(Number(r.json?.data?.currentPrice) === 1100, 'IDEMPOTENT RETRY DOES NOT CHANGE PRICE');

  const race = await Promise.all([
    api(`/api/auctions/${fixedId}/bid`, {
      method: 'POST', cookie: bidder1Cookie,
      headers: { 'Idempotency-Key': `race-a-${stamp}` },
      body: { amount: 1200, termsAccepted: true },
    }),
    api(`/api/auctions/${fixedId}/bid`, {
      method: 'POST', cookie: bidder2Cookie,
      headers: { 'Idempotency-Key': `race-b-${stamp}` },
      body: { amount: 1200, termsAccepted: true },
    }),
  ]);

  const raceStatuses = race.map((x) => x.status).sort((a, b) => a - b);
  ok(raceStatuses[0] === 200 && raceStatuses[1] === 409, 'CONCURRENT EQUAL BIDS SERIALIZED');

  r = await api(`/api/auctions/${fixedId}/bid`, {
    method: 'POST', cookie: bidder2Cookie,
    headers: { 'Idempotency-Key': `winner-${stamp}` },
    body: { amount: 1400, termsAccepted: true },
  });
  ok(r.status === 200 && Number(r.json?.data?.currentPrice) === 1400, 'FINAL WINNING BID = 1400');

  const [fixedBeforeEnd] = await sql`
    select auction_current_price, auction_bid_count
    from properties where id = ${fixedId}
  `;
  ok(Number(fixedBeforeEnd.auction_current_price) === 1400, 'DATABASE CURRENT PRICE CORRECT');
  ok(Number(fixedBeforeEnd.auction_bid_count) === 3, 'IDEMPOTENCY + RACE BID COUNT CORRECT');

  await forceExpired(fixedId);

  r = await api(`/api/auctions/${fixedId}`, { cookie: outsiderCookie });
  ok(r.status === 200 && r.json?.data?.viewerActions?.canFinalizeExpiredAuction === false, 'OUTSIDER FINALIZE ACTION HIDDEN');

  r = await api(`/api/auctions/${fixedId}`, { cookie: sellerCookie });
  ok(r.status === 200 && r.json?.data?.viewerActions?.canFinalizeExpiredAuction === true, 'ORGANIZER FINALIZE ACTION ALLOWED');

  r = await api(`/api/auctions/${fixedId}/end`, { method: 'POST', cookie: outsiderCookie });
  ok(r.status === 403, 'OUTSIDER CANNOT END CLOSED AUCTION');

  r = await api(`/api/auctions/${fixedId}/end`, { method: 'POST', cookie: sellerCookie });
  ok(r.status === 200 && r.json?.data?.property?.auctionStatus === 'awarded', 'CLOSED AUCTION SETTLED');
  ok(r.json?.data?.award?.buyerId === bidder2.id, 'CORRECT CLOSED AUCTION WINNER');
  ok(Number(r.json?.data?.award?.finalPrice) === 1400, 'CORRECT CLOSED FINAL PRICE');
  ok(Boolean(r.json?.data?.contract?.contentHash), 'CLOSED CONTRACT GENERATED');

  r = await api(`/api/auctions/${fixedId}/end`, { method: 'POST', cookie: sellerCookie });
  ok(r.status === 200 && r.json?.data?.idempotent === true, 'CLOSED END IS IDEMPOTENT');

  r = await api(`/api/auctions/${fixedId}/contract`, { cookie: outsiderCookie });
  ok(r.status === 403, 'CONTRACT PRIVATE FROM OUTSIDER');

  const sellerContract = await api(`/api/auctions/${fixedId}/contract`, { cookie: sellerCookie });
  ok(sellerContract.status === 200 && sellerContract.json?.data?.content, 'SELLER CAN READ CONTRACT');

  const buyerContract = await api(`/api/auctions/${fixedId}/contract`, { cookie: bidder2Cookie });
  ok(buyerContract.status === 200, 'BUYER CAN READ CONTRACT');
  ok(hashText(buyerContract.json.data.content) === buyerContract.json.data.contentHash, 'CONTRACT SHA-256 VERIFIED');
  ok(buyerContract.json.data.content.includes(seller.email) && buyerContract.json.data.content.includes(bidder2.email), 'CONTRACT HAS CORRECT PARTIES');
  ok(buyerContract.json.data.content.includes('1400.00'), 'CONTRACT HAS FINAL PRICE');

  const download = await api(`/api/auctions/${fixedId}/contract?download=1`, { cookie: bidder2Cookie });
  ok(download.status === 200, 'CONTRACT DOWNLOAD');
  ok(download.response.headers.get('x-contract-sha256') === hashText(download.text), 'DOWNLOAD HASH HEADER VERIFIED');

  const [awardRow] = await sql`select * from auction_awards where property_id = ${fixedId}`;
  const [contractRow] = await sql`select * from auction_contracts where property_id = ${fixedId}`;
  ok(awardRow?.buyer_id === bidder2.id && Number(awardRow?.final_price) === 1400, 'IMMUTABLE AWARD SNAPSHOT WINNER + PRICE');
  ok(contractRow?.content_hash === hashText(contractRow?.content || ''), 'DATABASE CONTRACT HASH VERIFIED');

  const termsSnapshot = Array.isArray(awardRow?.terms_snapshot) ? awardRow.terms_snapshot : [];
  ok(termsSnapshot.some((x) => x.userId === seller.id && x.role === 'seller'), 'SELLER TERMS SNAPSHOT FROZEN');
  ok(termsSnapshot.some((x) => x.userId === bidder2.id && x.role === 'bidder'), 'WINNER TERMS SNAPSHOT FROZEN');

  const events = await sql`select event_type from auction_events where property_id = ${fixedId}`;
  const eventTypes = new Set(events.map((x) => x.event_type));
  for (const required of ['AUCTION_CREATED', 'BID_PLACED', 'AUCTION_ENDED', 'AWARD_CREATED', 'CONTRACT_GENERATED']) {
    ok(eventTypes.has(required), `AUDIT EVENT ${required}`);
  }

  // ------------------------------------------------------------
  // OPEN AUCTION: seller-only creation and explicit seller decision.
  // ------------------------------------------------------------
  const openId = await createAuctionProperty({
    ownerId: seller.id,
    officeId: null,
    label: 'open',
    auctionType: 'open',
    offerTypeId: sale.id,
    startPrice: 2000,
  });

  r = await api('/api/auctions', {
    method: 'POST', cookie: outsiderCookie,
    body: {
      propertyId: openId,
      type: 'open',
      startingPrice: 2000,
      bidIncrement: 100,
      endDate,
      acceptSellerTerms: true,
    },
  });
  ok(r.status === 403, 'NON-SELLER OPEN AUCTION CREATE BLOCKED');

  r = await api('/api/auctions', {
    method: 'POST', cookie: sellerCookie,
    body: {
      propertyId: openId,
      type: 'open',
      startingPrice: 2000,
      bidIncrement: 100,
      endDate,
      acceptSellerTerms: false,
    },
  });
  ok(r.status === 400, 'OPEN AUCTION REQUIRES SELLER TERMS');

  r = await api('/api/auctions', {
    method: 'POST', cookie: sellerCookie,
    body: {
      propertyId: openId,
      type: 'open',
      startingPrice: 2000,
      bidIncrement: 100,
      endDate,
      acceptSellerTerms: true,
    },
  });
  ok(r.status === 201 && r.json?.data?.auctionStatus === 'active', 'OPEN AUCTION CREATE');

  r = await api(`/api/auctions/${openId}/bid`, {
    method: 'POST', cookie: bidder1Cookie,
    headers: { 'Idempotency-Key': `open-bid-${stamp}` },
    body: { amount: 2100, termsAccepted: true },
  });
  ok(r.status === 200, 'OPEN AUCTION VALID BID');

  await forceExpired(openId);

  r = await api(`/api/auctions/${openId}/end`, { method: 'POST', cookie: bidder2Cookie });
  ok(r.status === 403, 'NON-SELLER CANNOT END OPEN AUCTION');

  r = await api(`/api/auctions/${openId}/end`, { method: 'POST', cookie: sellerCookie });
  ok(r.status === 200 && r.json?.data?.awaitingSellerDecision === true, 'OPEN AUCTION WAITS FOR SELLER DECISION');
  ok(r.json?.data?.property?.auctionStatus === 'awaiting_seller_decision', 'OPEN STATUS AWAITING SELLER DECISION');

  const [openAwardBefore] = await sql`select count(*)::int as count from auction_awards where property_id = ${openId}`;
  ok(Number(openAwardBefore.count) === 0, 'OPEN AUCTION NO AWARD BEFORE SELLER ACCEPTANCE');

  r = await api(`/api/auctions/${openId}/decision`, {
    method: 'POST', cookie: outsiderCookie, body: { action: 'accept' },
  });
  ok(r.status === 403, 'OUTSIDER CANNOT DECIDE OPEN RESULT');

  r = await api(`/api/auctions/${openId}/decision`, {
    method: 'POST', cookie: sellerCookie, body: { action: 'accept' },
  });
  ok(r.status === 200 && r.json?.data?.decision === 'accepted', 'SELLER ACCEPTS OPEN RESULT');
  ok(r.json?.data?.property?.auctionStatus === 'awarded', 'OPEN AUCTION AWARDED AFTER ACCEPTANCE');
  ok(r.json?.data?.award?.buyerId === bidder1.id, 'CORRECT OPEN AUCTION WINNER');
  ok(Number(r.json?.data?.award?.finalPrice) === 2100, 'CORRECT OPEN FINAL PRICE');
  ok(Boolean(r.json?.data?.contract?.contentHash), 'OPEN CONTRACT GENERATED');

  r = await api(`/api/auctions/${openId}/contract`, { cookie: bidder1Cookie });
  ok(r.status === 200 && r.json?.data?.content.includes('2100.00'), 'OPEN WINNER CONTRACT ACCESS + PRICE');

  const publicList = await api('/api/auctions?status=awarded&limit=50');
  ok(publicList.status === 200, 'PUBLIC AWARDED AUCTIONS LIST');
  ok((publicList.json?.data || []).some((x) => x.id === fixedId), 'CLOSED AWARDED AUCTION IN PUBLIC LIST');
  ok((publicList.json?.data || []).some((x) => x.id === openId), 'OPEN AWARDED AUCTION IN PUBLIC LIST');

  const page = await fetch(`${BASE}/auctions`, { redirect: 'manual' });
  ok(page.status === 200, 'PUBLIC AUCTIONS PAGE HTTP 200');

  const detailPage = await fetch(`${BASE}/auctions/${fixedId}`, { redirect: 'manual' });
  ok(detailPage.status === 200, 'PUBLIC AUCTION DETAIL PAGE HTTP 200');

  console.log('');
  console.log('======================================');
  console.log('AUCTIONS F2 PRODUCTION E2E: PASS');
  console.log(`CHECKS: ${checks.length}/${checks.length}`);
  console.log('CONCURRENCY: PASS');
  console.log('AUTHORIZATION: PASS');
  console.log('TERMS + AWARD + CONTRACT: PASS');
  console.log('SAFE FOR AUCTIONS F3 CONTRACT/DOCUMENT CLOSURE: YES');
  console.log('======================================');
} catch (error) {
  console.error('');
  console.error('======================================');
  console.error('AUCTIONS F2 PRODUCTION E2E: FAIL');
  console.error(error?.stack || error);
  console.error('SAFE FOR AUCTIONS LOCK: NO');
  console.error('======================================');
  process.exitCode = 1;
} finally {
  await cleanup();
  await sql.end({ timeout: 5 });
}
