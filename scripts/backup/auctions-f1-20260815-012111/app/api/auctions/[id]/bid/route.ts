import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { properties, auctionBids } from '@/lib/db/schemas/properties-schema';
import { eq } from 'drizzle-orm';
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
  const body = await request.json();
  const { amount } = body;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'المبلغ مطلوب' }, { status: 400 });
  }

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
    if (property.auctionStatus !== 'active') {
      return NextResponse.json({ error: 'المزاد غير نشط' }, { status: 400 });
    }
    if (property.auctionEndDate && new Date(property.auctionEndDate) < new Date()) {
      return NextResponse.json({ error: 'انتهى المزاد' }, { status: 400 });
    }
    if (amount <= parseFloat(property.auctionCurrentPrice || '0')) {
      return NextResponse.json({ error: 'يجب أن تكون المزايدة أعلى من السعر الحالي' }, { status: 400 });
    }

    const [bid] = await db.insert(auctionBids).values({
      propertyId: id,
      bidderId: session.userId,
      amount: String(amount),
      isAutoBid: false,
    }).returning();

    await db
      .update(properties)
      .set({
        auctionCurrentPrice: String(amount),
        auctionBidCount: (property.auctionBidCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, id));

    return NextResponse.json({ success: true, data: bid });
  } catch (error) {
    console.error('[Bid POST] Error:', error);
    return NextResponse.json({ error: 'فشل في إرسال المزايدة' }, { status: 500 });
  } finally {
    await end();
  }
}
