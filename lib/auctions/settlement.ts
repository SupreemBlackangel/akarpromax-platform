import { createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { properties } from '@/lib/db/schemas/properties-schema';
import {
  auctionAwards,
  auctionContracts,
  auctionEvents,
  auctionTerms,
  auctionTermsAcceptance,
} from '@/lib/db/schemas/auction-hardening-schema';

export const AUCTION_CONTRACT_TEMPLATE_VERSION = 'auction-contract-v1';

type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>["db"]["transaction"]>[0]>[0];
type UserRow = typeof users.$inferSelect;
type PropertyRow = typeof properties.$inferSelect;

interface TermsSnapshotEntry {
  userId: string;
  role: string;
  version: string;
  contentHash: string;
  acceptanceHash: string;
  acceptedAt: string;
}

function personSnapshot(user: UserRow) {
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    phone: user.phone ?? null,
  };
}

function propertySnapshot(property: PropertyRow) {
  return {
    id: property.id,
    titleAr: property.titleAr,
    titleEn: property.titleEn ?? null,
    descriptionAr: property.descriptionAr,
    category: property.category,
    propertyType: property.propertyType,
    country: property.country,
    governorate: property.governorate,
    city: property.city,
    district: property.district ?? null,
    address: property.address ?? null,
    area: property.area,
    referenceNumber: property.referenceNumber ?? null,
    advertisingLicense: property.advertisingLicense ?? null,
  };
}

function buildContractContent(input: {
  contractNumber: string;
  property: PropertyRow;
  seller: UserRow;
  buyer: UserRow;
  finalPrice: string;
  currency: string;
  auctionType: string;
  termsSnapshot: TermsSnapshotEntry[];
  awardedAt: Date;
}) {
  const typeLabel = input.auctionType === 'fixed' ? 'المزاد المغلق' : 'المزاد المفتوح';
  const termsLines = input.termsSnapshot
    .map((term) => `- ${term.role}: الإصدار ${term.version} / SHA-256 ${term.contentHash}`)
    .join('\n');

  return `عقد نتيجة مزاد عقاري - عقار بروماكس

رقم العقد: ${input.contractNumber}
نوع المزاد: ${typeLabel}
تاريخ اعتماد النتيجة: ${input.awardedAt.toISOString()}

الطرف الأول - البائع
الاسم: ${input.seller.name ?? 'غير محدد'}
البريد الإلكتروني: ${input.seller.email ?? 'غير محدد'}
معرف المستخدم: ${input.seller.id}

الطرف الثاني - الفائز بالمزاد
الاسم: ${input.buyer.name ?? 'غير محدد'}
البريد الإلكتروني: ${input.buyer.email ?? 'غير محدد'}
معرف المستخدم: ${input.buyer.id}

العقار
المعرف: ${input.property.id}
العنوان: ${input.property.titleAr}
النوع: ${input.property.propertyType}
الموقع: ${input.property.city} - ${input.property.governorate} - ${input.property.country}
المساحة: ${input.property.area} م²

السعر النهائي الفائز: ${input.finalPrice} ${input.currency}

مرجع شروط المزاد
${termsLines || '- لا توجد شروط محفوظة'}

هذا المستند هو سجل عقد مولد من نتيجة المزاد المعتمدة داخل المنصة. حالة التوقيع والتنفيذ النظامي تحفظ بصورة مستقلة عن نتيجة المزاد.`;
}

