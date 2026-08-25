from pathlib import Path
import os, shutil, sys

ROOT = Path.cwd()
BACKUP = Path(os.environ['AUCTIONS_F3_BACKUP'])

MODIFIED = [
    Path('lib/db/schemas/auction-hardening-schema.ts'),
    Path('lib/auctions/settlement.ts'),
    Path('app/api/auctions/[id]/contract/route.ts'),
]

for rel in MODIFIED:
    src = ROOT / rel
    if not src.exists():
        print(f'FAIL: missing {rel.as_posix()}')
        sys.exit(10)
    dst = BACKUP / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def read(rel):
    p = ROOT / rel
    raw = p.read_bytes()
    nl = '\r\n' if b'\r\n' in raw else '\n'
    return p, raw.decode('utf-8-sig').replace('\r\n', '\n'), nl


def write(p, text, nl):
    if nl == '\r\n':
        text = text.replace('\n', '\r\n')
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(text.encode('utf-8'))


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        print(f'FAIL: patch anchor not found: {label}')
        sys.exit(11)
    return text.replace(old, new, 1)

# ------------------------------------------------------------------
# 1) Schema: immutable printable document metadata + party signatures.
# ------------------------------------------------------------------
rel = Path('lib/db/schemas/auction-hardening-schema.ts')
p, text, nl = read(rel)
text = replace_once(
    text,
    """  content: text('content').notNull(),
  contentHash: text('content_hash').notNull(),
  status: text('status').notNull().default('generated'),""",
    """  content: text('content').notNull(),
  contentHash: text('content_hash').notNull(),
  documentHtml: text('document_html'),
  documentHash: text('document_hash'),
  documentMime: text('document_mime').notNull().default('text/html; charset=utf-8'),
  documentFilename: text('document_filename'),
  status: text('status').notNull().default('generated'),
  sellerSignedAt: timestamp('seller_signed_at'),
  buyerSignedAt: timestamp('buyer_signed_at'),""",
    'auction contract document columns',
)

signature_block = """export const auctionContractSignatures = pgTable('auction_contract_signatures', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').notNull().references(() => auctionContracts.id, { onDelete: 'restrict' }),
  propertyId: uuid('property_id').notNull().references(() => properties.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  partyRole: text('party_role').notNull(),
  contractHash: text('contract_hash').notNull(),
  signatureHash: text('signature_hash').notNull(),
  signedAt: timestamp('signed_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  partyUnique: uniqueIndex('auction_contract_signatures_party_uidx').on(table.contractId, table.userId, table.partyRole),
  contractIdx: index('auction_contract_signatures_contract_idx').on(table.contractId, table.signedAt),
  userIdx: index('auction_contract_signatures_user_idx').on(table.userId),
}));

"""
if "export const auctionContractSignatures" not in text:
    anchor = "export const auctionEvents = pgTable('auction_events', {"
    if anchor not in text:
        print('FAIL: auctionEvents schema anchor not found')
        sys.exit(12)
    text = text.replace(anchor, signature_block + anchor, 1)
write(p, text, nl)

# ------------------------------------------------------------------
# 2) Settlement: create immutable RTL HTML document at award time.
# ------------------------------------------------------------------
rel = Path('lib/auctions/settlement.ts')
p, text, nl = read(rel)

