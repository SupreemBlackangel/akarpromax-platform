import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { canAccessAdminArea } from '@/lib/auth/access-control';
import { properties, propertyMedia } from '@/lib/db/schemas/properties-schema';
import { storePropertyImage, MAX_PROPERTY_IMAGE_BYTES } from '@/lib/properties/image-processing';

export const dynamic = 'force-dynamic';

/**
 * Admin image system for a property: list, upload (through the WebP pipeline),
 * delete, set-cover and reorder. Cover = property_media.isFeatured; exactly one
 * row is the cover, and the ordering drives the gallery sequence.
 */

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 }) };
  if (!canAccessAdminArea({ authenticated: true, role: session.role, permissions: session.permissions })) {
    return { error: NextResponse.json({ success: false, error: 'لا تملك صلاحية إدارة العقارات' }, { status: 403 }) };
  }
  return { session };
}

async function propertyExists(id: string): Promise<boolean> {
  const [row] = await db.select({ id: properties.id }).from(properties).where(eq(properties.id, id));
  return Boolean(row);
}

async function listMedia(propertyId: string) {
  return db.select().from(propertyMedia).where(eq(propertyMedia.propertyId, propertyId)).orderBy(propertyMedia.order);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;
  const { id } = await params;
  if (!(await propertyExists(id))) return NextResponse.json({ success: false, error: 'العقار غير موجود' }, { status: 404 });
  return NextResponse.json({ success: true, data: await listMedia(id) });
}

/** Upload an image file (multipart) and attach it to the property. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;
  const { id } = await params;
  if (!(await propertyExists(id))) return NextResponse.json({ success: false, error: 'العقار غير موجود' }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ success: false, error: 'أرفق ملف صورة' }, { status: 400 });
  if (file.size > MAX_PROPERTY_IMAGE_BYTES) return NextResponse.json({ success: false, error: 'الصورة أكبر من 8MB' }, { status: 413 });

  const url = await storePropertyImage(Buffer.from(await file.arrayBuffer()));
  if (!url) return NextResponse.json({ success: false, error: 'صيغة الصورة غير مدعومة (JPG أو PNG أو WebP)' }, { status: 400 });

  const current = await listMedia(id);
  const [created] = await db.insert(propertyMedia).values({
    propertyId: id,
    url,
    type: 'image',
    order: current.length,
    isFeatured: current.length === 0, // first image becomes the cover
    mimeType: 'image/webp',
  }).returning();

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

/** Set cover or reorder. Body: { mediaId, action: 'cover' } or { order: [ids...] }. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;
  const { id } = await params;
  if (!(await propertyExists(id))) return NextResponse.json({ success: false, error: 'العقار غير موجود' }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { mediaId?: string; action?: string; order?: string[] } | null;
  if (!body) return NextResponse.json({ success: false, error: 'طلب غير صالح' }, { status: 400 });

  if (body.action === 'cover' && body.mediaId) {
    await db.update(propertyMedia).set({ isFeatured: false }).where(eq(propertyMedia.propertyId, id));
    await db.update(propertyMedia).set({ isFeatured: true }).where(and(eq(propertyMedia.propertyId, id), eq(propertyMedia.id, body.mediaId)));
    return NextResponse.json({ success: true, data: await listMedia(id) });
  }

  if (Array.isArray(body.order)) {
    let index = 0;
    for (const mediaId of body.order) {
      await db.update(propertyMedia).set({ order: index++ }).where(and(eq(propertyMedia.propertyId, id), eq(propertyMedia.id, mediaId)));
    }
    return NextResponse.json({ success: true, data: await listMedia(id) });
  }

  return NextResponse.json({ success: false, error: 'إجراء غير مدعوم' }, { status: 400 });
}

/** Remove one image. `?mediaId=`. Re-promotes a cover if the cover was removed. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;
  const { id } = await params;
  const mediaId = request.nextUrl.searchParams.get('mediaId') ?? '';
  if (!mediaId) return NextResponse.json({ success: false, error: 'mediaId مطلوب' }, { status: 400 });

  const [target] = await db.select().from(propertyMedia).where(and(eq(propertyMedia.propertyId, id), eq(propertyMedia.id, mediaId)));
  if (!target) return NextResponse.json({ success: false, error: 'الصورة غير موجودة' }, { status: 404 });

  await db.delete(propertyMedia).where(eq(propertyMedia.id, mediaId));

  // If the cover was deleted, promote the next image so a listing never loses
  // its cover silently.
  if (target.isFeatured) {
    const remaining = await listMedia(id);
    if (remaining[0]) {
      await db.update(propertyMedia).set({ isFeatured: true }).where(eq(propertyMedia.id, remaining[0].id));
    }
  }
  return NextResponse.json({ success: true, data: await listMedia(id) });
}
