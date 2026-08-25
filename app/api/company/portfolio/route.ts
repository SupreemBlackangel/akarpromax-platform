import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { organizationMembers } from '@/lib/db/schema';
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

    if (!member) return NextResponse.json({ error: 'No company' }, { status: 404 });

    return NextResponse.json({ success: true, data: [] });
  } finally {
    await end();
  }
}

export async function POST(req: NextRequest) {
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

    return NextResponse.json({
      success: true,
      data: { id: `portfolio_${Date.now()}`, organizationId: member.organizationId, ...body, createdAt: new Date() },
    });
  } finally {
    await end();
  }
}
