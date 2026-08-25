import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { properties } from '@/lib/db/schemas/properties-schema';
import { propertyOffers } from '@/lib/db/schemas/offer-types-schema';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'غير مصرح' },
      { status: 401 }
    );
  }

  const { id } = await params;

  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, id))
    .limit(1);

  if (!property) {
    return NextResponse.json(
      { success: false, error: 'العقار غير موجود' },
      { status: 404 }
    );
  }

  if (property.userId !== session.userId) {
    return NextResponse.json(
      {
        success: false,
        error: 'غير مصرح بإرسال هذا العقار للمراجعة'
      },
      { status: 403 }
    );
  }

  if (!['draft', 'rejected'].includes(property.status ?? 'draft')) {
    return NextResponse.json(
      {
        success: false,
        error: 'حالة العقار لا تسمح بالإرسال للمراجعة'
      },
      { status: 409 }
    );
  }

  const activeOffers = await db
    .select({ id: propertyOffers.id })
    .from(propertyOffers)
    .where(
      and(
        eq(propertyOffers.propertyId, id),
        eq(propertyOffers.status, 'active')
      )
    )
    .limit(1);

  if (activeOffers.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'يجب إضافة عرض عقاري نشط واحد على الأقل قبل الإرسال للمراجعة'
      },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(properties)
    .set({
      status: 'pending_review',
      rejectedReason: null,
      approvedAt: null,
      approvedBy: null,
      isVerified: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(properties.id, id),
        eq(properties.userId, session.userId)
      )
    )
    .returning();

  return NextResponse.json({
    success: true,
    data: updated,
    message: 'تم إرسال العقار للمراجعة',
  });
}
