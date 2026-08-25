import { NextRequest, NextResponse } from 'next/server';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { properties, auctionBids } from '@/lib/db/schemas/properties-schema';
import { auctionEvents } from '@/lib/db/schemas/auction-hardening-schema';
import { settleAuction } from '@/lib/auctions/settlement';
import { getClosedAuctionOrganizer } from '@/lib/auctions/policy';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await params;
  const { db, end } = getDb();

  try {
    const result = await db.transaction(async (tx) => {
      const [property] = await tx
        .select()
        .from(properties)
        .where(eq(properties.id, id))
        .for('update')
        .limit(1);

      if (!property) throw new Error('PROPERTY_NOT_FOUND');
      if (!property.isAuction) throw new Error('NOT_AUCTION');

      const platformAdmin = session.role === 'super_admin' || session.permissions.includes('*');
      let canFinalize = platformAdmin;

      if (!canFinalize && property.auctionType === 'open') {
        canFinalize = property.userId === session.userId;
      }

      if (!canFinalize && property.auctionType === 'fixed' && property.auctionOrganizerOrganizationId) {
        const organizer = await getClosedAuctionOrganizer(
          tx,
          property.auctionOrganizerOrganizationId,
          session.userId,
        );
        canFinalize = Boolean(organizer);
      }

      if (!canFinalize) throw new Error('AUCTION_END_FORBIDDEN');

      if (['awarded', 'ended_no_bids', 'rejected', 'cancelled'].includes(property.auctionStatus || '')) {
        return { property, idempotent: true };
      }
      if (property.auctionStatus === 'awaiting_seller_decision') {
        return { property, idempotent: true, awaitingSellerDecision: true };
      }
      if (property.auctionStatus !== 'active') throw new Error('AUCTION_NOT_ACTIVE');

      const now = new Date();
      if (!property.auctionEndDate || new Date(property.auctionEndDate).getTime() > now.getTime()) {
        throw new Error('AUCTION_NOT_FINISHED');
      }

      const [highestBid] = await tx
        .select()
        .from(auctionBids)
        .where(and(eq(auctionBids.propertyId, id), isNull(auctionBids.invalidatedAt)))
        .orderBy(desc(auctionBids.amount), asc(auctionBids.createdAt))
        .limit(1);

      const validHighest = highestBid ?? null;

      await tx.insert(auctionEvents).values({
        propertyId: id,
        actorUserId: session.userId,
        eventType: 'AUCTION_ENDED',
        payload: {
          serverTime: now.toISOString(),
          highestBidId: validHighest?.id ?? null,
          highestBidAmount: validHighest ? String(validHighest.amount) : null,
        },
      });

      if (!validHighest) {
        const [updated] = await tx
          .update(properties)
          .set({
            auctionStatus: 'ended_no_bids',
            auctionWinnerId: null,
            auctionWinningPrice: null,
            updatedAt: now,
          })
          .where(eq(properties.id, id))
          .returning();
        return { property: updated, idempotent: false, noBids: true };
      }

      if (property.auctionType === 'open') {
        const [updated] = await tx
          .update(properties)
          .set({
            auctionStatus: 'awaiting_seller_decision',
            auctionWinnerId: validHighest.bidderId,
            auctionWinningPrice: String(validHighest.amount),
            auctionCurrentPrice: String(validHighest.amount),
            updatedAt: now,
          })
          .where(eq(properties.id, id))
          .returning();

        await tx.insert(auctionEvents).values({
          propertyId: id,
          actorUserId: session.userId,
          eventType: 'OPEN_AUCTION_SELLER_DECISION_REQUIRED',
          payload: { bidderId: validHighest.bidderId, amount: String(validHighest.amount) },
        });

        return { property: updated, idempotent: false, awaitingSellerDecision: true };
      }

      const settled = await settleAuction(tx, {
        property,
        highestBid: validHighest,
        actorUserId: session.userId,
      });

      return {
        property: settled.updated,
        award: settled.award,
        contract: {
          id: settled.contract.id,
          contractNumber: settled.contract.contractNumber,
          contentHash: settled.contract.contentHash,
          status: settled.contract.status,
        },
        idempotent: false,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'PROPERTY_NOT_FOUND') return NextResponse.json({ error: 'العقار غير موجود' }, { status: 404 });
    if (code === 'NOT_AUCTION') return NextResponse.json({ error: 'هذا العقار ليس مزاداً' }, { status: 400 });
    if (code === 'AUCTION_END_FORBIDDEN') return NextResponse.json({ error: 'غير مصرح لك بإنهاء هذا المزاد' }, { status: 403 });
    if (code === 'AUCTION_NOT_ACTIVE') return NextResponse.json({ error: 'المزاد غير نشط' }, { status: 409 });
    if (code === 'AUCTION_NOT_FINISHED') return NextResponse.json({ error: 'لا يمكن إنهاء المزاد قبل وقت انتهائه المعتمد من الخادم' }, { status: 409 });
    console.error('[Auction End POST] Error:', error);
    return NextResponse.json({ error: 'فشل في إنهاء المزاد' }, { status: 500 });
  } finally {
    await end();
  }
}
