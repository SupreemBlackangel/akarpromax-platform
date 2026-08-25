import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { savedSearches } from '@/lib/db/schemas/properties-schema';
import { eq, desc } from 'drizzle-orm';
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

  const body = await req.json();
  const { name, filters, notify } = body;
  if (!name || !filters) {
    return NextResponse.json({ error: 'name and filters required' }, { status: 400 });
  }

  const { db, end } = getDb();
  try {
    const [row] = await db.insert(savedSearches).values({
      userId,
      name,
      filters,
      notify: notify !== undefined ? notify : true,
    }).returning();
    return NextResponse.json({ success: true, data: row });
  } finally {
    await end();
  }
}
