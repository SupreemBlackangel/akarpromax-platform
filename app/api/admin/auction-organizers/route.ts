import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { limitedAuctionOrganizers } from '@/lib/db/schemas/limited-auction-schema';
import { organizations, users } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }

  const { db, end } = getDb();
  try {
    const q = request.nextUrl.searchParams;
    const includeRevoked = q.get('includeRevoked') === '1';

    const conditions = [];
    if (!includeRevoked) conditions.push(isNull(limitedAuctionOrganizers.revokedAt));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: limitedAuctionOrganizers.id,
        organizationId: limitedAuctionOrganizers.organizationId,
        organizationNameAr: organizations.nameAr,
        organizationType: organizations.type,
        organizationStatus: organizations.status,
        userId: limitedAuctionOrganizers.userId,
        userName: users.name,
        userEmail: users.email,
        grantedBy: limitedAuctionOrganizers.grantedBy,
        grantedAt: limitedAuctionOrganizers.grantedAt,
        revokedAt: limitedAuctionOrganizers.revokedAt,
        revokedBy: limitedAuctionOrganizers.revokedBy,
        revokeReason: limitedAuctionOrganizers.revokeReason,
        reason: limitedAuctionOrganizers.reason,
      })
      .from(limitedAuctionOrganizers)
      .innerJoin(organizations, eq(limitedAuctionOrganizers.organizationId, organizations.id))
      .innerJoin(users, eq(limitedAuctionOrganizers.userId, users.id))
      .where(where ?? undefined)
      .orderBy(desc(limitedAuctionOrganizers.createdAt));

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Admin Auction Organizers GET] Error:', error);
    return NextResponse.json({ error: 'فشل في جلب قائمة المنظمين' }, { status: 500 });
  } finally {
    await end();
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });

  const action = String(body.action || '').trim();
  const organizationId = body.organizationId ? String(body.organizationId) : null;
  const userId = body.userId ? String(body.userId) : null;

  if (!organizationId || !userId) {
    return NextResponse.json({ error: 'يجب تحديد المنظمة والمستخدم' }, { status: 400 });
  }

  const { db, end } = getDb();
  try {
    if (action === 'revoke') {
      const revokeReason = body.revokeReason ? String(body.revokeReason) : null;
      const [updated] = await db
        .update(limitedAuctionOrganizers)
        .set({
          revokedAt: new Date(),
          revokedBy: session.userId,
          revokeReason,
        })
        .where(
          and(
            eq(limitedAuctionOrganizers.organizationId, organizationId),
            eq(limitedAuctionOrganizers.userId, userId),
            isNull(limitedAuctionOrganizers.revokedAt),
          ),
        )
        .returning();

      if (!updated) return NextResponse.json({ error: 'لم يتم العثور على منحة نشطة' }, { status: 404 });
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'grant') {
      const reason = body.reason ? String(body.reason) : null;
      const [existing] = await db
        .select()
        .from(limitedAuctionOrganizers)
        .where(
          and(
            eq(limitedAuctionOrganizers.organizationId, organizationId),
            eq(limitedAuctionOrganizers.userId, userId),
          ),
        )
        .limit(1);

      if (existing) {
        if (!existing.revokedAt) {
          return NextResponse.json({ error: 'المنحة موجودة ونشطة بالفعل' }, { status: 409 });
        }
        const [reactivated] = await db
          .update(limitedAuctionOrganizers)
          .set({
            grantedBy: session.userId,
            grantedAt: new Date(),
            revokedAt: null,
            revokedBy: null,
            revokeReason: null,
            reason,
          })
          .where(eq(limitedAuctionOrganizers.id, existing.id))
          .returning();
        return NextResponse.json({ success: true, data: reactivated });
      }

      const [created] = await db
        .insert(limitedAuctionOrganizers)
        .values({
          organizationId,
          userId,
          grantedBy: session.userId,
          reason,
        })
        .returning();

      return NextResponse.json({ success: true, data: created }, { status: 201 });
    }

    return NextResponse.json({ error: 'action يجب أن تكون grant أو revoke' }, { status: 400 });
  } catch (error) {
    console.error('[Admin Auction Organizers POST] Error:', error);
    return NextResponse.json({ error: 'فشل في تنفيذ العملية' }, { status: 500 });
  } finally {
    await end();
  }
}
