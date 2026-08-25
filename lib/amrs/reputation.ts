import { eq, and, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { reputationProfiles, reputationEvaluations, reputationHistory } from "@/lib/db/schema";
import type { EntityType, ReputationLevel, OrganizationType } from "@/lib/amrs/contracts/common";
import { isPromotion, isDemotion, levelRank } from "@/lib/amrs/contracts/reputation";

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
  options?: { organizationType?: OrganizationType },
): Promise<{
  profile: ReputationProfileResult;
  evaluation: ReputationEvaluationResult;
  promoted: boolean;
  demoted: boolean;
}> {
  const profile = await ensureReputationProfile(entityType, entityId);
  const policy = getPolicy(entityType, options?.organizationType);
  const score = computeScoreWithPolicy(signals, policy);
  const computedLevel = scoreToLevelWithPolicy(score, policy);
  const promaxCheck = computedLevel === "promax" ? isEligibleForPromax(signals, policy) : { eligible: true, reasons: [] as string[] };
  const newLevel = computedLevel === "promax" && !promaxCheck.eligible ? "gold" : computedLevel;
  const oldLevel = profile.level as ReputationLevel;
  const gracePeriodEndsAt = shouldApplyGracePeriod(oldLevel, newLevel, policy)
    ? getGracePeriodEndsAt(policy)
    : null;

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
          gracePeriodEndsAt,
          lastEvaluatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reputationProfiles.id, profile.id));
    } else {
      await db
        .update(reputationProfiles)
        .set({
          score,
          gracePeriodEndsAt,
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

// ─── AMRS-5: Reputation Policy Engine ──────────────────────────────

export interface ReputationPolicy {
  readonly entityType: EntityType;
  readonly organizationType?: OrganizationType;
  readonly signalWeights: Record<string, number>;
  readonly levelThresholds: Record<ReputationLevel, number>;
  readonly minJobsForPromotion: number;
  readonly maxDemotionGraceDays: number;
  readonly promaxRequires: PromaxRequirement;
}

export interface PromaxRequirement {
  readonly minVerificationScore: number;
  readonly minCompletedJobs: number;
  readonly minRating: number;
  readonly minProfileCompleteness: number;
}

const PROFESSIONAL_POLICY: ReputationPolicy = {
  entityType: "professional",
  signalWeights: {
    verification: 0.25,
    profileCompleteness: 0.15,
    responseRate: 0.20,
    completedJobs: 0.15,
    rating: 0.15,
    cancellationRate: -0.05,
    resolvedDisputes: 0.03,
    policyCompliance: 0.05,
    recentActivity: 0.02,
  },
  levelThresholds: { new: 0, rising: 200, distinguished: 450, gold: 700, promax: 900 },
  minJobsForPromotion: 5,
  maxDemotionGraceDays: 30,
  promaxRequires: {
    minVerificationScore: 80,
    minCompletedJobs: 50,
    minRating: 400,
    minProfileCompleteness: 90,
  },
};

const REAL_ESTATE_ORG_POLICY: ReputationPolicy = {
  entityType: "organization",
  organizationType: "real_estate",
  signalWeights: {
    verification: 0.30,
    profileCompleteness: 0.10,
    responseRate: 0.15,
    completedJobs: 0.20,
    rating: 0.10,
    cancellationRate: -0.05,
    resolvedDisputes: 0.03,
    policyCompliance: 0.05,
    recentActivity: 0.02,
  },
  levelThresholds: { new: 0, rising: 180, distinguished: 420, gold: 680, promax: 880 },
  minJobsForPromotion: 10,
  maxDemotionGraceDays: 45,
  promaxRequires: {
    minVerificationScore: 90,
    minCompletedJobs: 100,
    minRating: 420,
    minProfileCompleteness: 85,
  },
};

const BUSINESS_ORG_POLICY: ReputationPolicy = {
  entityType: "organization",
  organizationType: "business",
  signalWeights: {
    verification: 0.20,
    profileCompleteness: 0.10,
    responseRate: 0.15,
    completedJobs: 0.20,
    rating: 0.15,
    cancellationRate: -0.05,
    resolvedDisputes: 0.05,
    policyCompliance: 0.08,
    recentActivity: 0.02,
  },
  levelThresholds: { new: 0, rising: 190, distinguished: 430, gold: 690, promax: 890 },
  minJobsForPromotion: 8,
  maxDemotionGraceDays: 30,
  promaxRequires: {
    minVerificationScore: 85,
    minCompletedJobs: 75,
    minRating: 400,
    minProfileCompleteness: 80,
  },
};

const USER_POLICY: ReputationPolicy = {
  entityType: "user",
  signalWeights: {
    verification: 0.30,
    profileCompleteness: 0.20,
    responseRate: 0.15,
    completedJobs: 0.10,
    rating: 0.10,
    cancellationRate: -0.03,
    resolvedDisputes: 0.02,
    policyCompliance: 0.05,
    recentActivity: 0.05,
  },
  levelThresholds: { new: 0, rising: 200, distinguished: 450, gold: 700, promax: 900 },
  minJobsForPromotion: 0,
  maxDemotionGraceDays: 14,
  promaxRequires: {
    minVerificationScore: 90,
    minCompletedJobs: 0,
    minRating: 450,
    minProfileCompleteness: 95,
  },
};

const POLICIES: Record<string, ReputationPolicy> = {
  "professional": PROFESSIONAL_POLICY,
  "organization:real_estate": REAL_ESTATE_ORG_POLICY,
  "organization:business": BUSINESS_ORG_POLICY,
  "organization:law_office": BUSINESS_ORG_POLICY,
  "organization:other": BUSINESS_ORG_POLICY,
  "user": USER_POLICY,
};

export function getPolicy(entityType: EntityType, organizationType?: OrganizationType): ReputationPolicy {
  if (entityType === "organization" && organizationType) {
    return POLICIES[`organization:${organizationType}`] ?? BUSINESS_ORG_POLICY;
  }
  return POLICIES[entityType] ?? USER_POLICY;
}

export function computeScoreWithPolicy(
  signals: EvaluationSignals,
  policy: ReputationPolicy,
): number {
  const normalized = normalizeSignalsForPolicy(signals, policy);
  let weighted = 0;
  for (const [key, weight] of Object.entries(policy.signalWeights)) {
    const value = normalized[key] ?? 0;
    weighted += (value / 100) * weight;
  }
  return Math.max(0, Math.min(1000, Math.round(weighted * 1000)));
}

function normalizeSignalsForPolicy(
  signals: EvaluationSignals,
  policy: ReputationPolicy,
): Record<string, number> {
  const normalizePercent = (value: number) => Math.max(0, Math.min(100, value));
  const normalizeRelative = (value: number, max: number) => {
    if (!Number.isFinite(max) || max <= 0) return 0;
    return Math.max(0, Math.min(100, (value / max) * 100));
  };

  return {
    verification: normalizePercent(signals.verification),
    profileCompleteness: normalizePercent(signals.profileCompleteness),
    responseRate: normalizePercent(signals.responseRate),
    completedJobs: normalizeRelative(signals.completedJobs, Math.max(policy.minJobsForPromotion, policy.promaxRequires.minCompletedJobs, 1)),
    rating: normalizeRelative(signals.rating, Math.max(policy.promaxRequires.minRating, 1)),
    cancellationRate: normalizePercent(signals.cancellationRate),
    resolvedDisputes: normalizePercent(signals.resolvedDisputes),
    policyCompliance: normalizePercent(signals.policyCompliance),
    recentActivity: normalizePercent(signals.recentActivity),
  };
}

export function scoreToLevelWithPolicy(
  score: number,
  policy: ReputationPolicy,
): ReputationLevel {
  const t = policy.levelThresholds;
  if (score >= t.promax) return "promax";
  if (score >= t.gold) return "gold";
  if (score >= t.distinguished) return "distinguished";
  if (score >= t.rising) return "rising";
  return "new";
}

export function isEligibleForPromax(
  signals: EvaluationSignals,
  policy: ReputationPolicy,
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const req = policy.promaxRequires;

  if (signals.verification < req.minVerificationScore) {
    reasons.push(`verification score ${signals.verification} < ${req.minVerificationScore}`);
  }
  if (signals.completedJobs < req.minCompletedJobs) {
    reasons.push(`completed jobs ${signals.completedJobs} < ${req.minCompletedJobs}`);
  }
  if (signals.rating < req.minRating) {
    reasons.push(`rating ${signals.rating} < ${req.minRating}`);
  }
  if (signals.profileCompleteness < req.minProfileCompleteness) {
    reasons.push(`profile completeness ${signals.profileCompleteness} < ${req.minProfileCompleteness}`);
  }

  return { eligible: reasons.length === 0, reasons };
}

export function shouldApplyGracePeriod(
  oldLevel: ReputationLevel,
  newLevel: ReputationLevel,
  policy: ReputationPolicy,
): boolean {
  if (!isDemotion(oldLevel, newLevel)) return false;
  const rankDiff = levelRank(oldLevel) - levelRank(newLevel);
  return rankDiff <= 1 && policy.maxDemotionGraceDays > 0;
}

export function getGracePeriodEndsAt(
  policy: ReputationPolicy,
  demotedAt: Date = new Date(),
): Date {
  return new Date(demotedAt.getTime() + policy.maxDemotionGraceDays * 24 * 60 * 60 * 1000);
}

export interface LevelExplanation {
  level: ReputationLevel;
  score: number;
  policy: string;
  signalBreakdown: { signal: string; value: number; weight: number; contribution: number }[];
  isPromotion: boolean;
  isDemotion: boolean;
  inGracePeriod: boolean;
  gracePeriodEndsAt: Date | null;
}

export function explainLevel(
  entityType: EntityType,
  organizationType: OrganizationType | undefined,
  signals: EvaluationSignals,
  previousLevel: ReputationLevel | null,
  gracePeriodEndsAt: Date | null,
): LevelExplanation {
  const policy = getPolicy(entityType, organizationType);
  const normalized = normalizeSignalsForPolicy(signals, policy);
  const score = computeScoreWithPolicy(signals, policy);
  const level = scoreToLevelWithPolicy(score, policy);

  const signalBreakdown = Object.entries(policy.signalWeights).map(([signal, weight]) => ({
    signal,
    value: (signals as unknown as Record<string, number>)[signal] ?? 0,
    weight,
    contribution: Math.round(((normalized[signal] ?? 0) / 100) * weight * 1000),
  }));

  const promoted = previousLevel ? isPromotion(previousLevel, level) : false;
  const demoted = previousLevel ? isDemotion(previousLevel, level) : false;
  const inGracePeriod = gracePeriodEndsAt ? gracePeriodEndsAt.getTime() > Date.now() : false;

  return {
    level,
    score,
    policy: `${entityType}${organizationType ? `:${organizationType}` : ""}`,
    signalBreakdown,
    isPromotion: promoted,
    isDemotion: demoted,
    inGracePeriod,
    gracePeriodEndsAt,
  };
}
