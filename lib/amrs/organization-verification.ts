import { and, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  auditEvents,
  organizationMembers,
  organizations,
  verificationRecords,
} from "@/lib/db/schema";

export type VerificationReviewAction = "approve" | "reject" | "revoke";

type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>["db"]["transaction"]>[0]>[0];

function privilegedOrganizationVerification(type: string): boolean {
  return type === "organization" || type === "license";
}

async function reviewerIsSubjectMember(
  tx: DbTransaction,
  reviewerUserId: string,
  entityType: string,
  entityId: string,
): Promise<boolean> {
  if (entityType === "user") return reviewerUserId === entityId;
  if (entityType !== "organization") return false;

  const [membership] = await tx
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, entityId),
        eq(organizationMembers.userId, reviewerUserId),
        eq(organizationMembers.status, "active"),
      ),
    )
    .limit(1);

  return Boolean(membership);
}

async function syncOrganizationVerifiedAtTx(tx: DbTransaction, organizationId: string): Promise<void> {
  const [valid] = await tx
    .select({ verifiedAt: verificationRecords.verifiedAt })
    .from(verificationRecords)
    .where(
      and(
        eq(verificationRecords.entityType, "organization"),
        eq(verificationRecords.entityId, organizationId),
        inArray(verificationRecords.type, ["organization", "license"]),
        eq(verificationRecords.status, "verified"),
        or(isNull(verificationRecords.expiresAt), gt(verificationRecords.expiresAt, new Date())),
      ),
    )
    .limit(1);

  await tx
    .update(organizations)
    .set({
      verifiedAt: valid?.verifiedAt ?? null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));
}

async function auditTx(
  tx: DbTransaction,
  actorUserId: string | null,
  eventType: string,
  detail: Record<string, unknown>,
): Promise<void> {
  await tx.insert(auditEvents).values({
    userId: actorUserId,
    eventType,
    detail,
  });
}

export async function reviewVerificationRecord(input: {
  recordId: string;
  reviewerUserId: string;
  action: VerificationReviewAction;
  reason?: string;
  expiresInDays?: number;
}) {
  const reason = input.reason?.trim() || null;

  if ((input.action === "reject" || input.action === "revoke") && !reason) {
    throw new Error("REASON_REQUIRED");
  }

  const { db, end } = getDb();
  try {
    return await db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(verificationRecords)
        .where(eq(verificationRecords.id, input.recordId))
        .limit(1);

      if (!record) throw new Error("RECORD_NOT_FOUND");

      if (
        await reviewerIsSubjectMember(
          tx,
          input.reviewerUserId,
          record.entityType,
          record.entityId,
        )
      ) {
        throw new Error("CANNOT_REVIEW_OWN_SUBJECT");
      }

      const expectedStatus = input.action === "revoke" ? "verified" : "pending";
      const nextStatus =
        input.action === "approve"
          ? "verified"
          : input.action === "reject"
            ? "failed"
            : "revoked";

      const expiresAt =
        input.action === "approve" && input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
          : record.expiresAt;

      const [updated] = await tx
        .update(verificationRecords)
        .set({
          status: nextStatus,
          ...(input.action === "approve"
            ? {
                verifiedAt: new Date(),
                verifiedBy: input.reviewerUserId,
                expiresAt,
              }
            : {}),
          metadata: sql`
            COALESCE(${verificationRecords.metadata}, '{}'::jsonb)
            || ${JSON.stringify({
              reviewReason: reason,
              reviewedBy: input.reviewerUserId,
              action: input.action,
            })}::jsonb
          `,
        })
        .where(
          and(
            eq(verificationRecords.id, input.recordId),
            eq(verificationRecords.status, expectedStatus),
          ),
        )
        .returning();

      if (!updated) throw new Error("INVALID_VERIFICATION_TRANSITION");

      if (
        updated.entityType === "organization" &&
        privilegedOrganizationVerification(updated.type)
      ) {
        await syncOrganizationVerifiedAtTx(tx, updated.entityId);
      }

      await auditTx(tx, input.reviewerUserId, `VERIFICATION_${input.action.toUpperCase()}`, {
        recordId: updated.id,
        entityType: updated.entityType,
        entityId: updated.entityId,
        type: updated.type,
        fromStatus: expectedStatus,
        toStatus: nextStatus,
        reason,
      });

      return updated;
    });
  } finally {
    await end();
  }
}

export async function expireDueVerifications(actorUserId: string) {
  const { db, end } = getDb();
  try {
    return await db.transaction(async (tx) => {
      const expired = await tx
        .update(verificationRecords)
        .set({ status: "expired" })
        .where(
          and(
            eq(verificationRecords.status, "verified"),
            lte(verificationRecords.expiresAt, new Date()),
          ),
        )
        .returning();

      const organizationIds = new Set(
        expired
          .filter(
            (row) =>
              row.entityType === "organization" &&
              privilegedOrganizationVerification(row.type),
          )
          .map((row) => row.entityId),
      );

      for (const organizationId of organizationIds) {
        await syncOrganizationVerifiedAtTx(tx, organizationId);
      }

      if (expired.length > 0) {
        await auditTx(tx, actorUserId, "VERIFICATION_EXPIRE_BATCH", {
          count: expired.length,
          recordIds: expired.map((row) => row.id),
        });
      }

      return expired;
    });
  } finally {
    await end();
  }
}

export async function syncOrganizationVerifiedAt(organizationId: string) {
  const { db, end } = getDb();
  try {
    await db.transaction(async (tx) => {
      await syncOrganizationVerifiedAtTx(tx, organizationId);
    });
  } finally {
    await end();
  }
}
