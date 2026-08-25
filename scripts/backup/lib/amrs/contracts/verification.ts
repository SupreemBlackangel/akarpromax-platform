import type {
  EntityType,
  VerificationType,
  VerificationStatus,
  VerificationSource,
} from "./common";

export interface VerificationRecord {
  readonly id: string;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly type: VerificationType;
  readonly status: VerificationStatus;
  readonly verifiedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly verifiedBy: string | null;
  readonly source: VerificationSource;
  readonly countryCode: string | null;
  readonly documentUrl: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: Date;
}

export interface VerificationSummaryByType {
  readonly type: VerificationType;
  readonly status: VerificationStatus;
  readonly verifiedAt: Date | null;
  readonly expiresAt: Date | null;
}

export interface EntityVerificationSummary {
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly records: ReadonlyArray<VerificationSummaryByType>;
  readonly verifiedCount: number;
  readonly totalCount: number;
}
