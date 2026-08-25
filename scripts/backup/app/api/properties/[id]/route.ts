import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { properties, propertyMedia, propertyFavorites, propertyViews } from '@/lib/db/schemas/properties-schema';
import { eq, and, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { updatePropertySchema } from '@/lib/validators/property-validators';

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

    if (property.status !== 'approved' && property.userId !== session?.userId) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بعرض هذا العقار' },
        { status: 403 }
      );
    }

    await db.insert(propertyViews).values({
      propertyId: id,
      userId: session?.userId || null,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      referer: request.headers.get('referer') || undefined,
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

    return NextResponse.json({
      success: true,
      data: {
        ...property,
        media,
        isFavorite,
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

    if (existing.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بتعديل هذا العقار' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updatePropertySchema.parse(body);

    const updateData: Record<string, unknown> = {};
    const fields = ['titleAr', 'titleEn', 'descriptionAr', 'descriptionEn', 'dealType', 'category', 'propertyType', 'country', 'governorate', 'city', 'district', 'address', 'price', 'currency', 'area', 'bedrooms', 'bathrooms', 'floor', 'totalFloors', 'yearBuilt', 'facade', 'direction', 'referenceNumber', 'advertisingLicense', 'officeId'];
    for (const field of fields) {
      if (validated[field as keyof typeof validated] !== undefined) {
        if (['price', 'area', 'bedrooms', 'bathrooms', 'floor', 'totalFloors', 'yearBuilt'].includes(field) && typeof validated[field as keyof typeof validated] === 'number') {
          updateData[field] = String(validated[field as keyof typeof validated]);
        } else {
          updateData[field] = validated[field as keyof typeof validated];
        }
      }
    }

    if (validated.latitude !== undefined) updateData.latitude = validated.latitude ? String(validated.latitude) : null;
    if (validated.longitude !== undefined) updateData.longitude = validated.longitude ? String(validated.longitude) : null;

    const [updated] = await db.update(properties)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();

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

    await db.delete(properties).where(eq(properties.id, id));

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
