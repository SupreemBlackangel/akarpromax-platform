import { eq, and, or, ilike, sql, desc, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import type { EntityType, OrganizationType, OrganizationClassification, ReputationLevel } from "@/lib/amrs/contracts/common";

export interface DirectoryFilters {
  entityType?: EntityType;
  organizationType?: OrganizationType;
  classification?: OrganizationClassification;
  reputationLevel?: ReputationLevel;
  countryCode?: string;
  cityId?: string;
  isVerified?: boolean;
  search?: string;
  sortBy?: "name" | "rating" | "reputation" | "created";
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface DirectoryEntry {
  id: string;
  entityType: EntityType;
  name: string;
  slug: string | null;
  countryCode: string | null;
  cityId: string | null;
  ratingAvg: number | null;
  jobsCompleted: number | null;
  reputationLevel: ReputationLevel | null;
  reputationScore: number | null;
  isVerified: boolean;
  createdAt: Date;
}

export interface DirectoryResult {
  entries: DirectoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

function applyFilters(
  filters: DirectoryFilters,
) {
  const conditions = [];

  if (filters.countryCode) {
    conditions.push(eq(organizations.countryCode, filters.countryCode));
  }
  if (filters.cityId) {
    conditions.push(eq(organizations.cityId, filters.cityId));
  }

  if (filters.search) {
    conditions.push(
      or(
        ilike(organizations.nameEn, `%${filters.search}%`),
        ilike(organizations.nameAr, `%${filters.search}%`),
        ilike(organizations.slug, `%${filters.search}%`),
      ),
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function searchDirectory(
  filters: DirectoryFilters = {},
): Promise<DirectoryResult> {
  const { db, end } = getDb();
  const limit = Math.min(filters.limit ?? 20, 100);
  const offset = filters.offset ?? 0;

  try {
    const conditions = applyFilters(filters);

    const rows = await db
      .select({
        id: organizations.id,
        nameEn: organizations.nameEn,
        slug: organizations.slug,
        countryCode: organizations.countryCode,
        cityId: organizations.cityId,
        classification: organizations.classification,
        organizationType: organizations.type,
        status: organizations.status,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .where(conditions)
      .orderBy(
        filters.sortDir === "asc"
          ? asc(organizations.nameEn)
          : desc(organizations.createdAt),
      )
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations)
      .where(conditions);

    const total = countResult[0]?.count ?? 0;

    const entries: DirectoryEntry[] = rows.map((row) => ({
      id: row.id,
      entityType: "organization" as EntityType,
      name: row.nameEn ?? row.slug ?? row.id,
      slug: row.slug,
      countryCode: row.countryCode,
      cityId: row.cityId,
      ratingAvg: null,
      jobsCompleted: null,
      reputationLevel: null,
      reputationScore: null,
      isVerified: false,
      createdAt: row.createdAt ?? new Date(),
    }));

    return { entries, total, limit, offset };
  } finally {
    await end();
  }
}

export async function getDirectoryEntry(
  entityId: string,
  entityType: EntityType = "organization",
): Promise<DirectoryEntry | null> {
  const { db, end } = getDb();
  try {
    if (entityType === "organization") {
      const [row] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, entityId))
        .limit(1);

      if (!row) return null;

      return {
        id: row.id,
        entityType: "organization",
        name: row.nameEn ?? row.slug ?? row.id,
        slug: row.slug,
        countryCode: row.countryCode,
        cityId: row.cityId,
        ratingAvg: null,
        jobsCompleted: null,
        reputationLevel: null,
        reputationScore: null,
        isVerified: false,
        createdAt: row.createdAt ?? new Date(),
      };
    }

    return null;
  } finally {
    await end();
  }
}

export async function getDirectoryStats(): Promise<{
  totalOrganizations: number;
  byType: Record<string, number>;
  byCountry: Record<string, number>;
}> {
  const { db, end } = getDb();
  try {
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations);
    const total = totalResult[0]?.count ?? 0;

    const typeRows = await db
      .select({
        type: organizations.type,
        count: sql<number>`count(*)::int`,
      })
      .from(organizations)
      .groupBy(organizations.type);

    const countryRows = await db
      .select({
        countryCode: organizations.countryCode,
        count: sql<number>`count(*)::int`,
      })
      .from(organizations)
      .groupBy(organizations.countryCode);

    const byType: Record<string, number> = {};
    for (const row of typeRows) {
      byType[row.type ?? "unknown"] = row.count;
    }

    const byCountry: Record<string, number> = {};
    for (const row of countryRows) {
      byCountry[row.countryCode ?? "unknown"] = row.count;
    }

    return { totalOrganizations: total, byType, byCountry };
  } finally {
    await end();
  }
}