html_builder = r'''function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildContractDocumentHtml(
  input: Parameters<typeof buildContractContent>[0] & { contentHash: string },
) {
  const typeLabel = input.auctionType === 'fixed' ? 'ط§ظ„ظ…ط²ط§ط¯ ط§ظ„ظ…ط؛ظ„ظ‚' : 'ط§ظ„ظ…ط²ط§ط¯ ط§ظ„ظ…ظپطھظˆط­';
  const termsRows = input.termsSnapshot
    .map((term) => `<tr><td>${escapeHtml(term.role)}</td><td>${escapeHtml(term.version)}</td><td class="hash">${escapeHtml(term.contentHash)}</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(input.contractNumber)} - AkarProMax</title>
<style>
  *{box-sizing:border-box} body{margin:0;background:#f5f7fb;color:#111827;font-family:Tahoma,Arial,sans-serif;line-height:1.8}
  .page{width:min(920px,calc(100% - 32px));margin:28px auto;background:#fff;border:1px solid #dbe3ef;border-radius:18px;padding:42px;box-shadow:0 12px 34px rgba(15,23,42,.08)}
  .brand{font-weight:900;color:#1d4ed8;font-size:18px}.title{font-size:28px;font-weight:900;margin:8px 0 2px}.meta{color:#64748b;font-size:13px}
  h2{font-size:17px;margin:28px 0 10px;color:#0f172a;border-bottom:1px solid #e5e7eb;padding-bottom:7px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}.item{padding:8px 0}.label{font-size:12px;color:#64748b}.value{font-weight:700;overflow-wrap:anywhere}
  .price{margin:24px 0;padding:20px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;font-size:21px;font-weight:900;color:#1d4ed8;text-align:center}
  table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e5e7eb;padding:8px;text-align:right}.hash{direction:ltr;text-align:left;overflow-wrap:anywhere;font-family:monospace}
  .notice{margin-top:26px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px;font-size:12px;color:#78350f}
  .footer{margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;color:#64748b;font-size:11px}.ltr{direction:ltr;unicode-bidi:embed;display:inline-block}
  @media(max-width:650px){.page{padding:22px}.grid{grid-template-columns:1fr}.title{font-size:22px}}
  @media print{body{background:#fff}.page{width:100%;margin:0;border:0;box-shadow:none;border-radius:0;padding:20mm}.no-print{display:none}}
</style>
</head>
<body>
<main class="page">
  <div class="brand">AkarProMax | ط¹ظ‚ط§ط± ط¨ط±ظˆظ…ط§ظƒط³</div>
  <div class="title">ط¹ظ‚ط¯ ظ†طھظٹط¬ط© ظ…ط²ط§ط¯ ط¹ظ‚ط§ط±ظٹ</div>
  <div class="meta">ط±ظ‚ظ… ط§ظ„ط¹ظ‚ط¯: <span class="ltr">${escapeHtml(input.contractNumber)}</span> آ· ظ†ظˆط¹ ط§ظ„ظ…ط²ط§ط¯: ${typeLabel} آ· طھط§ط±ظٹط® ط§ط¹طھظ…ط§ط¯ ط§ظ„ظ†طھظٹط¬ط©: <span class="ltr">${escapeHtml(input.awardedAt.toISOString())}</span></div>

  <h2>ط§ظ„ط·ط±ظپ ط§ظ„ط£ظˆظ„ - ط§ظ„ط¨ط§ط¦ط¹</h2>
  <div class="grid">
    <div class="item"><div class="label">ط§ظ„ط§ط³ظ…</div><div class="value">${escapeHtml(input.seller.name ?? 'ط؛ظٹط± ظ…ط­ط¯ط¯')}</div></div>
    <div class="item"><div class="label">ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ</div><div class="value ltr">${escapeHtml(input.seller.email ?? 'ط؛ظٹط± ظ…ط­ط¯ط¯')}</div></div>
    <div class="item"><div class="label">ظ…ط¹ط±ظپ ط§ظ„ظ…ط³طھط®ط¯ظ…</div><div class="value ltr">${escapeHtml(input.seller.id)}</div></div>
  </div>

  <h2>ط§ظ„ط·ط±ظپ ط§ظ„ط«ط§ظ†ظٹ - ط§ظ„ظپط§ط¦ط² ط¨ط§ظ„ظ…ط²ط§ط¯</h2>
  <div class="grid">
    <div class="item"><div class="label">ط§ظ„ط§ط³ظ…</div><div class="value">${escapeHtml(input.buyer.name ?? 'ط؛ظٹط± ظ…ط­ط¯ط¯')}</div></div>
    <div class="item"><div class="label">ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ</div><div class="value ltr">${escapeHtml(input.buyer.email ?? 'ط؛ظٹط± ظ…ط­ط¯ط¯')}</div></div>
    <div class="item"><div class="label">ظ…ط¹ط±ظپ ط§ظ„ظ…ط³طھط®ط¯ظ…</div><div class="value ltr">${escapeHtml(input.buyer.id)}</div></div>
  </div>

  <h2>ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¹ظ‚ط§ط±</h2>
  <div class="grid">
    <div class="item"><div class="label">ط§ظ„ط¹ظ†ظˆط§ظ†</div><div class="value">${escapeHtml(input.property.titleAr)}</div></div>
    <div class="item"><div class="label">ط§ظ„ظ†ظˆط¹</div><div class="value">${escapeHtml(input.property.propertyType)}</div></div>
    <div class="item"><div class="label">ط§ظ„ظ…ظˆظ‚ط¹</div><div class="value">${escapeHtml(input.property.city)} - ${escapeHtml(input.property.governorate)} - ${escapeHtml(input.property.country)}</div></div>
    <div class="item"><div class="label">ط§ظ„ظ…ط³ط§ط­ط©</div><div class="value">${escapeHtml(input.property.area)} ظ…آ²</div></div>
    <div class="item"><div class="label">ظ…ط¹ط±ظپ ط§ظ„ط¹ظ‚ط§ط±</div><div class="value ltr">${escapeHtml(input.property.id)}</div></div>
  </div>

  <div class="price">ط§ظ„ط³ط¹ط± ط§ظ„ظ†ظ‡ط§ط¦ظٹ ط§ظ„ظپط§ط¦ط²: ${escapeHtml(input.finalPrice)} ${escapeHtml(input.currency)}</div>

  <h2>ظ…ط±ط¬ط¹ ط´ط±ظˆط· ط§ظ„ظ…ط²ط§ط¯</h2>
  <table><thead><tr><th>ط§ظ„طµظپط©</th><th>ط§ظ„ط¥طµط¯ط§ط±</th><th>SHA-256</th></tr></thead><tbody>${termsRows}</tbody></table>

  <h2>ط¨طµظ…ط© ط³ط¬ظ„ ط§ظ„ط¹ظ‚ط¯</h2>
  <div class="hash">${escapeHtml(input.contentHash)}</div>

  <div class="notice">ظ‡ط°ط§ ط§ظ„ظ…ط³طھظ†ط¯ ط³ط¬ظ„ ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ„ظ†طھظٹط¬ط© ط§ظ„ظ…ط²ط§ط¯ ط§ظ„ظ…ط¹طھظ…ط¯ط© ط¯ط§ط®ظ„ ظ…ظ†طµط© ط¹ظ‚ط§ط± ط¨ط±ظˆظ…ط§ظƒط³. ط§ظ„طھظˆظ‚ظٹط¹ ط£ظˆ ط§ظ„ظ‚ط¨ظˆظ„ ط¯ط§ط®ظ„ ط§ظ„ظ…ظ†طµط© ظٹظˆط«ظ‚ ظ…ظˆط§ظپظ‚ط© ط§ظ„ط£ط·ط±ط§ظپ ط¹ظ„ظ‰ ظ‡ط°ط§ ط§ظ„ط³ط¬ظ„طŒ ظˆظ„ط§ ظٹظ„ط؛ظٹ ط£ظٹ ظ…طھط·ظ„ط¨ط§طھ طھظˆط«ظٹظ‚ ط£ظˆ طھط³ط¬ظٹظ„ ظ†ط¸ط§ظ…ظٹط© طھظپط±ط¶ظ‡ط§ ط§ظ„ط¬ظ‡ط© ط§ظ„ظ…ط®طھطµط© ظپظٹ ط§ظ„ط¯ظˆظ„ط©.</div>
  <div class="footer">طھظ… ط¥ظ†ط´ط§ط، ظ‡ط°ظ‡ ط§ظ„ظ†ط³ط®ط© ظ…ظ† Snapshot ط«ط§ط¨طھ ط¹ظ†ط¯ ط§ط¹طھظ…ط§ط¯ ط§ظ„ظپط§ط¦ط²طŒ ظˆظ„ط§ طھط¹طھظ…ط¯ ط¹ظ„ظ‰ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ„ظپ ط§ظ„ط´ط®طµظٹ ط£ظˆ ط§ظ„ط¹ظ‚ط§ط± ط¨ط¹ط¯ ظ„ط­ط¸ط© ط§ظ„طھط³ظˆظٹط©.</div>
</main>
</body>
</html>`;
}

'''
if 'function buildContractDocumentHtml' not in text:
    anchor = 'export async function settleAuction('
    if anchor not in text:
        print('FAIL: settleAuction anchor not found')
        sys.exit(13)
    text = text.replace(anchor, html_builder + anchor, 1)

