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

    if (!member) return NextResponse.json({ error: 'No company found' }, { status: 404 });

    const [company] = await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, member.organizationId), eq(organizations.type, 'business')))
      .limit(1);

    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: company });
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
    const allowedFields = ['nameAr', 'nameEn', 'descriptionAr', 'descriptionEn', 'cityId', 'contactPhone', 'contactEmail', 'websiteUrl', 'logoUrl', 'coverUrl', 'specialties'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const [updated] = await db
      .update(organizations)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(organizations.id, member.organizationId), eq(organizations.type, 'business')))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } finally {
    await end();
  }
}
