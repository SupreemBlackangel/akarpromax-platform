import crypto from 'node:crypto';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;
const BASE = process.env.AUCTIONS_F3_BASE || 'http://127.0.0.1:3015';
if (!DATABASE_URL) {
  console.error('AUCTIONS F3 E2E: FAIL - DATABASE_URL missing');
  process.exit(2);
}

const sql = postgres(DATABASE_URL, { max: 4, prepare: false });
const stamp = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const password = `Akar!${crypto.randomBytes(9).toString('hex')}`;
const checks = [];
const ids = { users: [], orgs: [], properties: [] };

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
function ok(condition, name, detail = '') {
  if (!condition) throw new Error(`${name}${detail ? ` :: ${detail}` : ''}`);
  checks.push(name);
  console.log(`PASS  ${name}`);
}

async function api(path, options = {}) {
  const headers = { Accept: '*/*', Origin: BASE, ...(options.headers || {}) };
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

async function createUser(label) {
  const email = `auction.f3.${label}.${stamp}@example.invalid`;
  const hash = await bcrypt.hash(password, 12);
  const [row] = await sql`
    insert into users
      (email, email_verified_at, name, password_hash, role, status, is_active, preferred_language, created_at)
    values
      (${email}, now(), ${`Auction F3 ${label}`}, ${hash}, 'user', 'active', true, 'ar', now())
    returning id, email, name
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

async function cleanup() {
  console.log('');
  console.log('CLEANUP...');
  for (const propertyId of [...ids.properties].reverse()) {
    try { await sql`delete from auction_contract_signatures where property_id = ${propertyId}`; } catch {}
    try { await sql`delete from auction_contracts where property_id = ${propertyId}`; } catch {}
    try { await sql`delete from auction_awards where property_id = ${propertyId}`; } catch {}
    try { await sql`delete from auction_events where property_id = ${propertyId}`; } catch {}
    try { await sql`delete from auction_terms_acceptance where property_id = ${propertyId}`; } catch {}
    try { await sql`delete from auction_bids where property_id = ${propertyId}`; } catch {}
    try { await sql`delete from property_offers where property_id = ${propertyId}`; } catch {}
    try { await sql`delete from properties where id = ${propertyId}`; } catch {}
  }
  for (const orgId of [...ids.orgs].reverse()) {
    try { await sql`delete from verification_records where entity_type='organization' and entity_id=${orgId}`; } catch {}
    try { await sql`delete from organization_members where organization_id=${orgId}`; } catch {}
    try { await sql`delete from organizations where id=${orgId}`; } catch {}
  }
  for (const userId of [...ids.users].reverse()) {
    try { await sql`delete from session_revocations where user_id=${userId}`; } catch {}
    try { await sql`delete from users where id=${userId}`; } catch {}
  }
  console.log('CLEANUP: DONE');
}

try {
  console.log('');
  console.log('======================================');
  console.log('AKARPROMAX AUCTIONS F3 CONTRACT E2E');
  console.log('======================================');

  const seller = await createUser('seller');
  const buyer = await createUser('buyer');
  const outsider = await createUser('outsider');
  const sellerCookie = await login(seller);
  const buyerCookie = await login(buyer);
  const outsiderCookie = await login(outsider);

  const [org] = await sql`
    insert into organizations
      (name_ar, name_en, slug, type, classification, country_code, city_id, status, verified_at, approved_at, created_at, updated_at)
    values
      ('ظ…ظƒطھط¨ ظ…ط²ط§ط¯ F3', 'Auction F3 Office', ${`auction-f3-${stamp}`}, 'real_estate', 'established', 'SA', 'Jeddah', 'active', now(), now(), now(), now())
    returning id
  `;
  ids.orgs.push(org.id);
  await sql`insert into organization_members (organization_id,user_id,role,status,joined_at) values (${org.id},${seller.id},'owner','active',now())`;
  await sql`insert into verification_records (entity_type,entity_id,type,status,verified_at,source,country_code,created_at) values ('organization',${org.id},'organization','verified',now(),'manual','SA',now())`;

  const [sale] = await sql`select id from property_offer_types where code='SALE' and is_active=true limit 1`;
  ok(Boolean(sale?.id), 'SALE OFFER TYPE');

  const [property] = await sql`
    insert into properties
      (user_id,office_id,title_ar,title_en,description_ar,description_en,deal_type,category,property_type,country,governorate,city,district,address,price,currency,area,status,approved_at,created_at,updated_at)
    values
      (${seller.id},${org.id},${`ط¹ظ‚ط§ط± ط¹ظ‚ط¯ F3 ${stamp}`},${`Auction Contract F3 ${stamp}`},'ط§ط®طھط¨ط§ط± ط¥ط؛ظ„ط§ظ‚ ظˆط«ظٹظ‚ط© ط§ظ„ط¹ظ‚ط¯ ظ„ظ„ظ…ط²ط§ط¯.','Auction contract closure test.','sale','residential','apartment','SA','Makkah','Jeddah','Al Rawdah','Jeddah',1000,'SAR','150.00','approved',now(),now(),now())
    returning id, title_ar
  `;
  ids.properties.push(property.id);
  await sql`
    insert into property_offers (property_id,offer_type_id,marketing_method,auction_type,status,price,currency,negotiable,details,created_at,updated_at)
    values (${property.id},${sale.id},'auction','fixed','active','1000','SAR',false,'{}'::jsonb,now(),now())
  `;

  const endDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  let r = await api('/api/auctions', {
    method: 'POST', cookie: sellerCookie,
    body: { propertyId: property.id, type: 'closed', organizerOrganizationId: org.id, startingPrice: 1000, bidIncrement: 100, endDate, acceptSellerTerms: true },
  });
  ok(r.status === 201, 'CLOSED AUCTION CREATED', `HTTP ${r.status} ${r.text}`);

  r = await api(`/api/auctions/${property.id}/bid`, {
    method: 'POST', cookie: buyerCookie,
    headers: { 'Idempotency-Key': `f3-bid-${stamp}` },
    body: { amount: 1100, termsAccepted: true },
  });
  ok(r.status === 200, 'WINNING BID CREATED');

  await sql`update properties set auction_end_date=now()-interval '1 minute', updated_at=now() where id=${property.id}`;
  r = await api(`/api/auctions/${property.id}/end`, { method: 'POST', cookie: sellerCookie });
  ok(r.status === 200 && r.json?.data?.property?.auctionStatus === 'awarded', 'AUCTION SETTLED + CONTRACT CREATED');

  const contractJson = await api(`/api/auctions/${property.id}/contract`, { cookie: buyerCookie });
  ok(contractJson.status === 200, 'BUYER CONTRACT JSON');
  const docHash = contractJson.json?.data?.documentHash;
  ok(/^[a-f0-9]{64}$/.test(String(docHash || '')), 'IMMUTABLE DOCUMENT HASH PRESENT');
  ok(String(contractJson.json?.data?.documentFilename || '').endsWith('.html'), 'VERSIONED DOCUMENT FILENAME PRESENT');

  const html1 = await api(`/api/auctions/${property.id}/contract?format=html`, { cookie: buyerCookie });
  ok(html1.status === 200, 'PRIVATE HTML CONTRACT ACCESS');
  ok((html1.response.headers.get('content-type') || '').includes('text/html'), 'HTML CONTRACT MIME');
  ok(html1.response.headers.get('x-contract-document-sha256') === sha256(html1.text), 'HTML DOCUMENT HASH HEADER VERIFIED');
  ok((html1.response.headers.get('content-security-policy') || '').includes("default-src 'none'"), 'HTML CONTRACT CSP');
  ok(html1.text.includes(seller.email) && html1.text.includes(buyer.email), 'HTML CONTRACT CORRECT PARTIES');
  ok(html1.text.includes('1100.00'), 'HTML CONTRACT CORRECT FINAL PRICE');

  const outsiderHtml = await api(`/api/auctions/${property.id}/contract?format=html`, { cookie: outsiderCookie });
  ok(outsiderHtml.status === 403, 'OUTSIDER HTML CONTRACT BLOCKED');

  const beforeImmutable = html1.text;
  await sql`update users set name='LIVE SELLER CHANGED' where id=${seller.id}`;
  await sql`update properties set title_ar='LIVE PROPERTY CHANGED' where id=${property.id}`;
  const html2 = await api(`/api/auctions/${property.id}/contract?format=html`, { cookie: buyerCookie });
  ok(html2.text === beforeImmutable, 'CONTRACT DOCUMENT IMMUTABLE AFTER LIVE DATA EDIT');
  ok(!html2.text.includes('LIVE SELLER CHANGED') && !html2.text.includes('LIVE PROPERTY CHANGED'), 'CONTRACT DOES NOT READ MUTABLE LIVE DATA');

  r = await api(`/api/auctions/${property.id}/contract/sign`, {
    method: 'POST', cookie: sellerCookie,
    body: { accept: true, contractHash: '0'.repeat(64) },
  });
  ok(r.status === 409, 'WRONG CONTRACT HASH SIGNATURE BLOCKED');

  r = await api(`/api/auctions/${property.id}/contract/sign`, {
    method: 'POST', cookie: outsiderCookie,
    body: { accept: true, contractHash: docHash },
  });
  ok(r.status === 403, 'OUTSIDER SIGNATURE BLOCKED');

  r = await api(`/api/auctions/${property.id}/contract/sign`, {
    method: 'POST', cookie: sellerCookie,
    body: { accept: true, contractHash: docHash },
  });
  ok(r.status === 200 && r.json?.data?.idempotent === false, 'SELLER CONTRACT ACCEPTANCE RECORDED');
  ok(r.json?.data?.contract?.status === 'signature_pending', 'CONTRACT AWAITS BUYER SIGNATURE');

  r = await api(`/api/auctions/${property.id}/contract/sign`, {
    method: 'POST', cookie: sellerCookie,
    body: { accept: true, contractHash: docHash },
  });
  ok(r.status === 200 && r.json?.data?.idempotent === true, 'SELLER SIGNATURE IDEMPOTENT');

  r = await api(`/api/auctions/${property.id}/contract/sign`, {
    method: 'POST', cookie: buyerCookie,
    body: { accept: true, contractHash: docHash },
  });
  ok(r.status === 200 && r.json?.data?.contract?.status === 'signed', 'BUYER SIGNATURE COMPLETES CONTRACT');

  const signedJson = await api(`/api/auctions/${property.id}/contract`, { cookie: buyerCookie });
  ok(signedJson.json?.data?.status === 'signed', 'CONTRACT STATUS SIGNED');
  ok(Boolean(signedJson.json?.data?.sellerSignedAt), 'SELLER SIGNED TIMESTAMP');
  ok(Boolean(signedJson.json?.data?.buyerSignedAt), 'BUYER SIGNED TIMESTAMP');
  ok(Boolean(signedJson.json?.data?.signedAt), 'FULLY SIGNED TIMESTAMP');

  const signatures = await sql`select party_role, contract_hash, signature_hash from auction_contract_signatures where property_id=${property.id} order by party_role`;
  ok(signatures.length === 2, 'EXACTLY TWO PARTY SIGNATURE RECORDS');
  ok(signatures.every((x) => x.contract_hash === docHash), 'SIGNATURES BOUND TO DOCUMENT HASH');
  ok(signatures.every((x) => /^[a-f0-9]{64}$/.test(x.signature_hash)), 'SIGNATURE AUDIT HASHES VALID');

  const eventRows = await sql`select event_type from auction_events where property_id=${property.id}`;
  const eventTypes = eventRows.map((x) => x.event_type);
  ok(eventTypes.filter((x) => x === 'CONTRACT_PARTY_SIGNED').length === 2, 'TWO PARTY SIGN EVENTS');
  ok(eventTypes.includes('CONTRACT_SIGNED'), 'FULL CONTRACT SIGNED EVENT');

  const html3 = await api(`/api/auctions/${property.id}/contract?format=html&download=1`, { cookie: buyerCookie });
  ok(html3.status === 200 && html3.text === beforeImmutable, 'SIGNED DOCUMENT BYTES REMAIN IMMUTABLE');
  ok((html3.response.headers.get('content-disposition') || '').startsWith('attachment;'), 'HTML CONTRACT DOWNLOAD ATTACHMENT');
  ok(html3.response.headers.get('x-contract-document-sha256') === docHash, 'SIGNED DOWNLOAD DOCUMENT HASH STABLE');

  console.log('');
  console.log('======================================');
  console.log('AUCTIONS F3 CONTRACT/DOCUMENT E2E: PASS');
  console.log(`CHECKS: ${checks.length}/${checks.length}`);
  console.log('IMMUTABLE DOCUMENT: PASS');
  console.log('PARTY ACCEPTANCE: PASS');
  console.log('AUDIT HASHES: PASS');
  console.log('SAFE TO LOCK AUCTIONS: YES');
  console.log('======================================');
} catch (error) {
  console.error('');
  console.error('======================================');
  console.error('AUCTIONS F3 CONTRACT/DOCUMENT E2E: FAIL');
  console.error(error?.stack || error);
  console.error('SAFE TO LOCK AUCTIONS: NO');
  console.error('======================================');
  process.exitCode = 1;
} finally {
  await cleanup();
  await sql.end({ timeout: 5 });
}
