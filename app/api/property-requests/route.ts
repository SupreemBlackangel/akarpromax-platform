import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { propertyRequests } from '@/lib/db/schemas/properties-schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { createPropertyRequestSchema } from '@/lib/validators/property-validators';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const conditions = [eq(propertyRequests.userId, userId)];
  if (status && status !== 'all') {
    conditions.push(eq(propertyRequests.status, status));
  }

  const { db, end } = getDb();
  try {
    const rows = await db.select().from(propertyRequests).where(and(...conditions)).orderBy(desc(propertyRequests.createdAt));
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
  const parsed = createPropertyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid property request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const { db, end } = getDb();
  try {
    const [row] = await db.insert(propertyRequests).values({
      userId,
      dealType: input.dealType,
      propertyType: input.propertyType,
      country: input.country,
      governorate: input.governorate,
      city: input.city,
      district: input.district || null,
      budget: input.budget != null ? String(input.budget) : null,
      area: input.area != null ? String(input.area) : null,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      description: input.description,
    }).returning();

    return NextResponse.json({ success: true, data: row });
  } finally {
    await end();
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status: newStatus } = await req.json();
  if (!id || !newStatus) return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  if (newStatus !== 'closed' && newStatus !== 'cancelled') {
    return NextResponse.json({ error: 'Only closed or cancelled are allowed here' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
  if (newStatus === 'closed' || newStatus === 'cancelled') updates.closedAt = new Date();

  const { db, end } = getDb();
  try {
    await db.update(propertyRequests).set(updates).where(and(eq(propertyRequests.id, id), eq(propertyRequests.userId, userId)));
    return NextResponse.json({ success: true });
  } finally {
    await end();
  }
}
