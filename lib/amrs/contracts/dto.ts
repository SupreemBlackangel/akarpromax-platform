import type {
  ReputationLevel,
  OrganizationType,
  OrganizationClassification,
  OrganizationRole,
  ActivityLevel,
  AvailabilityState,
  VerificationType,
  VerificationStatus,
} from "./common";

export interface PublicUserSummary {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly cityId: string | null;
  readonly countryCode: string | null;
  readonly emailVerified: boolean;
  readonly phoneVerified: boolean;
  readonly activityLevel: ActivityLevel | null;
  readonly joinedAt: Date;
}

export interface PublicProfessionalSummary {
  readonly id: string;
  readonly userId: string;
  readonly displayName: string;
  readonly logoUrl: string | null;
  readonly bio: string | null;
  readonly countryCode: string;
  readonly cityId: string | null;
  readonly ratingAvg: number;
  readonly ratingCount: number;
  readonly jobsCompleted: number;
  readonly responseRate: number;
  readonly completionRate: number;
  readonly verificationSummary: ReadonlyArray<VerificationSummaryItem>;
  readonly reputationLevel: ReputationLevel;
  readonly availability: AvailabilityState | null;
  readonly activityLevel: ActivityLevel | null;
  readonly isBusiness: boolean;
  readonly businessName: string | null;
}

export interface PublicOrganizationSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly type: OrganizationType;
  readonly classification: OrganizationClassification;
  readonly logoUrl: string | null;
  readonly countryCode: string;
  readonly cityId: string | null;
  readonly memberCount: number;
  readonly verificationSummary: ReadonlyArray<VerificationSummaryItem>;
  readonly reputationLevel: ReputationLevel;
  readonly activityLevel: ActivityLevel | null;
}

export interface VerificationSummaryItem {
  readonly type: VerificationType;
  readonly status: VerificationStatus;
}

export interface PublicReputationSummary {
  readonly level: ReputationLevel;
  readonly displayLabel: string;
}

export interface PrivateReputationDetail {
  readonly level: ReputationLevel;
  readonly score: number;
  readonly displayLabel: string;
  readonly lastEvaluatedAt: Date | null;
  readonly policyVersion: number;
  readonly gracePeriodEndsAt: Date | null;
}

export interface PrivateVerificationDetail {
  readonly type: VerificationType;
  readonly status: VerificationStatus;
  readonly verifiedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly source: string;
  readonly countryCode: string | null;
}

export interface MembershipView {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly organizationSlug: string;
  readonly role: OrganizationRole;
  readonly status: string;
  readonly joinedAt: Date;
}

export function toPublicProfessionalSummary(
  profile: {
    id: string;
    userId: string;
    displayNameAr: string | null;
    displayNameEn: string | null;
    logoUrl: string | null;
    bioAr: string | null;
    bioEn: string | null;
    countryCode: string;
    cityId: string | null;
    ratingAvg: number;
    ratingCount: number;
    jobsCompleted: number;
    responseRate: number;
    completionRate: number;
    isBusiness: number | boolean;
    businessName: string | null;
  },
  level: ReputationLevel,
  verifications: ReadonlyArray<VerificationSummaryItem>,
  availability: AvailabilityState | null = null,
  activityLevel: ActivityLevel | null = null,
): PublicProfessionalSummary {
  return {
    id: profile.id,
    userId: profile.userId,
    displayName: profile.displayNameEn || profile.displayNameAr || "",
    logoUrl: profile.logoUrl,
    bio: profile.bioEn || profile.bioAr || null,
    countryCode: profile.countryCode,
    cityId: profile.cityId,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    jobsCompleted: profile.jobsCompleted,
    responseRate: profile.responseRate,
    completionRate: profile.completionRate,
    verificationSummary: verifications,
    reputationLevel: level,
    availability,
    activityLevel,
    isBusiness: profile.isBusiness === true || profile.isBusiness === 1,
    businessName: profile.businessName,
  };
}
