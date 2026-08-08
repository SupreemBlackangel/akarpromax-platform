import { eq, and, sql, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { verificationRecords } from "@/lib/db/schema";
import type { EntityType, VerificationType, VerificationSource } from "@/lib/amrs/contracts/common";

export interface VerificationRecordInput {
  entityType: EntityType;
  entityId: string;
  type: VerificationType;
  source?: VerificationSource;
  countryCode?: string;
  verifiedBy?: string;
}

export interface VerificationRecordResult {
  id: string;
  entityType: string;
  entityId: string;
  type: string;
  status: string;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  source: string;
  countryCode: string | null;
  createdAt: Date;
}

export async function submitVerification(input: VerificationRecordInput): Promise<VerificationRecordResult> {
  const { db, end } = getDb();
  try {
    const [record] = await db
      .insert(verificationRecords)
      .values({
        entityType: input.entityType,
        entityId: input.entityId,
        type: input.type,
        status: "pending",
        source: input.source ?? "system",
        countryCode: input.countryCode ?? null,
      })
      .returning();
    return record as VerificationRecordResult;
  } finally {
    await end();
  }
}

export async function approveVerification(
  recordId: string,
  verifiedBy: string,
  expiresInDays?: number,
): Promise<void> {
  const { db, end } = getDb();
  try {
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    await db
      .update(verificationRecords)
      .set({
        status: "verified",
        verifiedAt: new Date(),
        expiresAt,
        verifiedBy,
      })
      .where(eq(verificationRecords.id, recordId));
  } finally {
    await end();
  }
}

export async function rejectVerification(recordId: string): Promise<void> {
  const { db, end } = getDb();
  try {
    await db
      .update(verificationRecords)
      .set({ status: "failed" })
      .where(eq(verificationRecords.id, recordId));
  } finally {
    await end();
  }
}

export async function revokeVerification(recordId: string): Promise<void> {
  const { db, end } = getDb();
  try {
    await db
      .update(verificationRecords)
      .set({ status: "revoked" })
      .where(eq(verificationRecords.id, recordId));
  } finally {
    await end();
  }
}

export async function getVerificationStatus(
  entityType: EntityType,
  entityId: string,
  type: VerificationType,
): Promise<VerificationRecordResult | null> {
  const { db, end } = getDb();
  try {
    const [record] = await db
      .select()
      .from(verificationRecords)
      .where(
        and(
          eq(verificationRecords.entityType, entityType),
          eq(verificationRecords.entityId, entityId),
          eq(verificationRecords.type, type),
        ),
      )
      .limit(1);
    return (record as VerificationRecordResult) ?? null;
  } finally {
    await end();
  }
}

export async function listVerifications(
  entityType: EntityType,
  entityId: string,
): Promise<VerificationRecordResult[]> {
  const { db, end } = getDb();
  try {
    const rows = await db
      .select()
      .from(verificationRecords)
      .where(
        and(
          eq(verificationRecords.entityType, entityType),
          eq(verificationRecords.entityId, entityId),
        ),
      );
    return rows as VerificationRecordResult[];
  } finally {
    await end();
  }
}

export async function getExpiringVerifications(daysAhead: number = 30): Promise<VerificationRecordResult[]> {
  const { db, end } = getDb();
  try {
    const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    const rows = await db
      .select()
      .from(verificationRecords)
      .where(
        and(
          eq(verificationRecords.status, "verified"),
          lt(verificationRecords.expiresAt, cutoff),
        ),
      );
    return rows as VerificationRecordResult[];
  } finally {
    await end();
  }
}

export async function expireVerifications(): Promise<number> {
  const { db, end } = getDb();
  try {
    const now = new Date();
    const result = await db.execute(sql`
      UPDATE verification_records
      SET status = 'expired'
      WHERE status = 'verified'
        AND expires_at < ${now}
    `);
    return (result as unknown as { rowCount?: number }).rowCount ?? 0;
  } finally {
    await end();
  }
}

export function getVerificationSummary(records: VerificationRecordResult[]): {
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  totalVerified: number;
  totalTypes: number;
} {
  const statusMap = new Map<string, string>();
  for (const r of records) {
    statusMap.set(r.type, r.status);
  }
  return {
    emailVerified: statusMap.get("email") === "verified",
    phoneVerified: statusMap.get("phone") === "verified",
    identityVerified: statusMap.get("identity") === "verified",
    totalVerified: [...statusMap.values()].filter((s) => s === "verified").length,
    totalTypes: statusMap.size,
  };
}
