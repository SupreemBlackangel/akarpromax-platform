import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { canAccessAdminArea } from '@/lib/auth/access-control';
import { properties } from '@/lib/db/schemas/properties-schema';

export const dynamic = 'force-dynamic';

/**
 * Full admin control over a single property listing (edit / activate-deactivate
 * / delete). Distinct from the owner route (/api/properties/[id]) which is
 * scoped to the listing's owner; here an admin with PROPERTIES manage rights
 * acts on any listing. Approve/reject stays on the dedicated .../review route.
 */

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 }) };
  if (!canAccessAdminArea({ authenticated: true, role: session.role, permissions: session.permissions })) {
    return { error: NextResponse.json({ success: false, error: 'لا تملك صلاحية إدارة العقارات' }, { status: 403 }) };
  }
  return { session };
}

// Statuses an admin may set directly. 'archived' is the "غير نشط" (deactivated)
// state — hidden from the public feed without deleting the record.
const SETTABLE_STATUS = new Set(['approved', 'rejected', 'archived', 'draft', 'pending_review', 'sold', 'rented']);

// Scalar fields an admin may correct in place.
const EDITABLE_TEXT = ['titleAr', 'titleEn', 'descriptionAr', 'descriptionEn', 'address', 'referenceNumber'] as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;
  const { id } = await params;

  const [existing] = await db.select().from(properties).where(eq(properties.id, id));
  if (!existing) return NextResponse.json({ success: false, error: 'العقار غير موجود' }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ success: false, error: 'طلب غير صالح' }, { status: 400 });

  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.status === 'string') {
    if (!SETTABLE_STATUS.has(body.status)) {
      return NextResponse.json({ success: false, error: 'حالة غير صالحة' }, { status: 400 });
    }
    update.status = body.status;
  }
  for (const field of EDITABLE_TEXT) {
    if (typeof body[field] === 'string') update[field] = (body[field] as string).slice(0, 4000);
  }
  if (body.price != null && Number.isFinite(Number(body.price))) update.price = String(Number(body.price));
  if (body.area != null && Number.isFinite(Number(body.area))) update.area = String(Number(body.area));
  if (body.isFeatured != null) update.isFeatured = Boolean(body.isFeatured);

  const [updated] = await db.update(properties).set(update).where(eq(properties.id, id)).returning();
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;
  const { id } = await params;

  const [existing] = await db.select({ id: properties.id }).from(properties).where(eq(properties.id, id));
  if (!existing) return NextResponse.json({ success: false, error: 'العقار غير موجود' }, { status: 404 });

  // property_media / property_offers / property_favorites cascade on the FK.
  await db.delete(properties).where(eq(properties.id, id));
  return NextResponse.json({ success: true });
}
