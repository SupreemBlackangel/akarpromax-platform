import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { properties, auctionBids } from '@/lib/db/schemas/properties-schema';
import { propertyOffers, propertyOfferTypes } from '@/lib/db/schemas/offer-types-schema';
import { auctionEvents } from '@/lib/db/schemas/auction-hardening-schema';
import {
  ensureTermsAcceptance,
  getClosedAuctionOrganizer,
  normalizeAuctionType,
  parseMoney,
} from '@/lib/auctions/policy';

export const dynamic = 'force-dynamic';

const TERMINAL_AUCTION_STATUSES = new Set(['rejected', 'ended_no_bids', 'cancelled']);

export async function GET(request: NextRequest) {
  const { db, end } = getDb();
  try {
    const q = request.nextUrl.searchParams;
    const mine = q.get('mine') === '1';
    const requestedStatus = q.get('status') || (mine ? 'all' : 'active');
    const page = Math.max(1, Number.parseInt(q.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(q.get('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;

    const session = mine ? await getSession(request.headers.get('cookie') ?? undefined) : null;
    if (mine && !session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const conditions = [eq(properties.isAuction, true)];
    if (!mine) conditions.push(eq(properties.status, 'approved'));
    if (requestedStatus !== 'all') conditions.push(eq(properties.auctionStatus, requestedStatus));
    if (mine && session) {
      conditions.push(
        or(
          eq(properties.userId, session.userId),
          eq(properties.auctionCreatedByUserId, session.userId),
        )!,
      );
    }

    const where = and(...conditions);
    const results = await db
      .select()
      .from(properties)
      .where(where)
      .orderBy(desc(properties.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(properties)
      .where(where);

    const propertyIds = results.map((p) => p.id);
    let offers: Array<typeof propertyOffers.$inferSelect> = [];
    const bidCounts: Record<string, number> = {};

    if (propertyIds.length > 0) {
      offers = await db
        .select()
        .from(propertyOffers)
        .where(inArray(propertyOffers.propertyId, propertyIds));

      const counts = await db
        .select({ propertyId: auctionBids.propertyId, count: sql<number>`count(*)::int` })
        .from(auctionBids)
        .where(
          and(
            inArray(auctionBids.propertyId, propertyIds),
            sql`${auctionBids.invalidatedAt} is null`,
          ),
        )
        .groupBy(auctionBids.propertyId);

      for (const row of counts) {
        if (row.propertyId) bidCounts[row.propertyId] = Number(row.count) || 0;
      }
    }

    return NextResponse.json({
      success: true,
      data: results.map((property) => ({
        ...property,
        offers: offers.filter((offer) => offer.propertyId === property.id),
        bidCount: bidCounts[property.id] || 0,
      })),
      pagination: {
        page,
        limit,
        total: Number(totalResult?.count || 0),
        pages: Math.ceil(Number(totalResult?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[Auctions GET] Error:', error);
    return NextResponse.json({ error: 'فشل في جلب المزادات' }, { status: 500 });
  } finally {
    await end();
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });

  const propertyId = String(body.propertyId || '').trim();
  const auctionType = normalizeAuctionType(body.type ?? body.auctionType);
  const startingPrice = parseMoney(body.startingPrice);
  const bidIncrement = parseMoney(body.bidIncrement ?? 100);
  const minBid = parseMoney(body.minBid);
  const maxBid = parseMoney(body.maxBid);
  const organizerOrganizationId = body.organizerOrganizationId ? String(body.organizerOrganizationId) : null;
  const acceptSellerTerms = body.acceptSellerTerms === true;

  if (!propertyId || !auctionType || startingPrice === null || startingPrice <= 0 || bidIncrement === null || bidIncrement <= 0) {
    return NextResponse.json({ error: 'بيانات المزاد غير مكتملة أو غير صالحة' }, { status: 400 });
  }
  if (minBid !== null && minBid < startingPrice) {
    return NextResponse.json({ error: 'الحد الأدنى للمزايدة لا يمكن أن يقل عن سعر البداية' }, { status: 400 });
  }
  if (maxBid !== null && maxBid <= startingPrice) {
    return NextResponse.json({ error: 'الحد الأعلى للمزايدة يجب أن يكون أعلى من سعر البداية' }, { status: 400 });
  }
  if (minBid !== null && maxBid !== null && maxBid < minBid) {
    return NextResponse.json({ error: 'الحد الأعلى أقل من الحد الأدنى' }, { status: 400 });
  }

  const now = new Date();
  const FIXED_AUCTION_HOURS = 72;
  const defaultDays = auctionType === 'fixed' ? 3 : 15;
  const maxDays = auctionType === 'fixed' ? 3 : 60;

  const endDate = auctionType === 'fixed'
    ? new Date(now.getTime() + FIXED_AUCTION_HOURS * 3600_000)
    : body.endDate
      ? new Date(String(body.endDate))
      : new Date(now.getTime() + defaultDays * 86_400_000);

  if (!Number.isFinite(endDate.getTime()) || endDate.getTime() <= now.getTime() + 10 * 60_000) {
    return NextResponse.json({ error: 'تاريخ انتهاء المزاد غير صالح' }, { status: 400 });
  }
  if (endDate.getTime() > now.getTime() + maxDays * 86_400_000) {
    return NextResponse.json({ error: `مدة المزاد تتجاوز الحد المسموح (${maxDays} يوم)` }, { status: 400 });
  }

  const { db, end } = getDb();
  try {
    const result = await db.transaction(async (tx) => {
      const [property] = await tx
        .select()
        .from(properties)
        .where(eq(properties.id, propertyId))
        .for('update')
        .limit(1);

      if (!property) throw new Error('PROPERTY_NOT_FOUND');
      if (property.status !== 'approved') throw new Error('PROPERTY_NOT_APPROVED');
      if (!property.userId) throw new Error('PROPERTY_SELLER_MISSING');
      if (property.isAuction && property.auctionStatus && !TERMINAL_AUCTION_STATUSES.has(property.auctionStatus)) {
        throw new Error('AUCTION_ALREADY_EXISTS');
      }

      const [auctionOffer] = await tx
        .select({
          offer: propertyOffers,
          type: propertyOfferTypes,
        })
        .from(propertyOffers)
        .innerJoin(propertyOfferTypes, eq(propertyOffers.offerTypeId, propertyOfferTypes.id))
        .where(
          and(
            eq(propertyOffers.propertyId, propertyId),
            eq(propertyOffers.marketingMethod, 'auction'),
            eq(propertyOffers.auctionType, auctionType),
            eq(propertyOffers.status, 'active'),
            eq(propertyOfferTypes.isActive, true),
          ),
        )
        .limit(1);

      if (!auctionOffer) throw new Error('AUCTION_OFFER_REQUIRED');
      if (auctionType === 'fixed' && auctionOffer.type.allowFixedAuction !== true) throw new Error('AUCTION_TYPE_NOT_ALLOWED');
      if (auctionType === 'open' && auctionOffer.type.allowOpenAuction !== true) throw new Error('AUCTION_TYPE_NOT_ALLOWED');

      let organizerId: string | null = null;
      if (auctionType === 'fixed') {
        if (!organizerOrganizationId) throw new Error('CLOSED_AUCTION_ORGANIZER_REQUIRED');
        const organizer = await getClosedAuctionOrganizer(tx, organizerOrganizationId, session.userId);
        if (!organizer) throw new Error('CLOSED_AUCTION_ORGANIZER_FORBIDDEN');
        if (property.officeId !== organizerOrganizationId && property.userId !== session.userId) {
          throw new Error('CLOSED_AUCTION_PROPERTY_SCOPE_FORBIDDEN');
        }
        organizerId = organizerOrganizationId;
      } else if (property.userId !== session.userId) {
        throw new Error('OPEN_AUCTION_SELLER_ONLY');
      }

      const sellerIsCreator = property.userId === session.userId;
      if (auctionType === 'open' && !acceptSellerTerms) throw new Error('SELLER_TERMS_REQUIRED');

      const nextStatus = sellerIsCreator && acceptSellerTerms ? 'active' : 'pending_seller_terms';

      const [updated] = await tx
        .update(properties)
        .set({
          isAuction: true,
          auctionType,
          auctionStatus: nextStatus,
          auctionStartPrice: String(startingPrice),
          auctionCurrentPrice: String(startingPrice),
          auctionBidIncrement: String(bidIncrement),
          auctionMinBid: minBid === null ? null : String(minBid),
          auctionMaxBid: maxBid === null ? null : String(maxBid),
          auctionStartDate: now,
          auctionEndDate: endDate,
          auctionWinnerId: null,
          auctionWinningPrice: null,
          auctionBidCount: 0,
          auctionTermsAccepted: false,
          auctionContractUrl: null,
          auctionOrganizerOrganizationId: organizerId,
          auctionCreatedByUserId: session.userId,
          updatedAt: now,
        })
        .where(eq(properties.id, propertyId))
        .returning();

      if (sellerIsCreator && acceptSellerTerms) {
        await ensureTermsAcceptance(tx, { propertyId, userId: property.userId, role: 'seller' });
        await tx
          .update(properties)
          .set({ auctionTermsAccepted: true })
          .where(eq(properties.id, propertyId));
      }

      await tx.insert(auctionEvents).values({
        propertyId,
        actorUserId: session.userId,
        eventType: 'AUCTION_CREATED',
        payload: {
          auctionType,
          status: nextStatus,
          organizerOrganizationId: organizerId,
          startingPrice: String(startingPrice),
          bidIncrement: String(bidIncrement),
          endDate: endDate.toISOString(),
        },
      });

      return { ...updated, auctionStatus: nextStatus };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    const mapping: Record<string, [number, string]> = {
      PROPERTY_NOT_FOUND: [404, 'العقار غير موجود'],
      PROPERTY_NOT_APPROVED: [409, 'يجب اعتماد العقار قبل إنشاء المزاد'],
      PROPERTY_SELLER_MISSING: [409, 'لا يوجد بائع مرتبط بالعقار'],
      AUCTION_ALREADY_EXISTS: [409, 'يوجد مزاد قائم لهذا العقار'],
      AUCTION_OFFER_REQUIRED: [409, 'يجب وجود عرض مزاد نشط ومتوافق مع نوع المزاد'],
      AUCTION_TYPE_NOT_ALLOWED: [409, 'نوع العرض لا يسمح بهذا النوع من المزادات'],
      CLOSED_AUCTION_ORGANIZER_REQUIRED: [400, 'المزاد المغلق يتطلب جهة منظمة موثقة'],
      CLOSED_AUCTION_ORGANIZER_FORBIDDEN: [403, 'إنشاء المزاد المغلق متاح فقط لمكتب عقاري أو مكتب محاماة موثق مع عضوية إدارية فعالة'],
      CLOSED_AUCTION_PROPERTY_SCOPE_FORBIDDEN: [403, 'العقار خارج نطاق الجهة المنظمة'],
      OPEN_AUCTION_SELLER_ONLY: [403, 'المزاد المفتوح ينشئه مالك العقار فقط'],
      SELLER_TERMS_REQUIRED: [400, 'يجب موافقة البائع على شروط المزاد'],
      AUCTION_SELLER_TERMS_MISSING: [500, 'شروط البائع غير مهيأة'],
    };
    const mapped = mapping[code];
    if (mapped) return NextResponse.json({ error: mapped[1], code }, { status: mapped[0] });
    console.error('[Auctions POST] Error:', error);
    return NextResponse.json({ error: 'فشل في إنشاء المزاد' }, { status: 500 });
  } finally {
    await end();
  }
}
