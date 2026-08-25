import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { propertyFavorites } from '@/lib/db/schemas/properties-schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ isFavorite: false });

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get('propertyId');

  const { db, end } = getDb();
  try {
    if (propertyId) {
      const rows = await db.select().from(propertyFavorites).where(and(eq(propertyFavorites.userId, userId), eq(propertyFavorites.propertyId, propertyId))).limit(1);
      return NextResponse.json({ isFavorite: rows.length > 0 });
    }
    const rows = await db.select().from(propertyFavorites).where(eq(propertyFavorites.userId, userId));
    return NextResponse.json({ success: true, data: rows });
  } finally {
    await end();
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { propertyId } = await req.json();
  if (!propertyId) return NextResponse.json({ error: 'propertyId required' }, { status: 400 });

  const { db, end } = getDb();
  try {
    const existing = await db.select().from(propertyFavorites).where(and(eq(propertyFavorites.userId, userId), eq(propertyFavorites.propertyId, propertyId))).limit(1);
    if (existing.length > 0) return NextResponse.json({ success: true, isFavorite: true });

    await db.insert(propertyFavorites).values({ userId, propertyId });
    return NextResponse.json({ success: true, isFavorite: true });
  } finally {
    await end();
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { propertyId } = await req.json();
  if (!propertyId) return NextResponse.json({ error: 'propertyId required' }, { status: 400 });

  const { db, end } = getDb();
  try {
    await db.delete(propertyFavorites).where(and(eq(propertyFavorites.userId, userId), eq(propertyFavorites.propertyId, propertyId)));
    return NextResponse.json({ success: true, isFavorite: false });
  } finally {
    await end();
  }
}
