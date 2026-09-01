import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { properties, propertyMedia, propertyFavorites, propertyViews } from '@/lib/db/schemas/properties-schema';
import { propertyOffers } from '@/lib/db/schemas/offer-types-schema';
import { eq, and, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { canAccessAdminArea } from '@/lib/auth/access-control';
import { updatePropertySchema } from '@/lib/validators/property-validators';
import { assertPropertyOfferPolicies } from '@/lib/properties/offer-policy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();

    const [property] = await db.select()
      .from(properties)
      .where(eq(properties.id, id));

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'العقار غير موجود' },
        { status: 404 }
      );
    }

    if (property.status !== 'approved' && property.userId !== session?.userId && session?.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بعرض هذا العقار' },
        { status: 403 }
      );
    }

    await db.transaction(async (tx) => {
      await tx.insert(propertyViews).values({
        propertyId: id,
        userId: session?.userId || null,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        referer: request.headers.get('referer') || undefined,
      });

      await tx
        .update(properties)
        .set({ views: sql`coalesce(${properties.views}, 0) + 1` })
        .where(eq(properties.id, id));
    });

    const media = await db.select()
      .from(propertyMedia)
      .where(eq(propertyMedia.propertyId, id))
      .orderBy(propertyMedia.order);

    let isFavorite = false;
    if (session) {
      const favorite = await db.select()
        .from(propertyFavorites)
        .where(
          and(
            eq(propertyFavorites.userId, session.userId),
            eq(propertyFavorites.propertyId, id)
          )
        );
      isFavorite = favorite.length > 0;
    }

    const offers = await db.select()
      .from(propertyOffers)
      .where(eq(propertyOffers.propertyId, id));

    // The owner (or an admin) sees the full record; everyone else gets it with
    // the moderation + internal auction mechanics stripped. userId is kept — the
    // detail page needs it as the "contact advertiser" messaging recipient.
    const isOwnerOrAdmin = property.userId === session?.userId || session?.role === 'super_admin';
    const INTERNAL_FIELDS = [
      'approvedBy', 'approvedAt', 'rejectedReason',
      'auctionMinBid', 'auctionMaxBid', 'auctionBidIncrement',
      'auctionOrganizerOrganizationId', 'auctionCreatedByUserId',
      'auctionWinnerId', 'auctionWinningPrice',
      'auctionContractUrl', 'auctionContractAccepted',
    ] as const;
    const propertyData: Record<string, unknown> = { ...property };
    if (!isOwnerOrAdmin) {
      for (const field of INTERNAL_FIELDS) delete propertyData[field];
    }

    return NextResponse.json({
      success: true,
      data: {
        ...propertyData,
        media,
        offers,
        isFavorite,
        // Lets the detail page hide "contact the advertiser" on your own listing
        // (self-messaging is rejected by /api/messages).
        isOwner: property.userId === session?.userId,
      },
    });
  } catch (error) {
    console.error('[Property GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب العقار' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const [existing] = await db.select()
      .from(properties)
      .where(eq(properties.id, id));

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'العقار غير موجود' },
        { status: 404 }
      );
    }

    // The owner edits their own listing; a platform admin may edit any listing.
    const isAdmin = canAccessAdminArea({ authenticated: true, role: session.role, permissions: session.permissions });
    const isOwner = existing.userId === session.userId;
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بتعديل هذا العقار' },
        { status: 403 }
      );
    }

    // Owners can only edit before/after moderation (draft/rejected), and their
    // edit re-enters the review queue. Admins may edit at any status, and the
    // listing keeps its current status (a live edit stays live).
    if (!isAdmin && !['draft', 'rejected'].includes(existing.status ?? 'draft')) {
      return NextResponse.json(
        {
          success: false,
          error: 'لا يمكن تعديل العقار أثناء المراجعة أو بعد الاعتماد'
        },
        { status: 409 }
      );
    }

    const body = await request.json();
    const validated = updatePropertySchema.parse(body);

    await assertPropertyOfferPolicies(db, validated.offers);

    const updateData: Record<string, unknown> = isAdmin
      ? {} // admin edit preserves the current status / moderation state
      : {
          status: 'draft',
          rejectedReason: null,
          approvedAt: null,
          approvedBy: null,
          isVerified: false,
        };
    const fields = ['titleAr', 'titleEn', 'descriptionAr', 'descriptionEn', 'dealType', 'category', 'propertyType', 'country', 'governorate', 'city', 'district', 'address', 'price', 'currency', 'area', 'bedrooms', 'bathrooms', 'floor', 'totalFloors', 'yearBuilt', 'facade', 'direction', 'referenceNumber', 'advertisingLicense', 'officeId'];
    for (const field of fields) {
      const value = validated[field as keyof typeof validated];
      if (value === undefined) continue;
      updateData[field] = ['price', 'area'].includes(field) && typeof value === 'number'
        ? String(value)
        : value;
    }

    if (validated.latitude !== undefined) {
      updateData.latitude = validated.latitude === null ? null : String(validated.latitude);
    }
    if (validated.longitude !== undefined) {
      updateData.longitude = validated.longitude === null ? null : String(validated.longitude);
    }

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx.update(properties)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(properties.id, id))
        .returning();

      if (!row) throw new Error('العقار غير موجود');

      if (validated.offers !== undefined) {
        await tx.delete(propertyOffers).where(eq(propertyOffers.propertyId, id));
        if (validated.offers.length > 0) {
          await tx.insert(propertyOffers).values(
            validated.offers.map((offer) => ({
              propertyId: id,
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
      }

      if (validated.media !== undefined) {
        await tx.delete(propertyMedia).where(eq(propertyMedia.propertyId, id));
        if (validated.media.length > 0) {
          await tx.insert(propertyMedia).values(
            validated.media.map((media, index) => ({
              propertyId: id,
              url: media.url,
              type: media.type,
              order: index,
              isFeatured: index === 0,
              altText: media.altText || '',
            }))
          );
        }
      }

      return row;
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'تم تحديث العقار بنجاح',
    });
  } catch (error) {
    console.error('[Property PATCH] Error:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'فشل في تحديث العقار' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const [existing] = await db.select()
      .from(properties)
      .where(eq(properties.id, id));

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'العقار غير موجود' },
        { status: 404 }
      );
    }

    if (existing.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بحذف هذا العقار' },
        { status: 403 }
      );
    }

    await db.transaction(async (tx) => {
      await tx.delete(propertyOffers).where(eq(propertyOffers.propertyId, id));
      await tx.delete(properties).where(eq(properties.id, id));
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف العقار بنجاح',
    });
  } catch (error) {
    console.error('[Property DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في حذف العقار' },
      { status: 500 }
    );
  }
}
