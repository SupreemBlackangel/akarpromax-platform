export type EntityType = "user" | "professional" | "organization";

export type AccountStatus =
  | "pending_verification"
  | "active"
  | "disabled"
  | "suspended"
  | "deleted";

export type VerificationType =
  | "email"
  | "phone"
  | "identity"
  | "professional"
  | "organization"
  | "license"
  | "address";

export type VerificationStatus =
  | "pending"
  | "verified"
  | "failed"
  | "expired"
  | "revoked";

export type VerificationSource = "system" | "manual" | "third_party";

export type ReputationLevel =
  | "new"
  | "rising"
  | "distinguished"
  | "gold"
  | "promax";

export type ActivityLevel =
  | "active"
  | "recently_active"
  | "low_activity"
  | "inactive";

export type AvailabilityState = "available" | "limited" | "unavailable";

export type OrganizationType = "real_estate" | "business" | "other";

export type OrganizationClassification =
  | "startup"
  | "sme"
  | "established"
  | "enterprise";

export type OrganizationRole = "owner" | "admin" | "manager" | "agent" | "member";

export type MembershipStatus = "active" | "inactive" | "pending";

export type ProfessionalStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "suspended";

export type OrganizationStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "suspended"
  | "deleted";

export const REPUTATION_LEVELS: readonly ReputationLevel[] = [
  "new",
  "rising",
  "distinguished",
  "gold",
  "promax",
];

export const REPUTATION_THRESHOLDS: Record<ReputationLevel, { min: number; max: number }> = {
  new: { min: 0, max: 199 },
  rising: { min: 200, max: 449 },
  distinguished: { min: 450, max: 699 },
  gold: { min: 700, max: 899 },
  promax: { min: 900, max: 1000 },
};

export const VERIFICATION_EXPIRY_DEFAULTS: Record<VerificationType, number | null> = {
  email: null,
  phone: null,
  identity: 365,
  professional: 365,
  organization: 365,
  license: 365,
  address: null,
};

export const VERIFICATION_REPUTATION_BONUS: Record<VerificationType, number> = {
  email: 50,
  phone: 30,
  identity: 100,
  professional: 150,
  license: 100,
  organization: 100,
  address: 50,
};
