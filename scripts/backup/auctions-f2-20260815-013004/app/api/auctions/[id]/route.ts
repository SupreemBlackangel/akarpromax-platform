import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { properties, auctionBids } from '@/lib/db/schemas/properties-schema';
import { propertyOffers } from '@/lib/db/schemas/offer-types-schema';
import { auctionContracts } from '@/lib/db/schemas/auction-hardening-schema';
import { getActiveAuctionTerms } from '@/lib/auctions/policy';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  const { db, end } = getDb();

  try {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);

    if (!property || property.status !== 'approved') {
      return NextResponse.json({ error: 'العقار غير موجود' }, { status: 404 });
    }
    if (!property.isAuction) {
      return NextResponse.json({ error: 'هذا العقار ليس مزاداً' }, { status: 400 });
    }

    const privileged = Boolean(
      session && (
        session.userId === property.userId ||
        session.userId === property.auctionCreatedByUserId ||
        session.role === 'super_admin' ||
        session.permissions.includes('*')
      ),
    );

    if (property.auctionStatus === 'pending_seller_terms' && !privileged) {
      return NextResponse.json({ error: 'المزاد غير متاح بعد' }, { status: 404 });
    }

    const [offers, bids, bidderTerms, contract] = await Promise.all([
      db.select().from(propertyOffers).where(eq(propertyOffers.propertyId, id)),
      db
        .select({
          id: auctionBids.id,
          amount: auctionBids.amount,
          isAutoBid: auctionBids.isAutoBid,
          createdAt: auctionBids.createdAt,
        })
        .from(auctionBids)
        .where(and(eq(auctionBids.propertyId, id), isNull(auctionBids.invalidatedAt)))
        .orderBy(desc(auctionBids.createdAt))
        .limit(50),
      getActiveAuctionTerms(db, 'bidder'),
      db
        .select({
          id: auctionContracts.id,
          contractNumber: auctionContracts.contractNumber,
          contentHash: auctionContracts.contentHash,
          status: auctionContracts.status,
        })
        .from(auctionContracts)
        .where(eq(auctionContracts.propertyId, id))
        .limit(1)
        .then((rows: any[]) => rows[0] ?? null),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...property,
        offers,
        bids,
        bidderTerms: bidderTerms ? {
          version: bidderTerms.version,
          contentAr: bidderTerms.contentAr,
          contentEn: bidderTerms.contentEn,
          contentHash: bidderTerms.contentHash,
        } : null,
        contract: contract ? {
          contractNumber: contract.contractNumber,
          contentHash: contract.contentHash,
          status: contract.status,
          url: property.auctionContractUrl,
        } : null,
        viewerActions: {
          canAcceptSellerTerms: Boolean(session && session.userId === property.userId && property.auctionStatus === 'pending_seller_terms'),
          canDecideOpenAuction: Boolean(session && session.userId === property.userId && property.auctionType === 'open' && property.auctionStatus === 'awaiting_seller_decision'),
          canFinalizeExpiredAuction: Boolean(session && property.auctionStatus === 'active' && property.auctionEndDate && new Date(property.auctionEndDate).getTime() <= Date.now()),
        },
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[Auction Detail GET] Error:', error);
    return NextResponse.json({ error: 'فشل في جلب المزاد' }, { status: 500 });
  } finally {
    await end();
  }
}
