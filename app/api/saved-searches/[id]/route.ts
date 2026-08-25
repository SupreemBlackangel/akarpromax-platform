import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { savedSearches } from '@/lib/db/schemas/properties-schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { db, end } = getDb();
  try {
    await db.delete(savedSearches).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)));
    return NextResponse.json({ success: true });
  } finally {
    await end();
  }
}
