import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { propertyOfferTypes } from '@/lib/db/schemas/offer-types-schema';
import { eq, desc } from 'drizzle-orm';
import { cached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { db, end } = getDb();
  try {
    const rows = await cached('offer-types', 60_000, () =>
      db.select().from(propertyOfferTypes).where(eq(propertyOfferTypes.isActive, true)).orderBy(propertyOfferTypes.displayOrder),
    );
    return NextResponse.json({ success: true, data: rows });
  } finally {
    await end();
  }
}
