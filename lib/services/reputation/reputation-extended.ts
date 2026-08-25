import { db } from '@/lib/db';
import { reputationProfiles, reputationEvaluations, reputationHistory } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '@/lib/logging/logger';

export type ReputationLevel = 'new' | 'rising' | 'distinguished' | 'gold' | 'promax';

export const REPUTATION_THRESHOLDS: Record<ReputationLevel, number> = {
  new: 0,
  rising: 100,
  distinguished: 300,
  gold: 600,
  promax: 1000,
};

export const LEVEL_ORDER: ReputationLevel[] = ['new', 'rising', 'distinguished', 'gold', 'promax'];

export async function getReputationProfile(entityType: string, entityId: string) {
  const results = await db.select().from(reputationProfiles)
    .where(
      and(
        eq(reputationProfiles.entityType, entityType),
        eq(reputationProfiles.entityId, entityId),
      ),
    ).limit(1);
  return results[0] ?? null;
}

export async function createReputationProfile(entityType: string, entityId: string) {
  const results = await db.insert(reputationProfiles).values({
    entityType,
    entityId,
    score: 0,
    level: 'new',
  }).returning();
  return results[0];
}

export async function addReputationEvaluation(data: {
  profileId: string;
  oldLevel: string;
  newLevel: string;
  signals: Record<string, unknown>;
  reason?: string;
  policyVersion?: number;
  adminOverride?: boolean;
  adminId?: string;
}) {
  const results = await db.insert(reputationEvaluations).values({
    reputationId: data.profileId,
    policyVersion: data.policyVersion ?? 1,
    oldLevel: data.oldLevel,
    newLevel: data.newLevel,
    signals: data.signals,
    reason: data.reason ?? null,
    adminOverride: data.adminOverride ?? false,
    adminId: data.adminId ?? null,
  }).returning();

  const profile = await db.select().from(reputationProfiles)
    .where(eq(reputationProfiles.id, data.profileId)).limit(1);

  if (profile[0]) {
    await db.update(reputationProfiles).set({
      level: data.newLevel,
      lastEvaluatedAt: new Date(),
    }).where(eq(reputationProfiles.id, data.profileId));

    if (data.newLevel !== data.oldLevel) {
      await db.insert(reputationHistory).values({
        entityType: profile[0].entityType,
        entityId: profile[0].entityId,
        oldLevel: data.oldLevel,
        newLevel: data.newLevel,
        reason: data.reason ?? null,
        policyVersion: data.policyVersion ?? 1,
      });
    }
  }

  return results[0];
}

export async function getReputationHistory(entityType: string, entityId: string, limit: number = 50) {
  return db.select().from(reputationHistory)
    .where(
      and(
        eq(reputationHistory.entityType, entityType),
        eq(reputationHistory.entityId, entityId),
      ),
    )
    .orderBy(desc(reputationHistory.evaluatedAt))
    .limit(limit);
}

export async function getReputationEvaluations(profileId: string, limit: number = 50) {
  return db.select().from(reputationEvaluations)
    .where(eq(reputationEvaluations.reputationId, profileId))
    .orderBy(desc(reputationEvaluations.evaluatedAt))
    .limit(limit);
}

export function calculateLevel(score: number): ReputationLevel {
  let level: ReputationLevel = 'new';
  for (const [l, threshold] of Object.entries(REPUTATION_THRESHOLDS) as [ReputationLevel, number][]) {
    if (score >= threshold) level = l;
  }
  return level;
}

export function getNextLevel(currentLevel: ReputationLevel): ReputationLevel | null {
  const idx = LEVEL_ORDER.indexOf(currentLevel);
  if (idx < 0 || idx >= LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[idx + 1];
}

export function getProgressToNextLevel(score: number, currentLevel: ReputationLevel): { progress: number; needed: number; nextLevel: ReputationLevel | null } {
  const nextLevel = getNextLevel(currentLevel);
  if (!nextLevel) return { progress: 100, needed: 0, nextLevel: null };
  const currentThreshold = REPUTATION_THRESHOLDS[currentLevel];
  const nextThreshold = REPUTATION_THRESHOLDS[nextLevel];
  const range = nextThreshold - currentThreshold;
  const progress = Math.min(((score - currentThreshold) / range) * 100, 100);
  return { progress, needed: nextThreshold - score, nextLevel };
}

export async function getLeaderboard(entityType: string, limit: number = 20) {
  return db.select().from(reputationProfiles)
    .where(eq(reputationProfiles.entityType, entityType))
    .orderBy(desc(reputationProfiles.score))
    .limit(limit);
}

export async function updateProfileScore(profileId: string, score: number) {
  const level = calculateLevel(score);
  await db.update(reputationProfiles)
    .set({ score, level, updatedAt: new Date() })
    .where(eq(reputationProfiles.id, profileId));
  return true;
}
