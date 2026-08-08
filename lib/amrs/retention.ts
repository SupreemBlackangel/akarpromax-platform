import { sql, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  organizations,
  verificationRecords,
} from "@/lib/db/schema";

export interface RetentionPolicy {
  readonly entity: string;
  readonly softDeleteField: string;
  readonly retentionDays: number;
  readonly hardDeleteAfterDays: number | null;
  readonly description: string;
}

export const RETENTION_POLICIES: readonly RetentionPolicy[] = [
  {
    entity: "organizations",
    softDeleteField: "status",
    retentionDays: 90,
    hardDeleteAfterDays: 365,
    description: "Soft-deleted orgs kept 90 days, hard-deleted after 1 year",
  },
  {
    entity: "verification_records",
    softDeleteField: "status",
    retentionDays: 0,
    hardDeleteAfterDays: 730,
    description: "Rejected/revoked verifications kept 2 years for audit",
  },
  {
    entity: "reputation_evaluations",
    softDeleteField: "id",
    retentionDays: 0,
    hardDeleteAfterDays: 1825,
    description: "Evaluation history kept 5 years for audit trail",
  },
  {
    entity: "reputation_history",
    softDeleteField: "id",
    retentionDays: 0,
    hardDeleteAfterDays: 1825,
    description: "Level change history kept 5 years for audit trail",
  },
];

export function isExpired(createdOrDeletedAt: Date, retentionDays: number): boolean {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  return createdOrDeletedAt.getTime() < cutoff.getTime();
}

export function getDaysUntilHardDelete(
  createdAt: Date,
  hardDeleteAfterDays: number,
): number {
  const hardDeleteAt = new Date(createdAt.getTime() + hardDeleteAfterDays * 24 * 60 * 60 * 1000);
  const remaining = Math.ceil((hardDeleteAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

export async function softDeleteOrganization(orgId: string): Promise<void> {
  const { db, end } = getDb();
  try {
    await db
      .update(organizations)
      .set({ status: "deleted" })
      .where(eq(organizations.id, orgId));
  } finally {
    await end();
  }
}

export async function restoreOrganization(orgId: string): Promise<void> {
  const { db, end } = getDb();
  try {
    await db
      .update(organizations)
      .set({ status: "active" })
      .where(eq(organizations.id, orgId));
  } finally {
    await end();
  }
}

export async function hardDeleteExpiredVerifications(daysOld: number = 730): Promise<number> {
  const { db, end } = getDb();
  try {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await db.execute(sql`
      DELETE FROM verification_records
      WHERE status IN ('failed', 'revoked')
        AND created_at < ${cutoff}
    `);
    return (result as unknown as { rowCount?: number }).rowCount ?? 0;
  } finally {
    await end();
  }
}

export async function hardDeleteExpiredEvaluations(daysOld: number = 1825): Promise<number> {
  const { db, end } = getDb();
  try {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await db.execute(sql`
      DELETE FROM reputation_evaluations
      WHERE evaluated_at < ${cutoff}
    `);
    return (result as unknown as { rowCount?: number }).rowCount ?? 0;
  } finally {
    await end();
  }
}

export interface RetentionStatus {
  entity: string;
  policy: RetentionPolicy;
  expiredCount: number;
  totalRows: number;
  nextHardDelete: Date | null;
}

export async function getRetentionStatus(): Promise<RetentionStatus[]> {
  const { db, end } = getDb();
  try {
    const statuses: RetentionStatus[] = [];

    const orgCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations);
    const deletedOrgCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations)
      .where(eq(organizations.status, "deleted"));

    statuses.push({
      entity: "organizations",
      policy: RETENTION_POLICIES[0],
      expiredCount: deletedOrgCount[0]?.count ?? 0,
      totalRows: orgCount[0]?.count ?? 0,
      nextHardDelete: null,
    });

    const verifCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(verificationRecords);
    const inactiveVerifCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(verificationRecords)
      .where(
        eq(verificationRecords.status, "failed"),
      );

    statuses.push({
      entity: "verification_records",
      policy: RETENTION_POLICIES[1],
      expiredCount: inactiveVerifCount[0]?.count ?? 0,
      totalRows: verifCount[0]?.count ?? 0,
      nextHardDelete: null,
    });

    return statuses;
  } finally {
    await end();
  }
}
