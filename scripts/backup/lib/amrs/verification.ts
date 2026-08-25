import { eq, and, sql, lt, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizationMembers, users, verificationRecords } from "@/lib/db/schema";
import type { EntityType, VerificationType, VerificationSource } from "@/lib/amrs/contracts/common";
import type { VerificationStatusChangedEvent } from "@/lib/amrs/contracts/events";
import { getServicesDb } from "@/lib/services/db";

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
    const now = new Date().toISOString();
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

// ─── AMRS-4: Verification Lifecycle ────────────────────────────────

export const verificationEventLog: VerificationStatusChangedEvent[] = [];

export function clearVerificationEvents(): void {
  verificationEventLog.length = 0;
}

function emitVerificationEvent(
  entityType: EntityType,
  entityId: string,
  verificationType: VerificationType,
  oldStatus: string,
  newStatus: string,
): void {
  verificationEventLog.push({
    entityType,
    entityId,
    verificationType,
    oldStatus: oldStatus as VerificationStatusChangedEvent["oldStatus"],
    newStatus: newStatus as VerificationStatusChangedEvent["newStatus"],
    changedAt: new Date(),
  });
}

export async function renewVerification(
  entityType: EntityType,
  entityId: string,
  type: VerificationType,
  source: VerificationSource = "manual",
  countryCode?: string,
): Promise<VerificationRecordResult> {
  const existing = await getVerificationStatus(entityType, entityId, type);
  if (existing && existing.status === "pending") {
    throw new Error("ACTIVE_VERIFICATION_EXISTS");
  }

  const oldStatus = existing?.status ?? "none";
  const record = await submitVerification({ entityType, entityId, type, source, countryCode });
  emitVerificationEvent(entityType, entityId, type, oldStatus, "pending");
  return record;
}

export async function revokeVerificationWithEvent(
  recordId: string,
  entityType: EntityType,
  entityId: string,
  verificationType: VerificationType,
): Promise<void> {
  const { db, end } = getDb();
  try {
    const [record] = await db
      .select()
      .from(verificationRecords)
      .where(eq(verificationRecords.id, recordId))
      .limit(1);

    if (!record) throw new Error("RECORD_NOT_FOUND");

    const oldStatus = record.status;
    await db
      .update(verificationRecords)
      .set({ status: "revoked" })
      .where(eq(verificationRecords.id, recordId));
    emitVerificationEvent(entityType, entityId, verificationType, oldStatus, "revoked");
  } finally {
    await end();
  }
}

export interface TrustPanelItem {
  type: VerificationType;
  status: string;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  isExpired: boolean;
  source: string;
}

export interface EntityTrustPanel {
  entityType: EntityType;
  entityId: string;
  items: TrustPanelItem[];
  summary: {
    totalVerified: number;
    totalPending: number;
    totalFailed: number;
    totalExpired: number;
    totalRevoked: number;
    highestTrustType: VerificationType | null;
  };
}

const TRUST_RANK: VerificationType[] = [
  "identity",
  "license",
  "organization",
  "professional",
  "email",
  "phone",
  "address",
];

export async function getTrustPanel(
  entityType: EntityType,
  entityId: string,
): Promise<EntityTrustPanel> {
  const records = await listVerifications(entityType, entityId);

  const items: TrustPanelItem[] = records.map((r) => ({
    type: r.type as VerificationType,
    status: r.status,
    verifiedAt: r.verifiedAt,
    expiresAt: r.expiresAt,
    isExpired: r.expiresAt ? r.expiresAt.getTime() < Date.now() : false,
    source: r.source,
  }));

  const counts = { verified: 0, pending: 0, failed: 0, expired: 0, revoked: 0 };
  for (const item of items) {
    if (item.isExpired) counts.expired++;
    else if (item.status === "verified") counts.verified++;
    else if (item.status === "pending") counts.pending++;
    else if (item.status === "failed") counts.failed++;
    else if (item.status === "revoked") counts.revoked++;
  }

  const verifiedTypes = new Set(
    items.filter((i) => i.status === "verified" && !i.isExpired).map((i) => i.type),
  );
  const highestTrustType = TRUST_RANK.find((t) => verifiedTypes.has(t)) ?? null;

  return {
    entityType,
    entityId,
    items,
    summary: {
      totalVerified: counts.verified,
      totalPending: counts.pending,
      totalFailed: counts.failed,
      totalExpired: counts.expired,
      totalRevoked: counts.revoked,
      highestTrustType,
    },
  };
}

export async function listPendingVerifications(): Promise<VerificationRecordResult[]> {
  const { db, end } = getDb();
  try {
    const rows = await db
      .select()
      .from(verificationRecords)
      .where(eq(verificationRecords.status, "pending"))
      .orderBy(desc(verificationRecords.createdAt));
    return rows as VerificationRecordResult[];
  } finally {
    await end();
  }
}

export async function approveVerificationWithEvent(
  recordId: string,
  verifiedBy: string,
  entityType: EntityType,
  entityId: string,
  verificationType: VerificationType,
  expiresInDays?: number,
): Promise<void> {
  if (await isSelfVerificationApproval(verifiedBy, entityType, entityId)) {
    throw new Error("CANNOT_APPROVE_OWN");
  }
  const { db, end } = getDb();
  try {
    const [record] = await db
      .select()
      .from(verificationRecords)
      .where(eq(verificationRecords.id, recordId))
      .limit(1);

    if (!record) throw new Error("RECORD_NOT_FOUND");

    const oldStatus = record.status;
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : record.expiresAt;

    await db
      .update(verificationRecords)
      .set({
        status: "verified",
        verifiedAt: new Date(),
        expiresAt,
        verifiedBy,
      })
      .where(eq(verificationRecords.id, recordId));

    emitVerificationEvent(entityType, entityId, verificationType, oldStatus, "verified");
  } finally {
    await end();
  }
}

async function isSelfVerificationApproval(
  approverUserId: string,
  entityType: EntityType,
  entityId: string,
): Promise<boolean> {
  if (entityType === "user") {
    return approverUserId === entityId;
  }

  if (entityType === "organization") {
    const { db, end } = getDb();
    try {
      const rows = await db
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, entityId),
            eq(organizationMembers.userId, approverUserId),
            eq(organizationMembers.status, "active"),
          ),
        )
        .limit(1);
      return Boolean(rows[0]);
    } finally {
      await end();
    }
  }

  if (entityType === "professional") {
    const servicesDb = await getServicesDb();
    const provider = await servicesDb
      .prepare("SELECT user_id FROM service_provider_profiles WHERE id = ?1 LIMIT 1")
      .bind(entityId)
      .first<{ user_id: string | null }>();
    if (!provider?.user_id) return false;
    const { db, end } = getDb();
    try {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, String(provider.user_id).trim().toLowerCase()))
        .limit(1);
      return rows[0]?.id === approverUserId;
    } finally {
      await end();
    }
  }

  return false;
}

export async function rejectVerificationWithEvent(
  recordId: string,
  entityType: EntityType,
  entityId: string,
  verificationType: VerificationType,
): Promise<void> {
  const { db, end } = getDb();
  try {
    const [record] = await db
      .select()
      .from(verificationRecords)
      .where(eq(verificationRecords.id, recordId))
      .limit(1);

    if (!record) throw new Error("RECORD_NOT_FOUND");

    const oldStatus = record.status;
    await db
      .update(verificationRecords)
      .set({ status: "failed" })
      .where(eq(verificationRecords.id, recordId));

    emitVerificationEvent(entityType, entityId, verificationType, oldStatus, "failed");
  } finally {
    await end();
  }
}
