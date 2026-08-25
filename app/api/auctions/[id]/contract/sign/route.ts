import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import {
  auctionContracts,
  auctionContractSignatures,
  auctionEvents,
} from '@/lib/db/schemas/auction-hardening-schema';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session) return NextResponse.json({ error: 'ط؛ظٹط± ظ…طµط±ط­' }, { status: 401 });

  const { id: propertyId } = await params;
  let body: { accept?: unknown; contractHash?: unknown } | undefined;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'ط¨ظٹط§ظ†ط§طھ ط؛ظٹط± طµط§ظ„ط­ط©' }, { status: 400 });
  }

  if (body?.accept !== true) {
    return NextResponse.json({ error: 'ظٹط¬ط¨ طھط£ظƒظٹط¯ ط§ظ„ظ…ظˆط§ظپظ‚ط© ط¹ظ„ظ‰ ط§ظ„ط¹ظ‚ط¯' }, { status: 400 });
  }

  const submittedHash = String(body?.contractHash || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(submittedHash)) {
    return NextResponse.json({ error: 'ط¨طµظ…ط© ط§ظ„ط¹ظ‚ط¯ ط؛ظٹط± طµط§ظ„ط­ط©' }, { status: 400 });
  }

  const { db, end } = getDb();
  try {
    const result = await db.transaction(async (tx) => {
      const [contract] = await tx
        .select()
        .from(auctionContracts)
        .where(eq(auctionContracts.propertyId, propertyId))
        .for('update')
        .limit(1);

      if (!contract) throw new Error('CONTRACT_NOT_FOUND');

      const authoritativeHash = String(contract.documentHash || contract.contentHash || '').toLowerCase();
      if (!authoritativeHash || submittedHash !== authoritativeHash) {
        throw new Error('CONTRACT_HASH_MISMATCH');
      }

      let partyRole: 'seller' | 'buyer' | null = null;
      if (contract.sellerId === session.userId) partyRole = 'seller';
      else if (contract.buyerId === session.userId) partyRole = 'buyer';
      if (!partyRole) throw new Error('CONTRACT_PARTY_ONLY');

      const existingRows = await tx
        .select()
        .from(auctionContractSignatures)
        .where(eq(auctionContractSignatures.contractId, contract.id));

      const existingForUser = existingRows.find(
        (row) => row.userId === session.userId && row.partyRole === partyRole,
      );

      if (existingForUser) {
        return {
          idempotent: true,
          contract,
          signature: existingForUser,
        };
      }

      const now = new Date();
      const signatureHash = createHash('sha256')
        .update(`${contract.id}|${session.userId}|${partyRole}|${authoritativeHash}|${now.toISOString()}`)
        .digest('hex');

      const [signature] = await tx
        .insert(auctionContractSignatures)
        .values({
          contractId: contract.id,
          propertyId: contract.propertyId,
          userId: session.userId,
          partyRole,
          contractHash: authoritativeHash,
          signatureHash,
          signedAt: now,
        })
        .returning();

      const signatures = await tx
        .select({
          userId: auctionContractSignatures.userId,
          partyRole: auctionContractSignatures.partyRole,
        })
        .from(auctionContractSignatures)
        .where(eq(auctionContractSignatures.contractId, contract.id));

      const sellerDone = signatures.some((row) => row.userId === contract.sellerId && row.partyRole === 'seller');
      const buyerDone = signatures.some((row) => row.userId === contract.buyerId && row.partyRole === 'buyer');
      const fullySigned = sellerDone && buyerDone;

      const [updated] = await tx
        .update(auctionContracts)
        .set({
          status: fullySigned ? 'signed' : 'signature_pending',
          sellerSignedAt: sellerDone ? (partyRole === 'seller' ? now : contract.sellerSignedAt) : null,
          buyerSignedAt: buyerDone ? (partyRole === 'buyer' ? now : contract.buyerSignedAt) : null,
          signedAt: fullySigned ? now : null,
        })
        .where(eq(auctionContracts.id, contract.id))
        .returning();

      await tx.insert(auctionEvents).values({
        propertyId: contract.propertyId,
        actorUserId: session.userId,
        eventType: 'CONTRACT_PARTY_SIGNED',
        payload: {
          contractId: contract.id,
          partyRole,
          contractHash: authoritativeHash,
          signatureHash,
        },
      });

      if (fullySigned) {
        await tx.insert(auctionEvents).values({
          propertyId: contract.propertyId,
          actorUserId: session.userId,
          eventType: 'CONTRACT_SIGNED',
          payload: { contractId: contract.id, contractHash: authoritativeHash },
        });
      }

      return { idempotent: false, contract: updated, signature };
    });

    return NextResponse.json({ success: true, data: result }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const code = error instanceof Error ? error.message : String(error);
    if (code === 'CONTRACT_NOT_FOUND') return NextResponse.json({ error: 'ط§ظ„ط¹ظ‚ط¯ ط؛ظٹط± ظ…ظˆط¬ظˆط¯' }, { status: 404 });
    if (code === 'CONTRACT_HASH_MISMATCH') return NextResponse.json({ error: 'طھظ… ط±ظپط¶ ط§ظ„طھظˆظ‚ظٹط¹ ظ„ط£ظ† ط¨طµظ…ط© ط§ظ„ط¹ظ‚ط¯ ظ„ط§ طھط·ط§ط¨ظ‚ ط§ظ„ظ†ط³ط®ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©' }, { status: 409 });
    if (code === 'CONTRACT_PARTY_ONLY') return NextResponse.json({ error: 'ط§ظ„طھظˆظ‚ظٹط¹ ظ…طھط§ط­ ظ„ط·ط±ظپظٹ ط§ظ„ط¹ظ‚ط¯ ظپظ‚ط·' }, { status: 403 });
    console.error('[Auction Contract Sign] Error:', error);
    return NextResponse.json({ error: 'ظپط´ظ„ ظپظٹ طھط³ط¬ظٹظ„ ظ‚ط¨ظˆظ„ ط§ظ„ط¹ظ‚ط¯' }, { status: 500 });
  } finally {
    await end();
  }
}