old = """  const content = buildContractContent({
    contractNumber,
    property,
    seller,
    buyer,
    finalPrice: String(highestBid.amount),
    currency: property.currency || 'SAR',
    auctionType: property.auctionType || 'open',
    termsSnapshot,
    awardedAt: now,
  });
  const contentHash = createHash('sha256').update(content).digest('hex');"""
new = """  const contractInput = {
    contractNumber,
    property,
    seller,
    buyer,
    finalPrice: String(highestBid.amount),
    currency: property.currency || 'SAR',
    auctionType: property.auctionType || 'open',
    termsSnapshot,
    awardedAt: now,
  };
  const content = buildContractContent(contractInput);
  const contentHash = createHash('sha256').update(content).digest('hex');
  const documentHtml = buildContractDocumentHtml({ ...contractInput, contentHash });
  const documentHash = createHash('sha256').update(documentHtml).digest('hex');
  const documentFilename = `${contractNumber}.html`;"""
text = replace_once(text, old, new, 'settlement immutable document')

text = replace_once(
    text,
    """      content,
      contentHash,
      status: 'generated',""",
    """      content,
      contentHash,
      documentHtml,
      documentHash,
      documentMime: 'text/html; charset=utf-8',
      documentFilename,
      status: 'generated',""",
    'contract insert document fields',
)

