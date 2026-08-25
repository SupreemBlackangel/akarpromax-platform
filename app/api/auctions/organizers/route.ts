import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { organizationMembers, organizations } from '@/lib/db/schema';
import { getClosedAuctionOrganizer } from '@/lib/auctions/policy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { db, end } = getDb();
  try {
    const rows = await db
      .select({
        id: organizations.id,
        nameAr: organizations.nameAr,
        nameEn: organizations.nameEn,
        type: organizations.type,
        verifiedAt: organizations.verifiedAt,
        role: organizationMembers.role,
      })
      .from(organizations)
      .innerJoin(
        organizationMembers,
        and(
          eq(organizationMembers.organizationId, organizations.id),
          eq(organizationMembers.userId, session.userId),
          eq(organizationMembers.status, 'active'),
        ),
      )
      .where(
        and(
          eq(organizations.status, 'active'),
          inArray(organizations.type, ['real_estate', 'law_office']),
          inArray(organizationMembers.role, ['owner', 'admin', 'manager']),
        ),
      );

    const eligible = [];
    for (const row of rows) {
      const verified = await getClosedAuctionOrganizer(db, row.id, session.userId);
      if (verified) eligible.push(row);
    }

    return NextResponse.json({ success: true, data: eligible }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[Auction Organizers GET] Error:', error);
    return NextResponse.json({ error: 'فشل في جلب الجهات المنظمة' }, { status: 500 });
  } finally {
    await end();
  }
}
