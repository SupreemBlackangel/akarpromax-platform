import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { properties } from '@/lib/db/schemas/properties-schema';
import { auctionEvents } from '@/lib/db/schemas/auction-hardening-schema';
import { ensureTermsAcceptance, getActiveAuctionTerms } from '@/lib/auctions/policy';

const FIXED_AUCTION_HOURS = 72;

export const dynamic = 'force-dynamic';

export async function GET() {
  const { db, end } = getDb();
  try {
    const seller = await getActiveAuctionTerms(db, 'seller');
    const bidder = await getActiveAuctionTerms(db, 'bidder');
    return NextResponse.json({
      success: true,
      data: {
        seller: seller ? { id: seller.id, version: seller.version, contentAr: seller.contentAr, contentEn: seller.contentEn, contentHash: seller.contentHash } : null,
        bidder: bidder ? { id: bidder.id, version: bidder.version, contentAr: bidder.contentAr, contentEn: bidder.contentEn, contentHash: bidder.contentHash } : null,
      },
    });
  } finally {
    await end();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body?.accept !== true) return NextResponse.json({ error: 'يجب تأكيد الموافقة' }, { status: 400 });

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
      if (property.userId !== session.userId) throw new Error('SELLER_ONLY');
      if (property.auctionStatus !== 'pending_seller_terms') {
        return { property, idempotent: true };
      }
      if (!property.auctionEndDate || new Date(property.auctionEndDate).getTime() <= Date.now()) {
        throw new Error('AUCTION_EXPIRED');
      }

      const acceptance = await ensureTermsAcceptance(tx, { propertyId: id, userId: session.userId, role: 'seller' });
      const activationNow = new Date();
      const isFixed = property.auctionType === 'fixed';
      const [updated] = await tx
        .update(properties)
        .set({
          auctionTermsAccepted: true,
          auctionStatus: 'active',
          auctionStartDate: isFixed ? activationNow : (property.auctionStartDate ?? activationNow),
          auctionEndDate: isFixed ? new Date(activationNow.getTime() + FIXED_AUCTION_HOURS * 3600_000) : property.auctionEndDate,
          updatedAt: activationNow,
        })
        .where(eq(properties.id, id))
        .returning();

      await tx.insert(auctionEvents).values({
        propertyId: id,
        actorUserId: session.userId,
        eventType: 'SELLER_TERMS_ACCEPTED',
        payload: { termsId: acceptance.terms.id, version: acceptance.terms.version, contentHash: acceptance.terms.contentHash },
      });

      return { property: updated, idempotent: false };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'PROPERTY_NOT_FOUND') return NextResponse.json({ error: 'العقار غير موجود' }, { status: 404 });
    if (code === 'NOT_AUCTION') return NextResponse.json({ error: 'هذا العقار ليس مزاداً' }, { status: 400 });
    if (code === 'SELLER_ONLY') return NextResponse.json({ error: 'اعتماد شروط البائع متاح لمالك العقار فقط' }, { status: 403 });
    if (code === 'AUCTION_EXPIRED') return NextResponse.json({ error: 'انتهت مدة المزاد قبل اعتماد الشروط' }, { status: 409 });
    console.error('[Auction Terms POST] Error:', error);
    return NextResponse.json({ error: 'فشل في اعتماد شروط المزاد' }, { status: 500 });
  } finally {
    await end();
  }
}
