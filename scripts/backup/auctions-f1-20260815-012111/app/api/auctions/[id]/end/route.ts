import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { properties, auctionBids } from '@/lib/db/schemas/properties-schema';
import { eq, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const { id } = await params;
  const { db, end } = getDb();
  try {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);

    if (!property) {
      return NextResponse.json({ error: 'العقار غير موجود' }, { status: 404 });
    }
    if (property.auctionStatus === 'ended') {
      return NextResponse.json({ error: 'المزاد منتهي بالفعل' }, { status: 400 });
    }

    const [highestBid] = await db
      .select()
      .from(auctionBids)
      .where(eq(auctionBids.propertyId, id))
      .orderBy(desc(auctionBids.amount))
      .limit(1);

    const [updated] = await db
      .update(properties)
      .set({
        auctionStatus: 'ended',
        auctionWinnerId: highestBid?.bidderId || null,
        auctionWinningPrice: highestBid ? String(highestBid.amount) : null,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        winnerId: highestBid?.bidderId || null,
        winningPrice: highestBid?.amount || null,
      },
    });
  } catch (error) {
    console.error('[End Auction] Error:', error);
    return NextResponse.json({ error: 'فشل في إنهاء المزاد' }, { status: 500 });
  } finally {
    await end();
  }
}
