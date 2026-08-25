import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { organizations, organizationMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { db, end } = getDb();
  try {
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active')))
      .limit(1);

    if (!member) return NextResponse.json({ error: 'No office found' }, { status: 404 });

    const [office] = await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, member.organizationId), eq(organizations.type, 'real_estate')))
      .limit(1);

    if (!office) return NextResponse.json({ error: 'Office not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: office });
  } finally {
    await end();
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { db, end } = getDb();
  try {
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active')))
      .limit(1);

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    const fieldMap: Record<string, string> = {
      nameAr: 'nameAr', nameEn: 'nameEn', nameTr: 'nameTr',
      descriptionAr: 'descriptionAr', descriptionEn: 'descriptionEn', descriptionTr: 'descriptionTr',
      countryCode: 'countryCode', cityId: 'cityId', districtId: 'districtId',
      contactPhone: 'contactPhone', contactEmail: 'contactEmail', websiteUrl: 'websiteUrl',
      logoUrl: 'logoUrl', coverUrl: 'coverUrl',
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (body[key] !== undefined) updateData[col] = body[key];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const [updated] = await db
      .update(organizations)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(organizations.id, member.organizationId), eq(organizations.type, 'real_estate')))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } finally {
    await end();
  }
}
