import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { savedSearches } from '@/lib/db/schemas/properties-schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { db, end } = getDb();
  try {
    const rows = await db.select().from(savedSearches).where(eq(savedSearches.userId, userId)).orderBy(desc(savedSearches.createdAt));
    return NextResponse.json({ success: true, data: rows });
  } finally {
    await end();
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, filters, notify } = await req.json();
  if (!name || !filters) return NextResponse.json({ error: 'name and filters required' }, { status: 400 });

  const { db, end } = getDb();
  try {
    const [row] = await db.insert(savedSearches).values({ userId, name, filters, notify }).returning();
    return NextResponse.json({ success: true, data: row });
  } finally {
    await end();
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { db, end } = getDb();
  try {
    await db.delete(savedSearches).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)));
    return NextResponse.json({ success: true });
  } finally {
    await end();
  }
}
