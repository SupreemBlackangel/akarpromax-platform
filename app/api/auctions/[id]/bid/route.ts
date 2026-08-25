import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { properties, auctionBids } from '@/lib/db/schemas/properties-schema';
import { auctionEvents } from '@/lib/db/schemas/auction-hardening-schema';
import { ensureTermsAcceptance, parseMoney } from '@/lib/auctions/policy';

export const dynamic = 'force-dynamic';

function cents(value: number): number {
  return Math.round(value * 100);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });

  const amount = parseMoney(body.amount);
  const idempotencyKey = String(request.headers.get('idempotency-key') || body.idempotencyKey || '').trim();
  const termsAccepted = body.termsAccepted === true;

  if (amount === null || amount <= 0) {
    return NextResponse.json({ error: 'المبلغ مطلوب ويجب أن يكون موجباً' }, { status: 400 });
  }
  if (!/^[A-Za-z0-9._:-]{8,120}$/.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Idempotency-Key مطلوب للمزايدة' }, { status: 400 });
  }
  if (!termsAccepted) {
    return NextResponse.json({ error: 'يجب الموافقة على شروط المزايدة' }, { status: 400 });
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
      if (!property.isAuction) throw new Error('NOT_AUCTION');
      if (property.auctionStatus !== 'active') throw new Error('AUCTION_NOT_ACTIVE');
      if (property.userId === session.userId) throw new Error('SELF_BID_FORBIDDEN');

      const now = new Date();
      if (property.auctionStartDate && new Date(property.auctionStartDate).getTime() > now.getTime()) {
        throw new Error('AUCTION_NOT_STARTED');
      }
      if (!property.auctionEndDate || new Date(property.auctionEndDate).getTime() <= now.getTime()) {
        throw new Error('AUCTION_ENDED');
      }

      const [existing] = await tx
        .select()
        .from(auctionBids)
        .where(
          and(
            eq(auctionBids.propertyId, id),
            eq(auctionBids.bidderId, session.userId),
            eq(auctionBids.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);

      if (existing) {
        return {
          bid: existing,
          currentPrice: property.auctionCurrentPrice,
          bidCount: property.auctionBidCount || 0,
          idempotent: true,
        };
      }

      await ensureTermsAcceptance(tx, { propertyId: id, userId: session.userId, role: 'bidder' });

      const current = parseMoney(property.auctionCurrentPrice ?? property.auctionStartPrice) ?? 0;
      const increment = parseMoney(property.auctionBidIncrement) ?? 1;
      const minimumConfigured = parseMoney(property.auctionMinBid);
      const maximumConfigured = parseMoney(property.auctionMaxBid);
      const required = Math.max(
        cents(current) + cents(increment),
        minimumConfigured === null ? 0 : cents(minimumConfigured),
      );
      const offered = cents(amount);

      if (offered < required) {
        throw new Error(`BID_TOO_LOW:${(required / 100).toFixed(2)}`);
      }
      if (maximumConfigured !== null && offered > cents(maximumConfigured)) {
        throw new Error(`BID_ABOVE_MAX:${maximumConfigured.toFixed(2)}`);
      }

      const [bid] = await tx
        .insert(auctionBids)
        .values({
          propertyId: id,
          bidderId: session.userId,
          amount: (offered / 100).toFixed(2),
          isAutoBid: false,
          idempotencyKey,
        })
        .returning();

      const nextCount = (property.auctionBidCount || 0) + 1;
      await tx
        .update(properties)
        .set({
          auctionCurrentPrice: (offered / 100).toFixed(2),
          auctionBidCount: nextCount,
          updatedAt: now,
        })
        .where(eq(properties.id, id));

      await tx.insert(auctionEvents).values({
        propertyId: id,
        actorUserId: session.userId,
        eventType: 'BID_PLACED',
        payload: {
          bidId: bid.id,
          amount: (offered / 100).toFixed(2),
          idempotencyKey,
          serverTime: now.toISOString(),
        },
      });

      return { bid, currentPrice: (offered / 100).toFixed(2), bidCount: nextCount, idempotent: false };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'PROPERTY_NOT_FOUND') return NextResponse.json({ error: 'العقار غير موجود' }, { status: 404 });
    if (code === 'NOT_AUCTION') return NextResponse.json({ error: 'هذا العقار ليس مزاداً' }, { status: 400 });
    if (code === 'AUCTION_NOT_ACTIVE') return NextResponse.json({ error: 'المزاد غير نشط' }, { status: 409 });
    if (code === 'SELF_BID_FORBIDDEN') return NextResponse.json({ error: 'لا يمكن للبائع المزايدة على عقاره' }, { status: 403 });
    if (code === 'AUCTION_NOT_STARTED') return NextResponse.json({ error: 'لم يبدأ المزاد بعد' }, { status: 409 });
    if (code === 'AUCTION_ENDED') return NextResponse.json({ error: 'انتهى وقت المزاد' }, { status: 409 });
    if (code.startsWith('BID_TOO_LOW:')) {
      return NextResponse.json({ error: `الحد الأدنى للمزايدة التالية هو ${code.split(':')[1]}` }, { status: 409 });
    }
    if (code.startsWith('BID_ABOVE_MAX:')) {
      return NextResponse.json({ error: `المزايدة تتجاوز الحد الأعلى ${code.split(':')[1]}` }, { status: 409 });
    }
    if (code === 'AUCTION_BIDDER_TERMS_MISSING') {
      return NextResponse.json({ error: 'شروط المزايد غير مهيأة' }, { status: 500 });
    }
    if ((error as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: 'تم تسجيل هذه المزايدة مسبقاً', code: 'DUPLICATE_IDEMPOTENCY_KEY' }, { status: 409 });
    }
    console.error('[Auction Bid POST] Error:', error);
    return NextResponse.json({ error: 'فشل في إرسال المزايدة' }, { status: 500 });
  } finally {
    await end();
  }
}
