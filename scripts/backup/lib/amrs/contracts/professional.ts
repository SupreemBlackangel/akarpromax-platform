import type { ProfessionalStatus } from "./common";

export interface ProfessionalProfile {
  readonly id: string;
  readonly userId: string;
  readonly displayNameAr: string | null;
  readonly displayNameEn: string | null;
  readonly bioAr: string | null;
  readonly bioEn: string | null;
  readonly logoUrl: string | null;
  readonly coverUrl: string | null;
  readonly phone: string | null;
  readonly whatsapp: string | null;
  readonly email: string | null;
  readonly website: string | null;
  readonly countryCode: string;
  readonly cityId: string | null;
  readonly districtId: string | null;
  readonly governorate: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly serviceRadiusKm: number;
  readonly status: ProfessionalStatus;
  readonly verifiedAt: Date | null;
  readonly approvedAt: Date | null;
  readonly suspendedAt: Date | null;
  readonly rejectionReason: string | null;
  readonly ratingAvg: number;
  readonly ratingCount: number;
  readonly jobsCompleted: number;
  readonly completionRate: number;
  readonly responseRate: number;
  readonly avgResponseTimeMin: number | null;
  readonly licensesText: string | null;
  readonly insuranceText: string | null;
  readonly foundedYear: number | null;
  readonly teamSize: number | null;
  readonly isBusiness: boolean;
  readonly businessName: string | null;
  readonly taxNumber: string | null;
  readonly commercialRegistration: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface LegacyServiceProvider extends Omit<ProfessionalProfile, "isBusiness"> {
  readonly isBusiness: boolean | number;
}