function escapeHtml(value: unknown) {
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

interface HighestBid {
  bidderId: string | null;
  amount: string | number;
}

export async function settleAuction(
  tx: DbTransaction,
  input: {
    property: PropertyRow;
    highestBid: HighestBid;
    actorUserId: string | null;
  },
) {
  const property = input.property;
  const highestBid = input.highestBid;

  if (!property.userId) throw new Error('AUCTION_SELLER_MISSING');
  if (!highestBid?.bidderId) throw new Error('AUCTION_WINNER_MISSING');

  const [seller] = await tx.select().from(users).where(eq(users.id, property.userId)).limit(1);
  const [buyer] = await tx.select().from(users).where(eq(users.id, highestBid.bidderId)).limit(1);
  if (!seller || !buyer) throw new Error('AUCTION_PARTY_MISSING');

  const accepted = await tx
    .select({
      userId: auctionTermsAcceptance.userId,
      role: auctionTerms.role,
      version: auctionTerms.version,
      contentHash: auctionTerms.contentHash,
      acceptanceHash: auctionTermsAcceptance.acceptanceHash,
      acceptedAt: auctionTermsAcceptance.acceptedAt,
    })
    .from(auctionTermsAcceptance)
    .innerJoin(auctionTerms, eq(auctionTermsAcceptance.termsId, auctionTerms.id))
    .where(
      and(
        eq(auctionTermsAcceptance.propertyId, property.id),
        inArray(auctionTermsAcceptance.userId, [property.userId, highestBid.bidderId]),
      ),
    );

  const termsSnapshot: TermsSnapshotEntry[] = accepted.map((row) => ({
    userId: row.userId,
    role: row.role,
    version: row.version,
    contentHash: row.contentHash,
    acceptanceHash: row.acceptanceHash,
    acceptedAt: row.acceptedAt instanceof Date ? row.acceptedAt.toISOString() : String(row.acceptedAt),
  }));

  const now = new Date();
  const [award] = await tx
    .insert(auctionAwards)
    .values({
      propertyId: property.id,
      sellerId: property.userId,
      buyerId: highestBid.bidderId,
      organizerOrganizationId: property.auctionOrganizerOrganizationId ?? null,
      finalPrice: String(highestBid.amount),
      currency: property.currency || 'SAR',
      auctionType: property.auctionType || 'open',
      propertySnapshot: propertySnapshot(property),
      sellerSnapshot: personSnapshot(seller),
      buyerSnapshot: personSnapshot(buyer),
      termsSnapshot,
      status: 'awarded',
      awardedBy: input.actorUserId,
      awardedAt: now,
    })
    .returning();

  const contractNumber = `AUC-${now.getUTCFullYear()}-${award.id.slice(0, 8).toUpperCase()}`;
  const contractInput = {
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
  const documentFilename = `${contractNumber}.html`;

  const [contract] = await tx
    .insert(auctionContracts)
    .values({
      awardId: award.id,
      propertyId: property.id,
      sellerId: property.userId,
      buyerId: highestBid.bidderId,
      organizerOrganizationId: property.auctionOrganizerOrganizationId ?? null,
      contractNumber,
      templateVersion: AUCTION_CONTRACT_TEMPLATE_VERSION,
      content,
      contentHash,
      documentHtml,
      documentHash,
      documentMime: 'text/html; charset=utf-8',
      documentFilename,
      status: 'generated',
      generatedAt: now,
    })
    .returning();

  const contractUrl = `/api/auctions/${property.id}/contract`;

  const [updated] = await tx
    .update(properties)
    .set({
      auctionStatus: 'awarded',
      auctionWinnerId: highestBid.bidderId,
      auctionWinningPrice: String(highestBid.amount),
      auctionCurrentPrice: String(highestBid.amount),
      auctionContractUrl: contractUrl,
      updatedAt: now,
    })
    .where(eq(properties.id, property.id))
    .returning();

  await tx.insert(auctionEvents).values([
    {
      propertyId: property.id,
      actorUserId: input.actorUserId,
      eventType: 'AWARD_CREATED',
      payload: { awardId: award.id, buyerId: highestBid.bidderId, finalPrice: String(highestBid.amount) },
    },
    {
      propertyId: property.id,
      actorUserId: input.actorUserId,
      eventType: 'CONTRACT_GENERATED',
      payload: { contractId: contract.id, contractNumber, contentHash, documentHash, documentFilename },
    },
  ]);

  return { updated, award, contract };
}
