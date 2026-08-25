import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { properties, auctionBids } from '@/lib/db/schemas/properties-schema';
import { propertyOffers } from '@/lib/db/schemas/offer-types-schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!property.isAuction) {
      return NextResponse.json({ error: 'هذا العقار ليس مزاداً' }, { status: 400 });
    }

    const offers = await db
      .select()
      .from(propertyOffers)
      .where(eq(propertyOffers.propertyId, id));

    const bids = await db
      .select()
      .from(auctionBids)
      .where(eq(auctionBids.propertyId, id))
      .orderBy(desc(auctionBids.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      data: { ...property, offers, bids },
    });
  } catch (error) {
    console.error('[Auction Detail GET] Error:', error);
    return NextResponse.json({ error: 'فشل في جلب المزاد' }, { status: 500 });
  } finally {
    await end();
  }
}
