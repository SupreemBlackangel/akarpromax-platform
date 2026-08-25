import { eq, inArray } from 'drizzle-orm';

import { db as appDb } from '@/lib/db';
import { propertyOfferTypes } from '@/lib/db/schemas/offer-types-schema';

type AppDb = typeof appDb;

export type PropertyOfferPolicyInput = {
  offerTypeId: string;
  marketingMethod: 'direct' | 'auction';
  auctionType?: 'fixed' | 'open';
};

export async function assertPropertyOfferPolicies(
  database: AppDb,
  offers: PropertyOfferPolicyInput[] | undefined,
): Promise<void> {
  if (!offers || offers.length === 0) return;

  const ids = [...new Set(offers.map((offer) => offer.offerTypeId))];
  const rows = await database
    .select()
    .from(propertyOfferTypes)
    .where(inArray(propertyOfferTypes.id, ids));

  const byId = new Map(rows.map((row) => [row.id, row]));

  for (const offer of offers) {
    const type = byId.get(offer.offerTypeId);

    if (!type || type.isActive !== true) {
      throw new Error('نوع العرض غير موجود أو غير نشط');
    }

    if (offer.marketingMethod === 'direct') {
      if (type.allowDirect !== true) {
        throw new Error(`نوع العرض ${type.code} لا يسمح بالتسويق المباشر`);
      }
      if (offer.auctionType) {
        throw new Error('نوع المزاد غير مسموح مع التسويق المباشر');
      }
      continue;
    }

    if (type.allowAuction !== true) {
      throw new Error(`نوع العرض ${type.code} لا يسمح بالمزاد`);
    }

    if (!offer.auctionType) {
      throw new Error('نوع المزاد مطلوب');
    }

    if (offer.auctionType === 'fixed' && type.allowFixedAuction !== true) {
      throw new Error(`نوع العرض ${type.code} لا يسمح بالمزاد المحدد`);
    }

    if (offer.auctionType === 'open' && type.allowOpenAuction !== true) {
      throw new Error(`نوع العرض ${type.code} لا يسمح بالمزاد المفتوح`);
    }
  }
}
