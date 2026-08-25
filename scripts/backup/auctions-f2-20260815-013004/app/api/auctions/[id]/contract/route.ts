import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { organizationMembers } from '@/lib/db/schema';
import { auctionContracts } from '@/lib/db/schemas/auction-hardening-schema';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await params;
  const { db, end } = getDb();
  try {
    const [contract] = await db
      .select()
      .from(auctionContracts)
      .where(eq(auctionContracts.propertyId, id))
      .limit(1);

    if (!contract) return NextResponse.json({ error: 'العقد غير موجود' }, { status: 404 });

    let allowed = contract.sellerId === session.userId || contract.buyerId === session.userId || session.role === 'super_admin' || session.permissions.includes('*');

    if (!allowed && contract.organizerOrganizationId) {
      const [membership] = await db
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, contract.organizerOrganizationId),
            eq(organizationMembers.userId, session.userId),
            eq(organizationMembers.status, 'active'),
          ),
        )
        .limit(1);
      allowed = Boolean(membership);
    }

    if (!allowed) return NextResponse.json({ error: 'غير مصرح بعرض هذا العقد' }, { status: 403 });

    if (request.nextUrl.searchParams.get('download') === '1') {
      return new NextResponse(contract.content, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${contract.contractNumber}.txt"`,
          'X-Contract-SHA256': contract.contentHash,
          'Cache-Control': 'private, no-store',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        templateVersion: contract.templateVersion,
        content: contract.content,
        contentHash: contract.contentHash,
        status: contract.status,
        generatedAt: contract.generatedAt,
        signedAt: contract.signedAt,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[Auction Contract GET] Error:', error);
    return NextResponse.json({ error: 'فشل في جلب العقد' }, { status: 500 });
  } finally {
    await end();
  }
}
