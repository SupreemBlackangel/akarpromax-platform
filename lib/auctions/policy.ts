import { createHash } from 'node:crypto';
import { and, eq, gt, inArray, isNull, or } from 'drizzle-orm';

import { db, getDb } from '@/lib/db';
import { organizationMembers, organizations, verificationRecords } from '@/lib/db/schema';
import { auctionTerms, auctionTermsAcceptance } from '@/lib/db/schemas/auction-hardening-schema';
import { limitedAuctionOrganizers } from '@/lib/db/schemas/limited-auction-schema';

type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>["db"]["transaction"]>[0]>[0];
// These helpers are invoked both inside an active transaction and directly
// against the base db connection (e.g. read-only lookups outside a tx).
type DbOrTransaction = DbTransaction | typeof db;

export type CanonicalAuctionType = 'fixed' | 'open';
export const CLOSED_AUCTION_DB_TYPE: CanonicalAuctionType = 'fixed';
export const OPEN_AUCTION_DB_TYPE: CanonicalAuctionType = 'open';
export const AUCTION_TERMS_VERSION = '2026-08-f2';

export function normalizeAuctionType(value: unknown): CanonicalAuctionType | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'fixed' || normalized === 'closed') return 'fixed';
  if (normalized === 'open') return 'open';
  return null;
}

export function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function acceptanceHash(input: {
  propertyId: string;
  userId: string;
  termsId: string;
  contentHash: string;
}): string {
  return createHash('sha256')
    .update(`${input.propertyId}:${input.userId}:${input.termsId}:${input.contentHash}`)
    .digest('hex');
}

export async function getActiveAuctionTerms(tx: DbOrTransaction, role: 'seller' | 'bidder') {
  const [term] = await tx
    .select()
    .from(auctionTerms)
    .where(and(eq(auctionTerms.role, role), eq(auctionTerms.isActive, true)))
    .limit(1);
  return term ?? null;
}

export async function ensureTermsAcceptance(
  tx: DbOrTransaction,
  input: { propertyId: string; userId: string; role: 'seller' | 'bidder' },
) {
  const terms = await getActiveAuctionTerms(tx, input.role);
  if (!terms) throw new Error(`AUCTION_${input.role.toUpperCase()}_TERMS_MISSING`);

  const [existing] = await tx
    .select()
    .from(auctionTermsAcceptance)
    .where(
      and(
        eq(auctionTermsAcceptance.propertyId, input.propertyId),
        eq(auctionTermsAcceptance.userId, input.userId),
        eq(auctionTermsAcceptance.termsId, terms.id),
      ),
    )
    .limit(1);

  if (existing) return { terms, acceptance: existing };

  const [acceptance] = await tx
    .insert(auctionTermsAcceptance)
    .values({
      propertyId: input.propertyId,
      userId: input.userId,
      termsId: terms.id,
      acceptanceHash: acceptanceHash({
        propertyId: input.propertyId,
        userId: input.userId,
        termsId: terms.id,
        contentHash: terms.contentHash,
      }),
    })
    .returning();

  return { terms, acceptance };
}

export async function getClosedAuctionOrganizer(tx: DbOrTransaction, organizationId: string, userId: string) {
  const [row] = await tx
    .select({
      organizationId: organizations.id,
      organizationType: organizations.type,
      organizationStatus: organizations.status,
      verifiedAt: organizations.verifiedAt,
      memberRole: organizationMembers.role,
      memberStatus: organizationMembers.status,
    })
    .from(organizations)
    .innerJoin(
      organizationMembers,
      and(
        eq(organizationMembers.organizationId, organizations.id),
        eq(organizationMembers.userId, userId),
      ),
    )
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!row) return null;
  if (row.organizationStatus !== 'active') return null;
  if (row.memberStatus !== 'active') return null;
  if (!['owner', 'admin', 'manager'].includes(row.memberRole)) return null;
  if (!['real_estate', 'law_office'].includes(row.organizationType)) return null;

  const [verifiedRecord] = await tx
    .select({ id: verificationRecords.id })
    .from(verificationRecords)
    .where(
      and(
        eq(verificationRecords.entityType, 'organization'),
        eq(verificationRecords.entityId, organizationId),
        inArray(verificationRecords.type, ['organization', 'license']),
        eq(verificationRecords.status, 'verified'),
        or(isNull(verificationRecords.expiresAt), gt(verificationRecords.expiresAt, new Date())),
      ),
    )
    .limit(1);

  // Existing organizations also expose verifiedAt. Require both the active
  // organization flag and at least one durable verification signal.
  if (!verifiedRecord) return null;

  const [grant] = await tx
    .select({ id: limitedAuctionOrganizers.id })
    .from(limitedAuctionOrganizers)
    .where(
      and(
        eq(limitedAuctionOrganizers.organizationId, organizationId),
        eq(limitedAuctionOrganizers.userId, userId),
        isNull(limitedAuctionOrganizers.revokedAt),
      ),
    )
    .limit(1);

  if (!grant) return null;
  return row;
}
