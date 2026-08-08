import type { EntityType, ReputationLevel, VerificationType, VerificationStatus } from "./common";

export interface ReputationChangedEvent {
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly oldLevel: ReputationLevel;
  readonly newLevel: ReputationLevel;
  readonly oldScore: number;
  readonly newScore: number;
  readonly policyVersion: number;
  readonly evaluatedAt: Date;
}

export interface VerificationStatusChangedEvent {
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly verificationType: VerificationType;
  readonly oldStatus: VerificationStatus;
  readonly newStatus: VerificationStatus;
  readonly changedAt: Date;
}

export interface OrganizationCreatedEvent {
  readonly organizationId: string;
  readonly ownerId: string;
  readonly type: string;
  readonly name: string;
  readonly createdAt: Date;
}

export interface MembershipChangedEvent {
  readonly organizationId: string;
  readonly userId: string;
  readonly role: string;
  readonly status: string;
  readonly changedAt: Date;
}

export interface ProfileUpdatedEvent {
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly updatedFields: ReadonlyArray<string>;
  readonly updatedAt: Date;
}
