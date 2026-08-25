/**
 * LEGACY INACTIVE / OWNER-DEFERRED — zero importers as of L1C-0.
 * Queries the deprecated parallel services model (lib/db/schemas/services-schema.ts).
 * Canonical matching is `lib/services/matching.ts` (`runMatching`) over the canonical
 * `service_request_matches` / `service_provider_profiles` store.
 */

import { db } from '@/lib/db';
import { serviceProviders, serviceRequests } from '@/lib/db/schemas/services-schema';
import { eq, and, sql } from 'drizzle-orm';
import { organizations } from '@/lib/db/schema';

export async function matchProfessionals(requestId: string) {
  const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId));
  if (!request) throw new Error('Request not found');
  const providers = await db.select().from(serviceProviders)
    .where(and(
      eq(serviceProviders.status, 'approved'),
      eq(serviceProviders.availability, true),
      request.categoryId ? eq(serviceProviders.categoryId, request.categoryId) : sql`1=1`,
      request.city ? eq(serviceProviders.city, request.city) : sql`1=1`,
    ))
    .orderBy(sql`${serviceProviders.rating} DESC`)
    .limit(20);
  return providers.map(p => ({
    ...p,
    matchScore: calculateMatchScore(p, request),
  }));
}

type MatcherProvider = {
  categoryId: string | null;
  city: string | null;
  rating: string | null;
  jobsCompleted: number | null;
  responseRate: string | null;
  isVerified: boolean | null;
};

type MatcherRequest = {
  categoryId: string | null;
  city: string | null;
};

function calculateMatchScore(provider: MatcherProvider, request: MatcherRequest): number {
  let score = 0;
  if (provider.categoryId === request.categoryId) score += 30;
  if (provider.city === request.city) score += 20;
  if (provider.rating && parseFloat(provider.rating) >= 4.5) score += 15;
  if (provider.jobsCompleted && provider.jobsCompleted > 50) score += 10;
  if (provider.responseRate && parseFloat(provider.responseRate) > 90) score += 15;
  if (provider.isVerified) score += 10;
  return Math.min(score, 100);
}

export async function matchOffices(propertyRequestId: string) {
  const offices = await db.select().from(organizations)
    .where(and(
      eq(organizations.type, 'real_estate'),
      eq(organizations.status, 'active'),
    ))
    .limit(20);
  return offices.map(o => ({
    ...o,
    matchScore: 50,
  }));
}
