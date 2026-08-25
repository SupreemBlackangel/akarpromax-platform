/**
 * LEGACY INACTIVE / OWNER-DEFERRED — zero importers as of L1C-0.
 * Queries the deprecated parallel services model (lib/db/schemas/services-schema.ts).
 * Canonical provider truth is `service_provider_profiles` via `lib/services/marketplace.ts`.
 */

import { db } from '@/lib/db';
import { serviceProviders } from '@/lib/db/schemas/services-schema';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logging/logger';

export type ProfessionalMatch = {
  providerId: string;
  userId: string;
  businessName: string;
  rating: number;
  distance: number | null;
  matchScore: number;
  specialties: string[];
};

export async function findProfessionalsForLand(
  landType: string,
  country: string,
  city: string,
  radiusKm: number = 50,
): Promise<ProfessionalMatch[]> {
  const providers = await db.select({
    providerId: serviceProviders.id,
    userId: serviceProviders.userId,
    businessName: serviceProviders.businessName,
    rating: serviceProviders.rating,
    city: serviceProviders.city,
    country: serviceProviders.country,
    categoryId: serviceProviders.categoryId,
  }).from(serviceProviders)
    .innerJoin(users, eq(serviceProviders.userId, users.id))
    .where(
      and(
        eq(serviceProviders.status, 'active'),
        eq(serviceProviders.country, country),
      ),
    );

  const matches: ProfessionalMatch[] = [];

  for (const p of providers) {
    let score = 0;
    const rating = parseFloat(p.rating ?? '0');
    score += rating * 10;
    if (p.city === city) score += 20;

    const isLandRelated = landType === 'residential' || landType === 'commercial' || landType === 'industrial';
    if (isLandRelated) score += 10;

    matches.push({
      providerId: p.providerId,
      userId: p.userId ?? '',
      businessName: p.businessName,
      rating,
      distance: null,
      matchScore: Math.min(score, 100),
      specialties: [],
    });
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
}

export async function getProfessionalForParcel(parcelId: string) {
  logger.info('Getting professional for parcel', { parcelId });
  return null;
}

export async function assignProfessionalToLand(
  parcelId: string,
  providerId: string,
  assignedBy: string,
): Promise<boolean> {
  logger.info('Assigning professional to land', { parcelId, providerId });
  return true;
}
