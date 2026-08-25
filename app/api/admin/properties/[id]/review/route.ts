import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { canAccessAdminArea } from '@/lib/auth/access-control';
import { properties } from '@/lib/db/schemas/properties-schema';

type ReviewBody =
  | { action: 'approve' }
  | { action: 'reject'; reason: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'غير مصرح' },
      { status: 401 }
    );
  }

  if (
    !canAccessAdminArea({
      authenticated: true,
      role: session.role,
      permissions: session.permissions,
    })
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'لا تملك صلاحية مراجعة العقارات'
      },
      { status: 403 }
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

  if (property.userId === session.userId) {
    return NextResponse.json(
      {
        success: false,
        error: 'لا يمكن لمالك العقار اعتماد عقاره بنفسه'
      },
      { status: 403 }
    );
  }

  if (property.status !== 'pending_review') {
    return NextResponse.json(
      {
        success: false,
        error: 'العقار ليس في حالة انتظار المراجعة'
      },
      { status: 409 }
    );
  }

  let body: ReviewBody;

  try {
    body = (await request.json()) as ReviewBody;
  } catch {
    return NextResponse.json(
      { success: false, error: 'طلب غير صالح' },
      { status: 400 }
    );
  }

  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json(
      { success: false, error: 'إجراء مراجعة غير صالح' },
      { status: 400 }
    );
  }

  if (body.action === 'reject') {
    const reason =
      typeof body.reason === 'string'
        ? body.reason.trim()
        : '';

    if (reason.length < 3 || reason.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'سبب الرفض مطلوب ويجب أن يكون بين 3 و1000 حرف'
        },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(properties)
      .set({
        status: 'rejected',
        rejectedReason: reason,
        isVerified: false,
        approvedAt: null,
        approvedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'تم رفض العقار',
    });
  }

  const [updated] = await db
    .update(properties)
    .set({
      status: 'approved',
      rejectedReason: null,
      isVerified: true,
      approvedAt: new Date(),
      approvedBy: session.userId,
      updatedAt: new Date(),
    })
    .where(eq(properties.id, id))
    .returning();

  return NextResponse.json({
    success: true,
    data: updated,
    message: 'تم اعتماد العقار ونشره',
  });
}
