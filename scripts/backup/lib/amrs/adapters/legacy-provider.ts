import type { ProfessionalProfile, LegacyServiceProvider } from "../contracts/professional";
import type { PublicProfessionalSummary, VerificationSummaryItem } from "../contracts/dto";
import type { ReputationLevel } from "../contracts/common";

export function adaptLegacyServiceProviderToProfessional(
  legacy: LegacyServiceProvider,
): ProfessionalProfile {
  return {
    id: legacy.id,
    userId: legacy.userId,
    displayNameAr: legacy.displayNameAr,
    displayNameEn: legacy.displayNameEn,
    bioAr: legacy.bioAr,
    bioEn: legacy.bioEn,
    logoUrl: legacy.logoUrl,
    coverUrl: legacy.coverUrl,
    phone: legacy.phone,
    whatsapp: legacy.whatsapp,
    email: legacy.email,
    website: legacy.website,
    countryCode: legacy.countryCode,
    cityId: legacy.cityId,
    districtId: legacy.districtId,
    governorate: legacy.governorate,
    latitude: legacy.latitude,
    longitude: legacy.longitude,
    serviceRadiusKm: legacy.serviceRadiusKm,
    status: legacy.status,
    verifiedAt: legacy.verifiedAt,
    approvedAt: legacy.approvedAt,
    suspendedAt: legacy.suspendedAt,
    rejectionReason: legacy.rejectionReason,
    ratingAvg: legacy.ratingAvg,
    ratingCount: legacy.ratingCount,
    jobsCompleted: legacy.jobsCompleted,
    completionRate: legacy.completionRate,
    responseRate: legacy.responseRate,
    avgResponseTimeMin: legacy.avgResponseTimeMin,
    licensesText: legacy.licensesText,
    insuranceText: legacy.insuranceText,
    foundedYear: legacy.foundedYear,
    teamSize: legacy.teamSize,
    isBusiness: legacy.isBusiness === true || legacy.isBusiness === 1,
    businessName: legacy.businessName,
    taxNumber: legacy.taxNumber,
    commercialRegistration: legacy.commercialRegistration,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
  };
}

export function adaptLegacyToPublicSummary(
  legacy: LegacyServiceProvider,
  level: ReputationLevel,
  verifications: ReadonlyArray<VerificationSummaryItem>,
): PublicProfessionalSummary {
  return {
    id: legacy.id,
    userId: legacy.userId,
    displayName: legacy.displayNameEn || legacy.displayNameAr || "",
    logoUrl: legacy.logoUrl,
    bio: legacy.bioEn || legacy.bioAr || null,
    countryCode: legacy.countryCode,
    cityId: legacy.cityId,
    ratingAvg: legacy.ratingAvg,
    ratingCount: legacy.ratingCount,
    jobsCompleted: legacy.jobsCompleted,
    responseRate: legacy.responseRate,
    completionRate: legacy.completionRate,
    verificationSummary: verifications,
    reputationLevel: level,
    availability: null,
    activityLevel: null,
    isBusiness: legacy.isBusiness === true || legacy.isBusiness === 1,
    businessName: legacy.businessName,
  };
}

export function isLegacyServiceProvider(value: unknown): value is LegacyServiceProvider {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.userId === "string" &&
    typeof obj.countryCode === "string" &&
    typeof obj.status === "string" &&
    "ratingAvg" in obj &&
    "jobsCompleted" in obj
  );
}

export function ensureProfessionalProfile(
  value: unknown,
  context: string,
): ProfessionalProfile {
  if (!isLegacyServiceProvider(value)) {
    throw new Error(
      `Invalid ProfessionalProfile in ${context}: expected LegacyServiceProvider shape`,
    );
  }
  return adaptLegacyServiceProviderToProfessional(value as LegacyServiceProvider);
}
