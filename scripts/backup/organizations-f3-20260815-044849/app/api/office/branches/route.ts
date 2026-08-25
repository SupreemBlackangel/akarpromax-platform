import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { organizationBranches, organizationMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

async function getMemberOrgId(userId: string) {
  const { db, end } = getDb();
  try {
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active')))
      .limit(1);
    if (!member) return null;
    if (member.role !== 'owner' && member.role !== 'admin') return null;
    return member.organizationId;
  } finally {
    await end();
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getMemberOrgId(userId);
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { db, end } = getDb();
  try {
    const rows = await db.select().from(organizationBranches).where(eq(organizationBranches.organizationId, orgId));
    return NextResponse.json({ success: true, data: rows });
  } finally {
    await end();
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getMemberOrgId(userId);
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  if (!body.nameAr && !body.nameEn) {
    return NextResponse.json({ error: 'nameAr or nameEn required' }, { status: 400 });
  }

  const { db, end } = getDb();
  try {
    const [branch] = await db.insert(organizationBranches).values({
      organizationId: orgId,
      nameAr: body.nameAr || null,
      nameEn: body.nameEn || null,
      countryCode: body.countryCode || 'SA',
      cityId: body.cityId || null,
      districtId: body.districtId || null,
      governorate: body.governorate || null,
      street: body.street || null,
      addressAr: body.addressAr || null,
      addressEn: body.addressEn || null,
      phone: body.phone || null,
      email: body.email || null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      status: body.status || 'active',
    }).returning();

    return NextResponse.json({ success: true, data: branch });
  } finally {
    await end();
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getMemberOrgId(userId);
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, ...updateData } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { db, end } = getDb();
  try {
    const [branch] = await db
      .update(organizationBranches)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(organizationBranches.id, id), eq(organizationBranches.organizationId, orgId)))
      .returning();

    if (!branch) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: branch });
  } finally {
    await end();
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getMemberOrgId(userId);
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { db, end } = getDb();
  try {
    await db.delete(organizationBranches).where(and(eq(organizationBranches.id, id), eq(organizationBranches.organizationId, orgId)));
    return NextResponse.json({ success: true });
  } finally {
    await end();
  }
}
