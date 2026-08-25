import { NextRequest, NextResponse } from 'next/server';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { properties, auctionBids } from '@/lib/db/schemas/properties-schema';
import { auctionEvents } from '@/lib/db/schemas/auction-hardening-schema';
import { settleAuction } from '@/lib/auctions/settlement';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(body?.action || '').trim().toLowerCase();
  if (!['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'القرار يجب أن يكون accept أو reject' }, { status: 400 });
  }

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
      if (!property.isAuction || property.auctionType !== 'open') throw new Error('NOT_OPEN_AUCTION');
      if (property.userId !== session.userId) throw new Error('SELLER_ONLY');
      if (property.auctionStatus !== 'awaiting_seller_decision') throw new Error('INVALID_STATUS');

      const [highestBid] = await tx
        .select()
        .from(auctionBids)
        .where(and(eq(auctionBids.propertyId, id), isNull(auctionBids.invalidatedAt)))
        .orderBy(desc(auctionBids.amount), asc(auctionBids.createdAt))
        .limit(1);

      if (!highestBid) throw new Error('WINNER_MISSING');

      if (action === 'reject') {
        const [updated] = await tx
          .update(properties)
          .set({ auctionStatus: 'rejected', updatedAt: new Date() })
          .where(eq(properties.id, id))
          .returning();

        await tx.insert(auctionEvents).values({
          propertyId: id,
          actorUserId: session.userId,
          eventType: 'OPEN_AUCTION_RESULT_REJECTED',
          payload: { bidId: highestBid.id, bidderId: highestBid.bidderId, amount: String(highestBid.amount) },
        });

        return { property: updated, decision: 'rejected' };
      }

      const settled = await settleAuction(tx, {
        property,
        highestBid,
        actorUserId: session.userId,
      });

      await tx.insert(auctionEvents).values({
        propertyId: id,
        actorUserId: session.userId,
        eventType: 'OPEN_AUCTION_RESULT_ACCEPTED',
        payload: { awardId: settled.award.id, contractId: settled.contract.id },
      });

      return {
        property: settled.updated,
        decision: 'accepted',
        award: settled.award,
        contract: {
          id: settled.contract.id,
          contractNumber: settled.contract.contractNumber,
          contentHash: settled.contract.contentHash,
          status: settled.contract.status,
        },
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'PROPERTY_NOT_FOUND') return NextResponse.json({ error: 'العقار غير موجود' }, { status: 404 });
    if (code === 'NOT_OPEN_AUCTION') return NextResponse.json({ error: 'هذا القرار خاص بالمزاد المفتوح' }, { status: 400 });
    if (code === 'SELLER_ONLY') return NextResponse.json({ error: 'القرار متاح للبائع فقط' }, { status: 403 });
    if (code === 'INVALID_STATUS') return NextResponse.json({ error: 'حالة المزاد لا تسمح بهذا القرار' }, { status: 409 });
    if (code === 'WINNER_MISSING') return NextResponse.json({ error: 'لا توجد مزايدة فائزة صالحة' }, { status: 409 });
    console.error('[Open Auction Decision POST] Error:', error);
    return NextResponse.json({ error: 'فشل في اعتماد قرار البائع' }, { status: 500 });
  } finally {
    await end();
  }
}
