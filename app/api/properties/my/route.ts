import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { properties, propertyMedia } from '@/lib/db/schemas/properties-schema';
import { eq, desc, and, sql, inArray, asc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session?.userId) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || 'all';
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20') || 20, 1), 100);
  const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1);
  const offset = (page - 1) * limit;

  const filters = [eq(properties.userId, session.userId)];
  if (status !== 'all') {
    filters.push(eq(properties.status, status));
  }

  const { db, end } = getDb();
  try {
    const results = await db
      .select()
      .from(properties)
      .where(and(...filters))
      .orderBy(desc(properties.createdAt))
      .limit(limit)
      .offset(offset);

    const totalRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(and(...filters));
    const total = Number(totalRows[0]?.count ?? 0);

    // Attach media so the owner dashboard can render covers without N+1 calls.
    const ids = results.map((row) => row.id);
    const mediaRows = ids.length
      ? await db
          .select()
          .from(propertyMedia)
          .where(inArray(propertyMedia.propertyId, ids))
          .orderBy(asc(propertyMedia.order))
      : [];
    const mediaByProperty = new Map<string, typeof mediaRows>();
    for (const media of mediaRows) {
      if (!media.propertyId) continue;
      const bucket = mediaByProperty.get(media.propertyId);
      if (bucket) bucket.push(media);
      else mediaByProperty.set(media.propertyId, [media]);
    }
    const data = results.map((row) => ({
      ...row,
      media: mediaByProperty.get(row.id) ?? [],
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } finally {
    await end();
  }
}