text = text.replace(
    "payload: { contractId: contract.id, contractNumber, contentHash },",
    "payload: { contractId: contract.id, contractNumber, contentHash, documentHash, documentFilename },",
    1,
)
write(p, text, nl)

# ------------------------------------------------------------------
# 3) Contract GET: immutable printable HTML + document metadata.
# ------------------------------------------------------------------
rel = Path('app/api/auctions/[id]/contract/route.ts')
p, text, nl = read(rel)
html_route = """    if (request.nextUrl.searchParams.get('format') === 'html') {
      if (!contract.documentHtml || !contract.documentHash) {
        return NextResponse.json({ error: 'ظ†ط³ط®ط© ط§ظ„ظ…ط³طھظ†ط¯ ط؛ظٹط± ظ…طھط§ط­ط© ظ„ظ‡ط°ط§ ط§ظ„ط¹ظ‚ط¯' }, { status: 404 });
      }

      const download = request.nextUrl.searchParams.get('download') === '1';
      return new NextResponse(contract.documentHtml, {
        status: 200,
        headers: {
          'Content-Type': contract.documentMime || 'text/html; charset=utf-8',
          'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${contract.documentFilename || `${contract.contractNumber}.html`}"`,
          'X-Contract-SHA256': contract.contentHash,
          'X-Contract-Document-SHA256': contract.documentHash,
          'Cache-Control': 'private, no-store',
          'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'",
        },
      });
    }

"""
if "request.nextUrl.searchParams.get('format') === 'html'" not in text:
    anchor = "    if (request.nextUrl.searchParams.get('download') === '1') {"
    if anchor not in text:
        print('FAIL: contract download anchor not found')
        sys.exit(14)
    text = text.replace(anchor, html_route + anchor, 1)

text = replace_once(
    text,
    """        contentHash: contract.contentHash,
        status: contract.status,
        generatedAt: contract.generatedAt,
        signedAt: contract.signedAt,""",
    """        contentHash: contract.contentHash,
        documentHash: contract.documentHash,
        documentMime: contract.documentMime,
        documentFilename: contract.documentFilename,
        status: contract.status,
        generatedAt: contract.generatedAt,
        sellerSignedAt: contract.sellerSignedAt,
        buyerSignedAt: contract.buyerSignedAt,
        signedAt: contract.signedAt,""",
    'contract json metadata',
)
write(p, text, nl)

