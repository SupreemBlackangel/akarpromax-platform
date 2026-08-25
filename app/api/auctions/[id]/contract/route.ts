import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { auctionContracts } from '@/lib/db/schemas/auction-hardening-schema';
import { getClosedAuctionOrganizer } from '@/lib/auctions/policy';

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
      allowed = Boolean(
        await getClosedAuctionOrganizer(db, contract.organizerOrganizationId, session.userId),
      );
    }

    if (!allowed) return NextResponse.json({ error: 'غير مصرح بعرض هذا العقد' }, { status: 403 });

    if (request.nextUrl.searchParams.get('format') === 'html') {
      if (!contract.documentHtml || !contract.documentHash) {
        return NextResponse.json({ error: 'ظ†ط³ط®ط© ط§ظ„ظ…ط³طھظ†ط¯ ط؛ظٹط± ظ…طھط§ط­ط© ظ„ظ‡ط°ط§ ط§ظ„ط¹ظ‚ط¯' }, { status: 404 });
      }

      const download = request.nextUrl.searchParams.get('download') === '1';
      return new NextResponse(contract.documentHtml, {
        status: 200,
        headers: {
          'Content-Type': contract.documentMime || 'text/html; charset=utf-8',
          'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${contract.documentFilename || `${contract.contractNumber}.html`}"`,
          'X-Contract-SHA256': contract.contentHash,
          'X-Contract-Document-SHA256': contract.documentHash,
          'Cache-Control': 'private, no-store',
          'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'",
        },
      });
    }

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
        documentHash: contract.documentHash,
        documentMime: contract.documentMime,
        documentFilename: contract.documentFilename,
        status: contract.status,
        generatedAt: contract.generatedAt,
        sellerSignedAt: contract.sellerSignedAt,
        buyerSignedAt: contract.buyerSignedAt,
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
