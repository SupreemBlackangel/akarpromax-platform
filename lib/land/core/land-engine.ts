import { db } from '@/lib/db';
import { landParcels, landDocuments, landValuations, landFavorites } from '@/lib/db/schemas/land-schema';
import { eq, and, desc, sql, inArray, type SQL } from 'drizzle-orm';
import { logger } from '@/lib/logging/logger';

export type LandSearchFilters = {
  country?: string;
  governorate?: string;
  city?: string;
  type?: string;
  status?: string;
  minArea?: number;
  maxArea?: number;
  minPrice?: number;
  maxPrice?: number;
  zoning?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
  sort?: 'price_asc' | 'price_desc' | 'area_asc' | 'area_desc' | 'newest' | 'score';
};

export type LandSearchResult = {
  parcels: (typeof landParcels.$inferSelect)[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function searchLand(filters: LandSearchFilters): Promise<LandSearchResult> {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 20, 100);
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (filters.country) conditions.push(eq(landParcels.country, filters.country));
  if (filters.governorate) conditions.push(eq(landParcels.governorate, filters.governorate));
  if (filters.city) conditions.push(eq(landParcels.city, filters.city));
  if (filters.type) conditions.push(eq(landParcels.type, filters.type));
  if (filters.status) conditions.push(eq(landParcels.status, filters.status));
  if (filters.zoning) conditions.push(eq(landParcels.zoning, filters.zoning));

  if (filters.minArea) {
    conditions.push(sql`CAST(${landParcels.area} AS numeric) >= ${filters.minArea}`);
  }
  if (filters.maxArea) {
    conditions.push(sql`CAST(${landParcels.area} AS numeric) <= ${filters.maxArea}`);
  }
  if (filters.minPrice) {
    conditions.push(sql`CAST(${landParcels.price} AS numeric) >= ${filters.minPrice}`);
  }
  if (filters.maxPrice) {
    conditions.push(sql`CAST(${landParcels.price} AS numeric) <= ${filters.maxPrice}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderClause = (() => {
    switch (filters.sort) {
      case 'price_asc': return sql`CAST(${landParcels.price} AS numeric) ASC`;
      case 'price_desc': return sql`CAST(${landParcels.price} AS numeric) DESC`;
      case 'area_asc': return sql`CAST(${landParcels.area} AS numeric) ASC`;
      case 'area_desc': return sql`CAST(${landParcels.area} AS numeric) DESC`;
      case 'score': return desc(landParcels.score);
      default: return desc(landParcels.createdAt);
    }
  })();

  const [parcels, countResult] = await Promise.all([
    db.select().from(landParcels)
      .where(whereClause)
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(landParcels)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    parcels,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getLandParcel(id: string) {
  const results = await db.select().from(landParcels).where(eq(landParcels.id, id)).limit(1);
  return results[0] ?? null;
}

export async function createLandParcel(data: typeof landParcels.$inferInsert) {
  const results = await db.insert(landParcels).values(data).returning();
  return results[0];
}

export async function updateLandParcel(id: string, data: Partial<typeof landParcels.$inferInsert>) {
  const results = await db.update(landParcels).set({ ...data, updatedAt: new Date() })
    .where(eq(landParcels.id, id)).returning();
  return results[0] ?? null;
}

export async function deleteLandParcel(id: string) {
  await db.delete(landParcels).where(eq(landParcels.id, id));
}

export async function addLandDocument(data: typeof landDocuments.$inferInsert) {
  const results = await db.insert(landDocuments).values(data).returning();
  return results[0];
}

export async function getLandDocuments(parcelId: string) {
  return db.select().from(landDocuments).where(eq(landDocuments.parcelId, parcelId));
}

export async function addLandValuation(data: typeof landValuations.$inferInsert) {
  const results = await db.insert(landValuations).values(data).returning();
  return results[0];
}

export async function getLandValuations(parcelId: string) {
  return db.select().from(landValuations).where(eq(landValuations.parcelId, parcelId))
    .orderBy(desc(landValuations.createdAt));
}

export async function toggleLandFavorite(userId: string, parcelId: string) {
  const existing = await db.select().from(landFavorites)
    .where(and(eq(landFavorites.userId, userId), eq(landFavorites.parcelId, parcelId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(landFavorites)
      .where(and(eq(landFavorites.userId, userId), eq(landFavorites.parcelId, parcelId)));
    await db.update(landParcels).set({ favorites: sql`${landParcels.favorites} - 1` })
      .where(eq(landParcels.id, parcelId));
    return false;
  } else {
    await db.insert(landFavorites).values({ userId, parcelId });
    await db.update(landParcels).set({ favorites: sql`${landParcels.favorites} + 1` })
      .where(eq(landParcels.id, parcelId));
    return true;
  }
}

export async function getUserLandFavorites(userId: string) {
  return db.select({ parcel: landParcels }).from(landFavorites)
    .innerJoin(landParcels, eq(landFavorites.parcelId, landParcels.id))
    .where(eq(landFavorites.userId, userId))
    .orderBy(desc(landFavorites.createdAt));
}

export function calculateLandScore(parcel: {
  type?: string | null;
  area?: string | null;
  price?: string | null;
  isVerified?: boolean | null;
  views?: number | null;
  favorites?: number | null;
}): number {
  let score = 0;
  if (parcel.isVerified) score += 20;
  if (parcel.area && Number(parcel.area) > 500) score += 10;
  if (parcel.price && Number(parcel.price) > 0) score += 5;
  if (parcel.views && parcel.views > 100) score += 10;
  if (parcel.favorites && parcel.favorites > 5) score += 15;
  if (parcel.type === 'residential') score += 5;
  if (parcel.type === 'commercial') score += 8;
  return Math.min(score, 100);
}
