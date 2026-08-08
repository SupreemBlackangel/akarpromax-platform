import type { EntityType, ReputationLevel } from "./common";

export interface ReputationProfile {
  readonly id: string;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly level: ReputationLevel;
  readonly score: number;
  readonly lastEvaluatedAt: Date | null;
  readonly policyVersion: number;
  readonly gracePeriodEndsAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ReputationSignals {
  readonly verification: number;
  readonly profileCompleteness: number;
  readonly responseRate: number;
  readonly completedJobs: number;
  readonly rating: number;
  readonly cancellationRate: number;
  readonly resolvedDisputes: number;
  readonly policyCompliance: number;
  readonly recentActivity: number;
  readonly total: number;
}

export interface ReputationEvaluation {
  readonly id: string;
  readonly reputationId: string;
  readonly policyVersion: number;
  readonly oldLevel: ReputationLevel;
  readonly newLevel: ReputationLevel;
  readonly signals: ReputationSignals;
  readonly reason: string;
  readonly evaluatedAt: Date;
  readonly adminOverride: boolean;
  readonly adminId: string | null;
}

export interface ReputationHistoryEntry {
  readonly id: string;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly oldLevel: ReputationLevel;
  readonly newLevel: ReputationLevel;
  readonly reason: string;
  readonly evaluatedAt: Date;
  readonly policyVersion: number;
}

export interface ReputationPolicy {
  readonly version: number;
  readonly label: string;
  readonly entityType: EntityType;
  readonly effectiveAt: Date;
  readonly signals: Record<string, number>;
  readonly thresholds: Record<ReputationLevel, number>;
  readonly evaluationWindowDays: number;
  readonly gracePeriodDays: number;
}

export function levelRank(level: ReputationLevel): number {
  const ranks: Record<ReputationLevel, number> = {
    new: 0,
    rising: 1,
    distinguished: 2,
    gold: 3,
    promax: 4,
  };
  return ranks[level];
}

export function isPromotion(oldLevel: ReputationLevel, newLevel: ReputationLevel): boolean {
  return levelRank(newLevel) > levelRank(oldLevel);
}

export function isDemotion(oldLevel: ReputationLevel, newLevel: ReputationLevel): boolean {
  return levelRank(newLevel) < levelRank(oldLevel);
}
