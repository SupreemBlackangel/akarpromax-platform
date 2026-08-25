import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { properties, propertyRequestOffers, propertyRequests } from '@/lib/db/schemas/properties-schema';
import { organizationMembers, organizations } from '@/lib/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const OFFICE_OFFER_ROLES = new Set(['owner', 'admin', 'manager', 'agent']);
const REQUESTS_ACCEPTING_OFFERS = new Set(['active', 'matched', 'offer_received']);

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { db, end } = getDb();
  try {
    const [request] = await db.select().from(propertyRequests).where(eq(propertyRequests.id, id)).limit(1);
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (request.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rows = await db
      .select()
      .from(propertyRequestOffers)
      .where(eq(propertyRequestOffers.requestId, id));

    return NextResponse.json({ success: true, data: rows });
  } finally {
    await end();
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { officeId, propertyId, price, message, notes } = body;

  if (!officeId || typeof officeId !== 'string' || !message || typeof message !== 'string') {
    return NextResponse.json({ error: 'officeId and message required' }, { status: 400 });
  }
  if (message.trim().length < 10 || message.trim().length > 2000) {
    return NextResponse.json({ error: 'message must be 10-2000 characters' }, { status: 400 });
  }

  const numericPrice = price === undefined || price === null || price === '' ? null : Number(price);
  if (numericPrice !== null && (!Number.isFinite(numericPrice) || numericPrice <= 0)) {
    return NextResponse.json({ error: 'price must be positive' }, { status: 400 });
  }

  const { db, end } = getDb();
  try {
    const [request] = await db.select().from(propertyRequests).where(eq(propertyRequests.id, id)).limit(1);
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!REQUESTS_ACCEPTING_OFFERS.has(request.status ?? 'active')) {
      return NextResponse.json({ error: 'Request is not accepting offers' }, { status: 409 });
    }
    if (request.userId === userId) {
      return NextResponse.json({ error: 'Request owner cannot submit an office offer to the same request' }, { status: 403 });
    }

    const [membership] = await db
      .select({
        role: organizationMembers.role,
        organizationId: organizationMembers.organizationId,
        organizationType: organizations.type,
        organizationStatus: organizations.status,
        verifiedAt: organizations.verifiedAt,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, officeId),
          eq(organizationMembers.status, 'active'),
        )
      )
      .limit(1);

    if (!membership || !OFFICE_OFFER_ROLES.has(membership.role)) {
      return NextResponse.json({ error: 'Forbidden office membership' }, { status: 403 });
    }
    if (
      membership.organizationType !== 'real_estate' ||
      membership.organizationStatus !== 'active' ||
      !membership.verifiedAt
    ) {
      return NextResponse.json({ error: 'Office must be active and verified' }, { status: 403 });
    }

    if (propertyId) {
      const [linkedProperty] = await db
        .select({
          id: properties.id,
          officeId: properties.officeId,
          status: properties.status,
        })
        .from(properties)
        .where(eq(properties.id, propertyId))
        .limit(1);

      if (
        !linkedProperty ||
        linkedProperty.officeId !== officeId ||
        linkedProperty.status !== 'approved'
      ) {
        return NextResponse.json(
          { error: 'Linked property must be an approved property owned by this office' },
          { status: 403 }
        );
      }
    }

    const offer = await db.transaction(async (tx) => {
      const [created] = await tx.insert(propertyRequestOffers).values({
        requestId: id,
        officeId,
        propertyId: propertyId || null,
        price: numericPrice !== null ? String(numericPrice) : null,
        message: message.trim(),
        notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      }).returning();

      await tx.update(propertyRequests)
        .set({ status: 'offer_received', updatedAt: new Date() })
        .where(eq(propertyRequests.id, id));

      return created;
    });

    return NextResponse.json({ success: true, data: offer });
  } finally {
    await end();
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { offerId, status } = await req.json();
  if (!offerId || (status !== 'accepted' && status !== 'rejected')) {
    return NextResponse.json({ error: 'offerId and accepted/rejected status required' }, { status: 400 });
  }

  const { db, end } = getDb();
  try {
    const [request] = await db.select().from(propertyRequests).where(eq(propertyRequests.id, id)).limit(1);
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (request.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (request.status === 'closed' || request.status === 'cancelled') {
      return NextResponse.json({ error: 'Request is closed' }, { status: 409 });
    }

    const [target] = await db
      .select()
      .from(propertyRequestOffers)
      .where(and(eq(propertyRequestOffers.id, offerId), eq(propertyRequestOffers.requestId, id)))
      .limit(1);

    if (!target) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    if (target.status !== 'pending') {
      return NextResponse.json({ error: 'Offer already resolved' }, { status: 409 });
    }

    await db.transaction(async (tx) => {
      await tx.update(propertyRequestOffers)
        .set({ status, respondedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(propertyRequestOffers.id, offerId), eq(propertyRequestOffers.requestId, id)));

      if (status === 'accepted') {
        await tx.update(propertyRequestOffers)
          .set({ status: 'rejected', respondedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(propertyRequestOffers.requestId, id),
              eq(propertyRequestOffers.status, 'pending'),
              ne(propertyRequestOffers.id, offerId),
            )
          );

        await tx.update(propertyRequests)
          .set({ status: 'offer_accepted', updatedAt: new Date() })
          .where(eq(propertyRequests.id, id));
      }
    });

    return NextResponse.json({ success: true, status });
  } finally {
    await end();
  }
}
