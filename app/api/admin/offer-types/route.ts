import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { propertyOfferTypes } from '@/lib/db/schemas/offer-types-schema';
import { eq, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { getSessionIdentity, hasPermission } from '@/lib/identity-auth';
import { PERMISSIONS } from '@/src/constants/permissions';

export const dynamic = 'force-dynamic';

/**
 * Writing offer types is property configuration, not something any signed-in
 * account may do. A session on its own used to be enough here, so any
 * registered viewer could create or edit offer types.
 */
async function blockUnlessPropertyManager(): Promise<NextResponse | null> {
  const identity = await getSessionIdentity();
  if (!identity.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(identity, PERMISSIONS.PROPERTIES_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const { db, end } = getDb();
  try {
    const rows = await db.select().from(propertyOfferTypes).orderBy(propertyOfferTypes.displayOrder);
    return NextResponse.json({ success: true, data: rows });
  } finally {
    await end();
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const blocked = await blockUnlessPropertyManager();
  if (blocked) return blocked;

  const body = await req.json();
  const { db, end } = getDb();
  try {
    const [row] = await db.insert(propertyOfferTypes).values({
      code: body.code,
      nameAr: body.nameAr,
      nameEn: body.nameEn,
      nameTr: body.nameTr || null,
      descriptionAr: body.descriptionAr || null,
      descriptionEn: body.descriptionEn || null,
      displayOrder: body.displayOrder ?? 0,
      isActive: body.isActive ?? true,
      allowDirect: body.allowDirect ?? true,
      allowAuction: body.allowAuction ?? true,
      allowFixedAuction: body.allowFixedAuction ?? true,
      allowOpenAuction: body.allowOpenAuction ?? true,
      contractTemplateType: body.contractTemplateType || null,
    }).returning();
    return NextResponse.json({ success: true, data: row });
  } finally {
    await end();
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req.headers.get('cookie') ?? undefined);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const blocked = await blockUnlessPropertyManager();
  if (blocked) return blocked;

  const { id, ...updateData } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { db, end } = getDb();
  try {
    const [row] = await db.update(propertyOfferTypes).set({ ...updateData, updatedAt: new Date() }).where(eq(propertyOfferTypes.id, id)).returning();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: row });
  } finally {
    await end();
  }
}