# ------------------------------------------------------------------
# 4) Contract signature endpoint: server-side, row-locked, parties only.
# ------------------------------------------------------------------
sign_rel = Path('app/api/auctions/[id]/contract/sign/route.ts')
sign_p = ROOT / sign_rel
sign_src = r'''import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import {
  auctionContracts,
  auctionContractSignatures,
  auctionEvents,
} from '@/lib/db/schemas/auction-hardening-schema';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session) return NextResponse.json({ error: 'ط؛ظٹط± ظ…طµط±ط­' }, { status: 401 });

  const { id: propertyId } = await params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'ط¨ظٹط§ظ†ط§طھ ط؛ظٹط± طµط§ظ„ط­ط©' }, { status: 400 });
  }

  if (body?.accept !== true) {
    return NextResponse.json({ error: 'ظٹط¬ط¨ طھط£ظƒظٹط¯ ط§ظ„ظ…ظˆط§ظپظ‚ط© ط¹ظ„ظ‰ ط§ظ„ط¹ظ‚ط¯' }, { status: 400 });
  }

  const submittedHash = String(body?.contractHash || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(submittedHash)) {
    return NextResponse.json({ error: 'ط¨طµظ…ط© ط§ظ„ط¹ظ‚ط¯ ط؛ظٹط± طµط§ظ„ط­ط©' }, { status: 400 });
  }

  const { db, end } = getDb();
  try {
    const result = await db.transaction(async (tx) => {
      const [contract] = await tx
        .select()
        .from(auctionContracts)
        .where(eq(auctionContracts.propertyId, propertyId))
        .for('update')
        .limit(1);

      if (!contract) throw new Error('CONTRACT_NOT_FOUND');

      const authoritativeHash = String(contract.documentHash || contract.contentHash || '').toLowerCase();
      if (!authoritativeHash || submittedHash !== authoritativeHash) {
        throw new Error('CONTRACT_HASH_MISMATCH');
      }

      let partyRole: 'seller' | 'buyer' | null = null;
      if (contract.sellerId === session.userId) partyRole = 'seller';
      else if (contract.buyerId === session.userId) partyRole = 'buyer';
      if (!partyRole) throw new Error('CONTRACT_PARTY_ONLY');

      const existingRows = await tx
        .select()
        .from(auctionContractSignatures)
        .where(eq(auctionContractSignatures.contractId, contract.id));

      const existingForUser = existingRows.find(
        (row: any) => row.userId === session.userId && row.partyRole === partyRole,
      );

      if (existingForUser) {
        return {
          idempotent: true,
          contract,
          signature: existingForUser,
        };
      }

      const now = new Date();
      const signatureHash = createHash('sha256')
        .update(`${contract.id}|${session.userId}|${partyRole}|${authoritativeHash}|${now.toISOString()}`)
        .digest('hex');

      const [signature] = await tx
        .insert(auctionContractSignatures)
        .values({
          contractId: contract.id,
          propertyId: contract.propertyId,
          userId: session.userId,
          partyRole,
          contractHash: authoritativeHash,
          signatureHash,
          signedAt: now,
        })
        .returning();

      const signatures = await tx
        .select({
          userId: auctionContractSignatures.userId,
          partyRole: auctionContractSignatures.partyRole,
        })
        .from(auctionContractSignatures)
        .where(eq(auctionContractSignatures.contractId, contract.id));

      const sellerDone = signatures.some((row: any) => row.userId === contract.sellerId && row.partyRole === 'seller');
      const buyerDone = signatures.some((row: any) => row.userId === contract.buyerId && row.partyRole === 'buyer');
      const fullySigned = sellerDone && buyerDone;

      const [updated] = await tx
        .update(auctionContracts)
        .set({
          status: fullySigned ? 'signed' : 'signature_pending',
          sellerSignedAt: sellerDone ? (partyRole === 'seller' ? now : contract.sellerSignedAt) : null,
          buyerSignedAt: buyerDone ? (partyRole === 'buyer' ? now : contract.buyerSignedAt) : null,
          signedAt: fullySigned ? now : null,
        })
        .where(eq(auctionContracts.id, contract.id))
        .returning();

      await tx.insert(auctionEvents).values({
        propertyId: contract.propertyId,
        actorUserId: session.userId,
        eventType: 'CONTRACT_PARTY_SIGNED',
        payload: {
          contractId: contract.id,
          partyRole,
          contractHash: authoritativeHash,
          signatureHash,
        },
      });

      if (fullySigned) {
        await tx.insert(auctionEvents).values({
          propertyId: contract.propertyId,
          actorUserId: session.userId,
          eventType: 'CONTRACT_SIGNED',
          payload: { contractId: contract.id, contractHash: authoritativeHash },
        });
      }

      return { idempotent: false, contract: updated, signature };
    });

    return NextResponse.json({ success: true, data: result }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const code = error instanceof Error ? error.message : String(error);
    if (code === 'CONTRACT_NOT_FOUND') return NextResponse.json({ error: 'ط§ظ„ط¹ظ‚ط¯ ط؛ظٹط± ظ…ظˆط¬ظˆط¯' }, { status: 404 });
    if (code === 'CONTRACT_HASH_MISMATCH') return NextResponse.json({ error: 'طھظ… ط±ظپط¶ ط§ظ„طھظˆظ‚ظٹط¹ ظ„ط£ظ† ط¨طµظ…ط© ط§ظ„ط¹ظ‚ط¯ ظ„ط§ طھط·ط§ط¨ظ‚ ط§ظ„ظ†ط³ط®ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©' }, { status: 409 });
    if (code === 'CONTRACT_PARTY_ONLY') return NextResponse.json({ error: 'ط§ظ„طھظˆظ‚ظٹط¹ ظ…طھط§ط­ ظ„ط·ط±ظپظٹ ط§ظ„ط¹ظ‚ط¯ ظپظ‚ط·' }, { status: 403 });
    console.error('[Auction Contract Sign] Error:', error);
    return NextResponse.json({ error: 'ظپط´ظ„ ظپظٹ طھط³ط¬ظٹظ„ ظ‚ط¨ظˆظ„ ط§ظ„ط¹ظ‚ط¯' }, { status: 500 });
  } finally {
    await end();
  }
}
'''
sign_p.parent.mkdir(parents=True, exist_ok=True)
if not sign_p.exists():
    sign_p.write_text(sign_src, encoding='utf-8')
