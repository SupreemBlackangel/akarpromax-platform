import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { properties, auctionBids } from '@/lib/db/schemas/properties-schema';
import { propertyOffers } from '@/lib/db/schemas/offer-types-schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { db, end } = getDb();
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'active';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const where = and(
      eq(properties.isAuction, true),
      eq(properties.auctionStatus, status)
    );

    const results = await db
      .select()
      .from(properties)
      .where(where)
      .orderBy(desc(properties.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(where);

    const propertyIds = results.map(p => p.id);
    let offers: Array<typeof propertyOffers.$inferSelect> = [];
    if (propertyIds.length > 0) {
      offers = await db
        .select()
        .from(propertyOffers)
        .where(inArray(propertyOffers.propertyId, propertyIds));
    }

    const bidCounts: Record<string, number> = {};
    if (propertyIds.length > 0) {
      const counts = await db
        .select({ propertyId: auctionBids.propertyId, count: sql<number>`count(*)` })
        .from(auctionBids)
        .where(inArray(auctionBids.propertyId, propertyIds))
        .groupBy(auctionBids.propertyId);
      for (const row of counts) {
        if (row.propertyId) bidCounts[row.propertyId] = Number(row.count) || 0;
      }
    }

    const enriched = results.map(p => ({
      ...p,
      offers: offers.filter(o => o.propertyId === p.id),
      bidCount: bidCounts[p.id] || 0,
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: {
        page,
        limit,
        total: totalResult[0]?.count || 0,
        pages: Math.ceil((totalResult[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[Auctions GET] Error:', error);
    return NextResponse.json({ error: 'فشل في جلب المزادات' }, { status: 500 });
  } finally {
    await end();
  }
}
