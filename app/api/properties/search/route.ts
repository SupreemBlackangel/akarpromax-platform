import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { properties } from '@/lib/db/schemas/properties-schema';
import { propertyOffers } from '@/lib/db/schemas/offer-types-schema';
import { eq, and, or, like, desc, asc, sql, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const { db, end } = getDb();
  try {
    const q = sp.get('q') || undefined;
    const offerTypeId = sp.get('offerTypeId') || undefined;
    const marketingMethod = sp.get('marketingMethod') || 'all';
    const auctionType = sp.get('auctionType') || 'all';
    const category = sp.get('category') || undefined;
    const propertyType = sp.get('propertyType') || undefined;
    const country = sp.get('country') || undefined;
    const governorate = sp.get('governorate') || undefined;
    const city = sp.get('city') || undefined;
    const district = sp.get('district') || undefined;
    const minPrice = sp.get('minPrice') ? parseFloat(sp.get('minPrice')!) : undefined;
    const maxPrice = sp.get('maxPrice') ? parseFloat(sp.get('maxPrice')!) : undefined;
    const minArea = sp.get('minArea') ? parseFloat(sp.get('minArea')!) : undefined;
    const maxArea = sp.get('maxArea') ? parseFloat(sp.get('maxArea')!) : undefined;
    const bedrooms = sp.get('bedrooms') ? parseInt(sp.get('bedrooms')!) : undefined;
    const bathrooms = sp.get('bathrooms') ? parseInt(sp.get('bathrooms')!) : undefined;
    const page = Math.max(parseInt(sp.get('page') || '1') || 1, 1);
    const limit = Math.min(Math.max(parseInt(sp.get('limit') || '20') || 20, 1), 100);
    const sortBy = sp.get('sortBy') || 'createdAt';
    const sortOrder = sp.get('sortOrder') || 'desc';

    const conditions = [eq(properties.status, 'approved')];

    if (q) {
      conditions.push(
        or(
          like(properties.titleAr, `%${q}%`),
          like(properties.titleEn, `%${q}%`),
          like(properties.descriptionAr, `%${q}%`),
          like(properties.descriptionEn, `%${q}%`),
          like(properties.city, `%${q}%`),
          like(properties.district, `%${q}%`)
        )!
      );
    }

    const offerConditions = [];

    if (offerTypeId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(offerTypeId)) {
        return NextResponse.json({ success: false, error: 'offerTypeId غير صالح' }, { status: 400 });
      }
      offerConditions.push(eq(propertyOffers.offerTypeId, offerTypeId));
    }

    if (marketingMethod === 'auction' || marketingMethod === 'direct') {
      offerConditions.push(eq(propertyOffers.marketingMethod, marketingMethod));
    }

    if (auctionType === 'fixed' || auctionType === 'open') {
      offerConditions.push(eq(propertyOffers.marketingMethod, 'auction'));
      offerConditions.push(eq(propertyOffers.auctionType, auctionType));
    }

    if (offerConditions.length > 0) {
      offerConditions.push(eq(propertyOffers.status, 'active'));
      const matchingOffers = await db
        .select({ propertyId: propertyOffers.propertyId })
        .from(propertyOffers)
        .where(and(...offerConditions));

      const matchingPropertyIds = [...new Set(matchingOffers.map((row) => row.propertyId))];
      conditions.push(
        matchingPropertyIds.length > 0
          ? inArray(properties.id, matchingPropertyIds)
          : sql`1 = 0`
      );
    }

    if (category) conditions.push(eq(properties.category, category));
    if (propertyType) conditions.push(eq(properties.propertyType, propertyType));
    if (country) conditions.push(eq(properties.country, country));
    if (governorate) conditions.push(eq(properties.governorate, governorate));
    if (city) conditions.push(eq(properties.city, city));
    if (district) conditions.push(eq(properties.district, district));
    if (minPrice !== undefined) conditions.push(sql`${properties.price} >= ${minPrice}`);
    if (maxPrice !== undefined) conditions.push(sql`${properties.price} <= ${maxPrice}`);
    if (minArea !== undefined) conditions.push(sql`${properties.area} >= ${minArea}`);
    if (maxArea !== undefined) conditions.push(sql`${properties.area} <= ${maxArea}`);
    if (bedrooms !== undefined) conditions.push(sql`${properties.bedrooms} >= ${bedrooms}`);
    if (bathrooms !== undefined) conditions.push(sql`${properties.bathrooms} >= ${bathrooms}`);

    const sortCol = sortBy === 'price' ? properties.price : sortBy === 'area' ? properties.area : sortBy === 'views' ? properties.views : properties.createdAt;
    const order = sortOrder === 'asc' ? asc(sortCol) : desc(sortCol);
    const offset = (page - 1) * limit;
    const where = and(...conditions);

    const results = await db.select().from(properties).where(where).orderBy(order).limit(limit).offset(offset);
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(properties).where(where);

    return NextResponse.json({
      success: true,
      data: results,
      pagination: { page, limit, total: totalResult[0]?.count || 0, pages: Math.ceil((totalResult[0]?.count || 0) / limit) },
    });
  } finally {
    await end();
  }
}
