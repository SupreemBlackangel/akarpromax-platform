import type { AccountStatus } from "./common";

export interface AmrsUser {
  readonly id: string;
  readonly email: string;
  readonly emailVerifiedAt: Date | null;
  readonly phone: string | null;
  readonly phoneVerifiedAt: Date | null;
  readonly name: string;
  readonly role: string;
  readonly status: AccountStatus;
  readonly isActive: boolean;
  readonly preferredLanguage: string;
  readonly onboardingCompletedAt: Date | null;
  readonly lastLoginAt: Date | null;
  readonly createdAt: Date;
}

export interface AmrsUserContext {
  readonly user: AmrsUser;
  readonly hasProfessionalProfile: boolean;
  readonly organizationCount: number;
  readonly verificationSummary: VerificationSummary;
}

export interface VerificationSummary {
  readonly emailVerified: boolean;
  readonly phoneVerified: boolean;
  readonly identityVerified: boolean;
  readonly totalVerified: number;
  readonly totalTypes: number;
}
