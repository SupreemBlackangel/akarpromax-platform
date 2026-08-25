import { createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';

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

function personSnapshot(user: any) {
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    phone: user.phone ?? null,
  };
}

function propertySnapshot(property: any) {
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
  property: any;
  seller: any;
  buyer: any;
  finalPrice: string;
  currency: string;
  auctionType: string;
  termsSnapshot: any[];
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

export async function settleAuction(
  tx: any,
  input: {
    property: any;
    highestBid: any;
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

  const termsSnapshot = accepted.map((row: any) => ({
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
  const content = buildContractContent({
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
  const contentHash = createHash('sha256').update(content).digest('hex');

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
      payload: { contractId: contract.id, contractNumber, contentHash },
    },
  ]);

  return { updated, award, contract };
}
