import type { EntityType } from "@/lib/amrs/contracts/common";

export interface ProfileField {
  readonly key: string;
  readonly label: string;
  readonly weight: number;
  readonly required: boolean;
}

export interface ProfileCompletenessResult {
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly score: number;
  readonly filledFields: string[];
  readonly missingFields: string[];
  readonly requiredMissing: string[];
  readonly fieldDetails: FieldDetail[];
}

export interface FieldDetail {
  readonly key: string;
  readonly label: string;
  readonly weight: number;
  readonly required: boolean;
  readonly filled: boolean;
}

const PROFESSIONAL_FIELDS: ProfileField[] = [
  { key: "displayNameEn", label: "English Name", weight: 15, required: true },
  { key: "displayNameAr", label: "Arabic Name", weight: 10, required: false },
  { key: "phone", label: "Phone", weight: 10, required: true },
  { key: "email", label: "Email", weight: 10, required: true },
  { key: "bioEn", label: "English Bio", weight: 10, required: false },
  { key: "countryCode", label: "Country", weight: 10, required: true },
  { key: "cityId", label: "City", weight: 8, required: false },
  { key: "logoUrl", label: "Logo", weight: 7, required: false },
  { key: "coverUrl", label: "Cover Image", weight: 5, required: false },
  { key: "serviceRadiusKm", label: "Service Radius", weight: 5, required: false },
  { key: "licensesText", label: "Licenses", weight: 5, required: false },
  { key: "insuranceText", label: "Insurance", weight: 5, required: false },
];

const ORGANIZATION_FIELDS: ProfileField[] = [
  { key: "nameEn", label: "English Name", weight: 15, required: true },
  { key: "nameAr", label: "Arabic Name", weight: 10, required: false },
  { key: "type", label: "Type", weight: 10, required: true },
  { key: "classification", label: "Classification", weight: 10, required: true },
  { key: "countryCode", label: "Country", weight: 10, required: true },
  { key: "descriptionEn", label: "English Description", weight: 10, required: false },
  { key: "contactEmail", label: "Contact Email", weight: 8, required: false },
  { key: "contactPhone", label: "Contact Phone", weight: 8, required: false },
  { key: "websiteUrl", label: "Website", weight: 7, required: false },
  { key: "cityId", label: "City", weight: 6, required: false },
  { key: "latitude", label: "Location", weight: 6, required: false },
];

const USER_FIELDS: ProfileField[] = [
  { key: "name", label: "Name", weight: 20, required: true },
  { key: "email", label: "Email", weight: 20, required: true },
  { key: "phone", label: "Phone", weight: 15, required: false },
  { key: "avatar", label: "Avatar", weight: 15, required: false },
  { key: "countryCode", label: "Country", weight: 15, required: false },
  { key: "cityId", label: "City", weight: 15, required: false },
];

function getFieldsForEntityType(entityType: EntityType): ProfileField[] {
  switch (entityType) {
    case "professional":
      return PROFESSIONAL_FIELDS;
    case "organization":
      return ORGANIZATION_FIELDS;
    case "user":
      return USER_FIELDS;
  }
}

function isFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (typeof value === "boolean") return true;
  return false;
}

export function computeProfileCompleteness(
  entityType: EntityType,
  entityId: string,
  profileData: Record<string, unknown>,
): ProfileCompletenessResult {
  const fields = getFieldsForEntityType(entityType);
  const filledFields: string[] = [];
  const missingFields: string[] = [];
  const requiredMissing: string[] = [];
  const fieldDetails: FieldDetail[] = [];

  let totalWeight = 0;
  let filledWeight = 0;

  for (const field of fields) {
    const filled = isFieldFilled(profileData[field.key]);
    totalWeight += field.weight;

    if (filled) {
      filledWeight += field.weight;
      filledFields.push(field.key);
    } else {
      missingFields.push(field.key);
      if (field.required) {
        requiredMissing.push(field.key);
      }
    }

    fieldDetails.push({
      key: field.key,
      label: field.label,
      weight: field.weight,
      required: field.required,
      filled,
    });
  }

  const score = totalWeight > 0 ? Math.round((filledWeight / totalWeight) * 100) : 0;

  return {
    entityType,
    entityId,
    score,
    filledFields,
    missingFields,
    requiredMissing,
    fieldDetails,
  };
}

export function getRequiredFields(entityType: EntityType): string[] {
  return getFieldsForEntityType(entityType)
    .filter((f) => f.required)
    .map((f) => f.key);
}

export function isProfileComplete(entityType: EntityType, profileData: Record<string, unknown>): boolean {
  const required = getRequiredFields(entityType);
  return required.every((key) => isFieldFilled(profileData[key]));
}
