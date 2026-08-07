import { and, eq, gt, isNull } from "drizzle-orm";

import { verificationChallenges, type VerificationPurpose } from "@/lib/db/schema";
import { getDb } from "@/lib/db";

export type ChallengeRow = typeof verificationChallenges.$inferSelect;

export async function createVerificationChallenge(input: {
  userId: string;
  purpose: VerificationPurpose;
  channel?: "email" | "sms";
  destination: string;
  tokenHash?: string | null;
  codeHash?: string | null;
  expiresAt: Date;
}): Promise<ChallengeRow> {
  const { db, end } = getDb();
  try {
    const [row] = await db
      .insert(verificationChallenges)
      .values({
        userId: input.userId,
        purpose: input.purpose,
        channel: input.channel ?? "email",
        destination: input.destination,
        tokenHash: input.tokenHash ?? null,
        codeHash: input.codeHash ?? null,
        attempts: 0,
        expiresAt: input.expiresAt,
      })
      .returning();
    if (!row) throw new Error("AUTH_VERIFICATION_CREATE_FAILED");
    return row;
  } finally {
    await end();
  }
}

export async function findActiveChallengeByTokenHash(
  tokenHash: string,
  purpose: VerificationPurpose,
): Promise<ChallengeRow | null> {
  const { db, end } = getDb();
  try {
    const rows = await db
      .select()
      .from(verificationChallenges)
      .where(
        and(
          eq(verificationChallenges.tokenHash, tokenHash),
          eq(verificationChallenges.purpose, purpose),
          isNull(verificationChallenges.consumedAt),
          isNull(verificationChallenges.revokedAt),
          gt(verificationChallenges.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  } finally {
    await end();
  }
}

export async function findActiveChallengeByCodeHash(
  codeHash: string,
  purpose: VerificationPurpose,
): Promise<ChallengeRow | null> {
  const { db, end } = getDb();
  try {
    const rows = await db
      .select()
      .from(verificationChallenges)
      .where(
        and(
          eq(verificationChallenges.codeHash, codeHash),
          eq(verificationChallenges.purpose, purpose),
          isNull(verificationChallenges.consumedAt),
          isNull(verificationChallenges.revokedAt),
          gt(verificationChallenges.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  } finally {
    await end();
  }
}

export async function findChallengeById(id: string): Promise<ChallengeRow | null> {
  const { db, end } = getDb();
  try {
    const rows = await db.select().from(verificationChallenges).where(eq(verificationChallenges.id, id)).limit(1);
    return rows[0] ?? null;
  } finally {
    await end();
  }
}

export async function findLatestActiveOtpChallengeForUser(
  userId: string,
  purpose: VerificationPurpose,
): Promise<ChallengeRow | null> {
  const { db, end } = getDb();
  try {
    const rows = await db
      .select()
      .from(verificationChallenges)
      .where(
        and(
          eq(verificationChallenges.userId, userId),
          eq(verificationChallenges.purpose, purpose),
          isNull(verificationChallenges.consumedAt),
          isNull(verificationChallenges.revokedAt),
          gt(verificationChallenges.expiresAt, new Date()),
        ),
      )
      .orderBy(verificationChallenges.createdAt) // ASC; we take the last
      .limit(1);
    return rows[0] ?? null;
  } finally {
    await end();
  }
}

export async function incrementChallengeAttempts(id: string, attempts: number): Promise<void> {
  const { db, end } = getDb();
  try {
    await db.update(verificationChallenges).set({ attempts }).where(eq(verificationChallenges.id, id));
  } finally {
    await end();
  }
}

export async function consumeChallenge(id: string, at: Date = new Date()): Promise<void> {
  const { db, end } = getDb();
  try {
    await db
      .update(verificationChallenges)
      .set({ consumedAt: at })
      .where(eq(verificationChallenges.id, id));
  } finally {
    await end();
  }
}

export async function revokeChallenge(id: string, at: Date = new Date()): Promise<void> {
  const { db, end } = getDb();
  try {
    await db
      .update(verificationChallenges)
      .set({ revokedAt: at })
      .where(eq(verificationChallenges.id, id));
  } finally {
    await end();
  }
}

export async function revokeUserChallenges(
  userId: string,
  purpose: VerificationPurpose,
  at: Date = new Date(),
): Promise<void> {
  const { db, end } = getDb();
  try {
    await db
      .update(verificationChallenges)
      .set({ revokedAt: at, consumedAt: at })
      .where(
        and(
          eq(verificationChallenges.userId, userId),
          eq(verificationChallenges.purpose, purpose),
          isNull(verificationChallenges.consumedAt),
        ),
      );
  } finally {
    await end();
  }
}
