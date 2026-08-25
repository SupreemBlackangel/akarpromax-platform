import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { organizations, organizationMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 });
  }

  const { db, end } = getDb();
  try {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    if (!org) {
      return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 });
    }

    const members = await db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, id));
    return NextResponse.json({
      success: true,
      data: { ...org, membersCount: members.length },
    });
  } finally {
    await end();
  }
}

const FIELD_MAP: Record<string, keyof typeof organizations.$inferSelect> = {
  nameAr: 'nameAr',
  nameEn: 'nameEn',
  nameTr: 'nameTr',
  slug: 'slug',
  classification: 'classification',
  descriptionAr: 'descriptionAr',
  descriptionEn: 'descriptionEn',
  countryCode: 'countryCode',
  cityId: 'cityId',
  phone: 'contactPhone',
  email: 'contactEmail',
  website: 'websiteUrl',
  logo: 'logoUrl',
  cover: 'coverUrl',
  latitude: 'latitude',
  longitude: 'longitude',
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session?.userId) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { db, end } = getDb();
  try {
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, id), eq(organizationMembers.userId, session.userId)));
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'غير مصرح بتعديل هذه الشركة' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    for (const [from, to] of Object.entries(FIELD_MAP)) {
      if (body[from] !== undefined) updateData[to] = body[from];
    }

    const [updated] = await db
      .update(organizations)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'تم تحديث بيانات الشركة بنجاح',
    });
  } finally {
    await end();
  }
}
