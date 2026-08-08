import type { EntityType, ActivityLevel } from "./common";

export interface ActivityState {
  readonly id: string;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly state: ActivityLevel;
  readonly lastMeaningfulActionAt: Date | null;
  readonly lastLoginAt: Date | null;
  readonly actionCount30d: number;
  readonly evaluatedAt: Date;
  readonly windowDays: number;
}

export interface ActivityWindowConfig {
  readonly activeDays: number;
  readonly recentlyActiveDays: number;
  readonly lowActivityDays: number;
  readonly inactiveDays: number;
}

export const DEFAULT_ACTIVITY_WINDOWS: ActivityWindowConfig = {
  activeDays: 14,
  recentlyActiveDays: 30,
  lowActivityDays: 90,
  inactiveDays: 180,
};

export function evaluateActivityLevel(
  lastActionAt: Date | null,
  actionCount30d: number,
  config: ActivityWindowConfig = DEFAULT_ACTIVITY_WINDOWS,
): ActivityLevel {
  if (!lastActionAt) return "inactive";

  const daysSinceLastAction = Math.floor(
    (Date.now() - lastActionAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceLastAction <= config.activeDays && actionCount30d >= 5) return "active";
  if (daysSinceLastAction <= config.recentlyActiveDays) return "recently_active";
  if (daysSinceLastAction <= config.lowActivityDays) return "low_activity";
  return "inactive";
}
