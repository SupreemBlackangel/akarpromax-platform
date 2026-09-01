import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { properties, propertyMedia } from '@/lib/db/schemas/properties-schema';
import { propertyOffers, propertyOfferTypes } from '@/lib/db/schemas/offer-types-schema';
import { eq, and, inArray, like, sql, or } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { createPropertySchema, propertySearchSchema } from '@/lib/validators/property-validators';
import { assertPropertyOfferPolicies } from '@/lib/properties/offer-policy';
import { GeoService } from '@/lib/services/geo/geo.service';
import { resolveGeoSelection } from '@/lib/services/geo/selection';

// Fields safe to expose on the PUBLIC feed. Everything else (owner/admin user
// ids, moderation fields, internal auction bid mechanics, winner/organizer ids,
// contract urls) is withheld — only the property's own owner sees the full row
// via ?mine=1.
const PUBLIC_PROPERTY_FIELDS = [
  "id", "titleAr", "titleEn", "descriptionAr", "descriptionEn",
  "dealType", "category", "propertyType",
  "country", "governorate", "city", "district", "latitude", "longitude", "address",
  "price", "currency", "area", "bedrooms", "bathrooms", "floor", "totalFloors",
  "yearBuilt", "facade", "direction", "referenceNumber", "advertisingLicense",
  "ownerName", "agentName", "officeId",
  "status", "isFeatured", "isVerified", "views",
  // Auction — public-facing bidding surface only (no internal bid mechanics/ids)
  "isAuction", "auctionType", "auctionStatus", "auctionStartPrice",
  "auctionCurrentPrice", "auctionStartDate", "auctionEndDate", "auctionBidCount",
  "createdAt", "updatedAt",
] as const;