else:
    existing = sign_p.read_text(encoding='utf-8-sig')
    if 'CONTRACT_PARTY_SIGNED' not in existing:
        dst = BACKUP / sign_rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(sign_p, dst)
        sign_p.write_text(sign_src, encoding='utf-8')

# ------------------------------------------------------------------
# 5) Migration.
# ------------------------------------------------------------------
migration = r'''-- AkarProMax Auctions F3 - immutable contract document + party acceptance trail

ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "document_html" text;
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "document_hash" text;
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "document_mime" text NOT NULL DEFAULT 'text/html; charset=utf-8';
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "document_filename" text;
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "seller_signed_at" timestamp;
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "buyer_signed_at" timestamp;

CREATE TABLE IF NOT EXISTS "auction_contract_signatures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "contract_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "party_role" text NOT NULL,
  "contract_hash" text NOT NULL,
  "signature_hash" text NOT NULL,
  "signed_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contract_signatures_contract_fk') THEN
    ALTER TABLE "auction_contract_signatures" ADD CONSTRAINT "auction_contract_signatures_contract_fk"
      FOREIGN KEY ("contract_id") REFERENCES "auction_contracts"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contract_signatures_property_fk') THEN
    ALTER TABLE "auction_contract_signatures" ADD CONSTRAINT "auction_contract_signatures_property_fk"
      FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contract_signatures_user_fk') THEN
    ALTER TABLE "auction_contract_signatures" ADD CONSTRAINT "auction_contract_signatures_user_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contract_signatures_role_ck') THEN
    ALTER TABLE "auction_contract_signatures" ADD CONSTRAINT "auction_contract_signatures_role_ck"
      CHECK ("party_role" IN ('seller','buyer'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "auction_contract_signatures_party_uidx"
  ON "auction_contract_signatures" ("contract_id", "user_id", "party_role");
CREATE INDEX IF NOT EXISTS "auction_contract_signatures_contract_idx"
  ON "auction_contract_signatures" ("contract_id", "signed_at");
CREATE INDEX IF NOT EXISTS "auction_contract_signatures_user_idx"
  ON "auction_contract_signatures" ("user_id");
'''
(ROOT / 'drizzle-pg/0012_auction_contract_closure_f3.sql').write_text(migration, encoding='utf-8')

apply_migration = r'''import fs from 'node:fs';
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
'''
(ROOT / 'scripts/apply-auctions-f3-migration.mjs').write_text(apply_migration, encoding='utf-8')

# ------------------------------------------------------------------
# 6) Static closure test.
# ------------------------------------------------------------------
test_src = r'''import test from 'node:test';
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
'''
(ROOT / 'tests/auctions-contract-f3.test.mjs').write_text(test_src, encoding='utf-8')

print('AUCTIONS F3 CONTRACT/DOCUMENT PATCH: APPLIED')
