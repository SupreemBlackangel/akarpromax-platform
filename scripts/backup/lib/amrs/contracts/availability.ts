import type { EntityType, AvailabilityState as AvailabilityStateType } from "./common";

export interface AvailabilityRecord {
  readonly id: string;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly state: AvailabilityStateType;
  readonly reason: string | null;
  readonly updatedAt: Date;
  readonly updatedBy: string | null;
}

export const VALID_AVAILABILITY_ENTITY_TYPES: readonly EntityType[] = [
  "professional",
  "organization",
];