function toPublicProperty(row: Record<string, unknown>, offerCodes: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PUBLIC_PROPERTY_FIELDS) {
    if (key in row) out[key] = row[key];
  }
  out.offerCodes = offerCodes;
  return out;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mine = searchParams.get('mine') === '1';
    const session = mine ? await getSession() : null;

    if (mine && !session) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const requestedStatus = searchParams.get('status') || undefined;
    const rawScope = searchParams.get('scope');
    if (rawScope && rawScope !== 'local' && rawScope !== 'global') {
      return NextResponse.json(
        { success: false, error: 'GEO_INVALID_SELECTION' },
        { status: 400 },
      );
    }

    const requestedCountry = searchParams.get('country') || undefined;
    const legacyGlobal = requestedCountry === 'all' || requestedCountry === 'global';
    const geoResolution = await resolveGeoSelection({
      scope: legacyGlobal ? 'global' : rawScope as 'local' | 'global' | undefined,
      country: legacyGlobal ? undefined : requestedCountry,
      governorate: searchParams.get('governorate'),
      city: searchParams.get('city'),
      district: searchParams.get('district'),
    }, new GeoService());

    if (!geoResolution.ok) {
      return NextResponse.json(
        { success: false, error: geoResolution.error },
        { status: 400 },
      );
    }

    const validated = propertySearchSchema.parse({
      dealType: searchParams.get('dealType') || undefined,
      category: searchParams.get('category') || undefined,
      propertyType: searchParams.get('propertyType') || undefined,
      country: searchParams.get('country') || undefined,
      governorate: searchParams.get('governorate') || undefined,
      city: searchParams.get('city') || undefined,
      district: searchParams.get('district') || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      minArea: searchParams.get('minArea') ? parseFloat(searchParams.get('minArea')!) : undefined,
      maxArea: searchParams.get('maxArea') ? parseFloat(searchParams.get('maxArea')!) : undefined,
      bedrooms: searchParams.get('bedrooms') ? parseInt(searchParams.get('bedrooms')!) : undefined,
      bathrooms: searchParams.get('bathrooms') ? parseInt(searchParams.get('bathrooms')!) : undefined,
      search: searchParams.get('search') || undefined,
      status: mine ? requestedStatus : 'approved',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    const offset = (validated.page - 1) * validated.limit;
    const conditions = [];
    const rawIds = searchParams.get('ids');
    const requestedIds = rawIds
      ? [...new Set(rawIds.split(',').map((value) => value.trim()).filter(Boolean))]
      : [];
    if (requestedIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
      return NextResponse.json({ success: false, error: 'INVALID_PROPERTY_IDS' }, { status: 400 });
    }
    if (requestedIds.length) conditions.push(inArray(properties.id, requestedIds));

    if (mine && session) {
      conditions.push(eq(properties.userId, session.userId));
    }

    if (validated.dealType) conditions.push(eq(properties.dealType, validated.dealType));
    if (validated.category) conditions.push(eq(properties.category, validated.category));
    if (validated.propertyType) conditions.push(eq(properties.propertyType, validated.propertyType));
    const geo = geoResolution.value;
    if (geo.scope === 'local') {
      conditions.push(inArray(sql<string>`lower(${properties.country})`, geo.aliases.country));
      if (geo.governorate) {
        conditions.push(inArray(sql<string>`lower(${properties.governorate})`, geo.aliases.governorate));
      }
      if (geo.city) conditions.push(inArray(sql<string>`lower(${properties.city})`, geo.aliases.city));
      if (geo.district) conditions.push(inArray(sql<string>`lower(${properties.district})`, geo.aliases.district));
    }
    if (validated.status) conditions.push(eq(properties.status, validated.status));
    if (validated.bedrooms !== undefined) conditions.push(eq(properties.bedrooms, validated.bedrooms));
    if (validated.bathrooms !== undefined) conditions.push(eq(properties.bathrooms, validated.bathrooms));
    if (validated.minPrice !== undefined) conditions.push(sql`${properties.price} >= ${validated.minPrice}`);
    if (validated.maxPrice !== undefined) conditions.push(sql`${properties.price} <= ${validated.maxPrice}`);
    if (validated.minArea !== undefined) conditions.push(sql`${properties.area} >= ${validated.minArea}`);
    if (validated.maxArea !== undefined) conditions.push(sql`${properties.area} <= ${validated.maxArea}`);

    if (validated.search) {
      conditions.push(
        or(
          like(properties.titleAr, `%${validated.search}%`),
          like(properties.titleEn, `%${validated.search}%`),
          like(properties.descriptionAr, `%${validated.search}%`),
          like(properties.descriptionEn, `%${validated.search}%`),
          like(properties.address, `%${validated.search}%`),
          like(properties.city, `%${validated.search}%`),
          like(properties.district, `%${validated.search}%`)
        )!
      );
    }

    const sortColumn = validated.sortBy === 'createdAt' ? properties.createdAt :
                       validated.sortBy === 'price' ? properties.price :
                       validated.sortBy === 'area' ? properties.area :
                       properties.views;

    const order = validated.sortOrder === 'asc' ? sql`${sortColumn} ASC` : sql`${sortColumn} DESC`;

    const query = db.select()
      .from(properties)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(validated.limit)
      .offset(offset);

    const [results, totalResult] = await Promise.all([
      query,
      db.select({ count: sql<number>`count(*)` })
        .from(properties)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    const total = totalResult[0]?.count || 0;

    // Attach the active offer-type codes of each property so public filters
    // can distinguish the full offer taxonomy (TAQBEEL, INVESTMENT, ...) —
    // dealType alone only carries sale/rent.
    const offerCodesByProperty = new Map<string, string[]>();
    const resultIds = results.map((row) => row.id);
    if (resultIds.length > 0) {
      try {
        const offerRows = await db
          .select({ propertyId: propertyOffers.propertyId, code: propertyOfferTypes.code })
          .from(propertyOffers)
          .innerJoin(propertyOfferTypes, eq(propertyOffers.offerTypeId, propertyOfferTypes.id))
          .where(and(inArray(propertyOffers.propertyId, resultIds), eq(propertyOffers.status, 'active')));
        for (const row of offerRows) {
          const list = offerCodesByProperty.get(row.propertyId) ?? [];
          if (!list.includes(row.code)) list.push(row.code);
          offerCodesByProperty.set(row.propertyId, list);
        }
      } catch (offerError) {
        // Offer codes are an enrichment — a missing offers table must not take
        // the whole marketplace feed down.
        console.error('[Properties GET] offer codes lookup failed:', offerError);
      }
    }

    // Owners viewing their own listings (?mine=1) get the full row; the public
    // feed gets a safe projection so internal ids/moderation/auction mechanics
    // never leak.
    const data = results.map((row) => {
      const offerCodes = offerCodesByProperty.get(row.id) ?? [];
      return mine ? { ...row, offerCodes } : toPublicProperty(row as Record<string, unknown>, offerCodes);
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        pages: Math.ceil(total / validated.limit),
      },
    });
  } catch (error) {
    console.error('[Properties GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب العقارات' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح، يرجى تسجيل الدخول' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = createPropertySchema.parse(body);

    await assertPropertyOfferPolicies(db, validated.offers);

    const property = await db.transaction(async (tx) => {
      const [created] = await tx.insert(properties).values({
        userId: session.userId,
        titleAr: validated.titleAr,
        titleEn: validated.titleEn || '',
        descriptionAr: validated.descriptionAr,
        descriptionEn: validated.descriptionEn || '',
        dealType: validated.dealType,
        category: validated.category,
        propertyType: validated.propertyType,
        country: validated.country,
        governorate: validated.governorate,
        city: validated.city,
        district: validated.district || '',
        latitude: validated.latitude === null || validated.latitude === undefined ? null : String(validated.latitude),
        longitude: validated.longitude === null || validated.longitude === undefined ? null : String(validated.longitude),
        address: validated.address || '',
        price: String(validated.price),
        currency: validated.currency || 'SAR',
        area: String(validated.area),
        bedrooms: validated.bedrooms ?? 0,
        bathrooms: validated.bathrooms ?? 0,
        floor: validated.floor ?? 0,
        totalFloors: validated.totalFloors ?? 0,
        yearBuilt: validated.yearBuilt ?? null,
        facade: validated.facade || '',
        direction: validated.direction || '',
        referenceNumber: validated.referenceNumber || '',
        advertisingLicense: validated.advertisingLicense || '',
        officeId: validated.officeId || null,
        status: 'draft',
      }).returning();

      if (!created) throw new Error('فشل في إنشاء العقار');

      if (validated.media && validated.media.length > 0) {
        await tx.insert(propertyMedia).values(
          validated.media.map((media, index) => ({
            propertyId: created.id,
            url: media.url,
            type: media.type,
            order: index,
            isFeatured: index === 0,
            altText: media.altText || '',
          }))
        );
      }

      if (validated.offers && validated.offers.length > 0) {
        await tx.insert(propertyOffers).values(
          validated.offers.map((offer) => ({
            propertyId: created.id,
            offerTypeId: offer.offerTypeId,
            marketingMethod: offer.marketingMethod,
            auctionType: offer.marketingMethod === 'auction' ? offer.auctionType ?? null : null,
            status: offer.isActive ? 'active' : 'draft',
            price: String(offer.price),
            currency: offer.currency || 'SAR',
            negotiable: offer.negotiable || false,
            details: offer.details || {},
          }))
        );
      }

      return created;
    });

    return NextResponse.json({
      success: true,
      data: property,
      message: 'تم حفظ العقار كمسودة',
    });
  } catch (error) {
    console.error('[Properties POST] Error:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'فشل في إضافة العقار' },
      { status: 500 }
    );
  }
}
