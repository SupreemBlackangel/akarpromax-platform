import type {
  OrganizationType,
  OrganizationClassification,
  OrganizationStatus,
  OrganizationRole,
  MembershipStatus,
} from "./common";

export interface Organization {
  readonly id: string;
  readonly nameAr: string | null;
  readonly nameEn: string | null;
  readonly nameTr: string | null;
  readonly slug: string;
  readonly type: OrganizationType;
  readonly classification: OrganizationClassification;
  readonly countryCode: string;
  readonly cityId: string | null;
  readonly districtId: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly logoUrl: string | null;
  readonly coverUrl: string | null;
  readonly descriptionAr: string | null;
  readonly descriptionEn: string | null;
  readonly descriptionTr: string | null;
  readonly websiteUrl: string | null;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly status: OrganizationStatus;
  readonly verifiedAt: Date | null;
  readonly approvedAt: Date | null;
  readonly suspendedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface OrganizationMembership {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly role: OrganizationRole;
  readonly status: MembershipStatus;
  readonly joinedAt: Date;
  readonly invitedBy: string | null;
}

export interface OrganizationBranch {
  readonly id: string;
  readonly organizationId: string;
  readonly nameAr: string | null;
  readonly nameEn: string | null;
  readonly countryCode: string;
  readonly cityId: string | null;
  readonly districtId: string | null;
  readonly governorate: string | null;
  readonly village: string | null;
  readonly street: string | null;
  readonly addressAr: string | null;
  readonly addressEn: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly status: "active" | "inactive";
  readonly workingHours: Record<string, unknown> | null;
  readonly serviceAreas: string[] | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
