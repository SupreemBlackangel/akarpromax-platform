import { eq, and, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { reputationProfiles, reputationEvaluations, reputationHistory } from "@/lib/db/schema";
import type { EntityType, ReputationLevel } from "@/lib/amrs/contracts/common";
import { isPromotion, isDemotion } from "@/lib/amrs/contracts/reputation";

export interface ReputationProfileResult {
  id: string;
  entityType: string;
  entityId: string;
  level: string;
  score: number;
  lastEvaluatedAt: Date | null;
  policyVersion: number;
  gracePeriodEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReputationEvaluationResult {
  id: string;
  reputationId: string;
  policyVersion: number;
  oldLevel: string;
  newLevel: string;
  signals: Record<string, number>;
  reason: string;
  evaluatedAt: Date;
  adminOverride: boolean;
  adminId: string | null;
}

export interface ReputationHistoryResult {
  id: string;
  entityType: string;
  entityId: string;
  oldLevel: string;
  newLevel: string;
  reason: string;
  evaluatedAt: Date;
  policyVersion: number;
}

export interface EvaluationSignals {
  verification: number;
  profileCompleteness: number;
  responseRate: number;
  completedJobs: number;
  rating: number;
  cancellationRate: number;
  resolvedDisputes: number;
  policyCompliance: number;
  recentActivity: number;
}

const SIGNAL_WEIGHTS: Record<string, number> = {
  verification: 0.25,
  profileCompleteness: 0.15,
  responseRate: 0.20,
  completedJobs: 0.15,
  rating: 0.15,
  cancellationRate: -0.05,
  resolvedDisputes: 0.03,
  policyCompliance: 0.05,
  recentActivity: 0.02,
};

const LEVEL_THRESHOLDS: Record<ReputationLevel, number> = {
  new: 0,
  rising: 200,
  distinguished: 450,
  gold: 700,
  promax: 900,
};

export function computeScore(signals: EvaluationSignals): number {
  let raw = 0;
  for (const [key, weight] of Object.entries(SIGNAL_WEIGHTS)) {
    const value = (signals as unknown as Record<string, number>)[key] ?? 0;
    raw += value * weight;
  }
  return Math.max(0, Math.min(1000, Math.round(raw)));
}

export function scoreToLevel(score: number): ReputationLevel {
  if (score >= LEVEL_THRESHOLDS.promax) return "promax";
  if (score >= LEVEL_THRESHOLDS.gold) return "gold";
  if (score >= LEVEL_THRESHOLDS.distinguished) return "distinguished";
  if (score >= LEVEL_THRESHOLDS.rising) return "rising";
  return "new";
}

export async function getReputationProfile(
  entityType: EntityType,
  entityId: string,
): Promise<ReputationProfileResult | null> {
  const { db, end } = getDb();
  try {
    const [profile] = await db
      .select()
      .from(reputationProfiles)
      .where(
        and(
          eq(reputationProfiles.entityType, entityType),
          eq(reputationProfiles.entityId, entityId),
        ),
      )
      .limit(1);
    return (profile as ReputationProfileResult) ?? null;
  } finally {
    await end();
  }
}

export async function ensureReputationProfile(
  entityType: EntityType,
  entityId: string,
): Promise<ReputationProfileResult> {
  const existing = await getReputationProfile(entityType, entityId);
  if (existing) return existing;

  const { db, end } = getDb();
  try {
    const [profile] = await db
      .insert(reputationProfiles)
      .values({
        entityType,
        entityId,
        level: "new",
        score: 0,
        policyVersion: 1,
      })
      .returning();
    return profile as ReputationProfileResult;
  } finally {
    await end();
  }
}

export async function evaluateReputation(
  entityType: EntityType,
  entityId: string,
  signals: EvaluationSignals,
  reason: string = "scheduled_evaluation",
  adminOverride: boolean = false,
  adminId?: string,
): Promise<{
  profile: ReputationProfileResult;
  evaluation: ReputationEvaluationResult;
  promoted: boolean;
  demoted: boolean;
}> {
  const profile = await ensureReputationProfile(entityType, entityId);
  const score = computeScore(signals);
  const newLevel = scoreToLevel(score);
  const oldLevel = profile.level as ReputationLevel;

  const { db, end } = getDb();
  try {
    const [evaluation] = await db
      .insert(reputationEvaluations)
      .values({
        reputationId: profile.id,
        policyVersion: profile.policyVersion,
        oldLevel,
        newLevel,
        signals: signals as unknown as Record<string, unknown>,
        reason,
        adminOverride,
        adminId: adminId ?? null,
      })
      .returning();

    const promoted = isPromotion(oldLevel, newLevel);
    const demoted = isDemotion(oldLevel, newLevel);

    if (promoted || demoted) {
      await db.insert(reputationHistory).values({
        entityType,
        entityId,
        oldLevel,
        newLevel,
        reason,
        policyVersion: profile.policyVersion,
      });

      await db
        .update(reputationProfiles)
        .set({
          level: newLevel,
          score,
          lastEvaluatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reputationProfiles.id, profile.id));
    } else {
      await db
        .update(reputationProfiles)
        .set({
          score,
          lastEvaluatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reputationProfiles.id, profile.id));
    }

    const updatedProfile = await getReputationProfile(entityType, entityId);

    return {
      profile: updatedProfile!,
      evaluation: evaluation as ReputationEvaluationResult,
      promoted,
      demoted,
    };
  } finally {
    await end();
  }
}

export async function manualOverride(
  entityType: EntityType,
  entityId: string,
  targetLevel: ReputationLevel,
  reason: string,
  adminId: string,
): Promise<ReputationProfileResult> {
  const profile = await ensureReputationProfile(entityType, entityId);
  const oldLevel = profile.level as ReputationLevel;

  const { db, end } = getDb();
  try {
    await db.insert(reputationEvaluations).values({
      reputationId: profile.id,
      policyVersion: profile.policyVersion,
      oldLevel,
      newLevel: targetLevel,
      signals: { manual: 1000 } as unknown as Record<string, unknown>,
      reason,
      adminOverride: true,
      adminId,
    });

    await db.insert(reputationHistory).values({
      entityType,
      entityId,
      oldLevel,
      newLevel: targetLevel,
      reason,
      policyVersion: profile.policyVersion,
    });

    await db
      .update(reputationProfiles)
      .set({ level: targetLevel, updatedAt: new Date() })
      .where(eq(reputationProfiles.id, profile.id));

    return (await getReputationProfile(entityType, entityId))!;
  } finally {
    await end();
  }
}

export async function getReputationHistory(
  entityType: EntityType,
  entityId: string,
): Promise<ReputationHistoryResult[]> {
  const { db, end } = getDb();
  try {
    const rows = await db
      .select()
      .from(reputationHistory)
      .where(
        and(
          eq(reputationHistory.entityType, entityType),
          eq(reputationHistory.entityId, entityId),
        ),
      );
    return rows as ReputationHistoryResult[];
  } finally {
    await end();
  }
}

export async function getReputationDistribution(): Promise<Record<string, number>> {
  const { db, end } = getDb();
  try {
    const rows = await db
      .select({
        level: reputationProfiles.level,
        count: sql<number>`count(*)::int`,
      })
      .from(reputationProfiles)
      .groupBy(reputationProfiles.level);

    const dist: Record<string, number> = { new: 0, rising: 0, distinguished: 0, gold: 0, promax: 0 };
    for (const row of rows) {
      dist[row.level] = row.count;
    }
    return dist;
  } finally {
    await end();
  }
}
