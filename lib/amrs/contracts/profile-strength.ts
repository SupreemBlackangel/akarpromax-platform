import type { EntityType } from "./common";

export interface ProfileStrength {
  readonly id: string;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly score: number;
  readonly completedFields: ReadonlyArray<string>;
  readonly missingFields: ReadonlyArray<string>;
  readonly evaluatedAt: Date;
}

export function computeProfileStrength(
  completedFields: ReadonlyArray<string>,
  requiredFields: ReadonlyArray<string>,
): number {
  if (requiredFields.length === 0) return 100;
  const completed = completedFields.filter((f) => requiredFields.includes(f)).length;
  return Math.round((completed / requiredFields.length) * 100);
}

export const REQUIRED_FIELDS_BY_ENTITY: Record<EntityType, ReadonlyArray<string>> = {
  user: ["name", "email", "phone"],
  professional: [
    "displayNameAr",
    "bioAr",
    "logoUrl",
    "phone",
    "countryCode",
    "cityId",
    "serviceRadiusKm",
  ],
  organization: ["nameAr", "type", "countryCode", "cityId", "descriptionAr"],
};
