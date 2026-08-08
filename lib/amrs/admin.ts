import { sql, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  organizations,
  organizationMembers,
  verificationRecords,
  reputationProfiles,
} from "@/lib/db/schema";

export interface AdminDashboardStats {
  totalOrganizations: number;
  activeOrganizations: number;
  pendingOrganizations: number;
  totalMembers: number;
  totalVerifications: number;
  pendingVerifications: number;
  verifiedCount: number;
  reputationDistribution: Record<string, number>;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const { db, end } = getDb();
  try {
    const orgTotal = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations);

    const orgActive = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations)
      .where(eq(organizations.status, "active"));

    const orgPending = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations)
      .where(eq(organizations.status, "pending_review"));

    const memberCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationMembers);

    const verifTotal = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(verificationRecords);

    const verifPending = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(verificationRecords)
      .where(eq(verificationRecords.status, "pending"));

    const verifVerified = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(verificationRecords)
      .where(eq(verificationRecords.status, "verified"));

    const repRows = await db
      .select({
        level: reputationProfiles.level,
        count: sql<number>`count(*)::int`,
      })
      .from(reputationProfiles)
      .groupBy(reputationProfiles.level);

    const reputationDistribution: Record<string, number> = {
      new: 0,
      rising: 0,
      distinguished: 0,
      gold: 0,
      promax: 0,
    };
    for (const row of repRows) {
      reputationDistribution[row.level] = row.count;
    }

    return {
      totalOrganizations: orgTotal[0]?.count ?? 0,
      activeOrganizations: orgActive[0]?.count ?? 0,
      pendingOrganizations: orgPending[0]?.count ?? 0,
      totalMembers: memberCount[0]?.count ?? 0,
      totalVerifications: verifTotal[0]?.count ?? 0,
      pendingVerifications: verifPending[0]?.count ?? 0,
      verifiedCount: verifVerified[0]?.count ?? 0,
      reputationDistribution,
    };
  } finally {
    await end();
  }
}

export interface BulkAction {
  readonly action: "suspend" | "activate" | "delete";
  readonly entityIds: readonly string[];
  readonly reason?: string;
}

export interface BulkActionResult {
  readonly action: string;
  readonly affected: number;
  readonly errors: string[];
}

export async function executeBulkOrganizationAction(
  action: BulkAction,
): Promise<BulkActionResult> {
  const { db, end } = getDb();
  const errors: string[] = [];
  let affected = 0;

  try {
    for (const id of action.entityIds) {
      try {
        let result;
        switch (action.action) {
          case "suspend":
            await db
              .update(organizations)
              .set({ status: "suspended" })
              .where(eq(organizations.id, id));
            break;
          case "activate":
            await db
              .update(organizations)
              .set({ status: "active" })
              .where(eq(organizations.id, id));
            break;
          case "delete":
            await db
              .update(organizations)
              .set({ status: "deleted" })
              .where(eq(organizations.id, id));
            break;
        }
        affected++;
      } catch (err) {
        errors.push(`${id}: ${err instanceof Error ? err.message : "UNKNOWN"}`);
      }
    }

    return { action: action.action, affected, errors };
  } finally {
    await end();
  }
}

export async function getOrganizationsByStatus(
  status: string,
  limit: number = 50,
): Promise<{ id: string; nameEn: string | null; slug: string | null; countryCode: string | null; createdAt: Date | null }[]> {
  const { db, end } = getDb();
  try {
    const rows = await db
      .select({
        id: organizations.id,
        nameEn: organizations.nameEn,
        slug: organizations.slug,
        countryCode: organizations.countryCode,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .where(eq(organizations.status, status))
      .limit(limit);
    return rows;
  } finally {
    await end();
  }
}
