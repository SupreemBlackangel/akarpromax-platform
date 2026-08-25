import { searchDirectory, DirectoryFilters, DirectoryEntry } from "@/lib/amrs/directory";
import { isMissingOrganizationsTableError } from "@/lib/amrs/schema-fallback";
import { SurveyorCandidate, SurveyorQuery, SurveyorSearchResult } from "@/lib/land/contracts";
import { findSurveyors } from "@/lib/land/surveyor-discovery";

export interface SurveyorDirectorySource {
  search(filters: DirectoryFilters): Promise<{ entries: DirectoryEntry[]; total: number }>;
}

export const REAL_AMRS_DIRECTORY: SurveyorDirectorySource = {
  search: async (filters) => {
    const result = await searchDirectory(filters);
    return { entries: result.entries, total: result.total };
  },
};

export function mapDirectoryEntryToSurveyor(entry: DirectoryEntry): SurveyorCandidate {
  return {
    id: entry.id,
    name: entry.name,
    role: "surveyor",
    cityId: entry.cityId ?? undefined,
    countryCode: entry.countryCode ?? undefined,
    isAvailable: true,
    isVerified: entry.isVerified,
    reputationLevel: entry.reputationLevel ?? undefined,
    reputationScore: entry.reputationScore ?? undefined,
    ratingAvg: entry.ratingAvg ?? undefined,
    jobsCompleted: entry.jobsCompleted ?? undefined,
  };
}

export interface SurveyorDiscoveryOptions {
  role?: string;
  maxDistanceKm?: number;
  onlyAvailable?: boolean;
  onlyVerified?: boolean;
  minReputationScore?: number;
  sortBy?: SurveyorQuery["sortBy"];
  limit?: number;
  countryCode?: string;
  search?: string;
}

export async function discoverSurveyorsFromDirectory(
  landPoint: SurveyorQuery["landPoint"],
  options: SurveyorDiscoveryOptions = {},
  source: SurveyorDirectorySource = REAL_AMRS_DIRECTORY,
): Promise<SurveyorSearchResult> {
  const query: SurveyorQuery = {
    landPoint,
    role: options.role ?? "surveyor",
    maxDistanceKm: options.maxDistanceKm,
    onlyAvailable: options.onlyAvailable,
    onlyVerified: options.onlyVerified,
    minReputationScore: options.minReputationScore,
    sortBy: options.sortBy ?? "reputation",
    limit: options.limit,
  };

  const filters: DirectoryFilters = {
    entityType: "organization",
    countryCode: options.countryCode,
    search: options.search ?? "surveyor",
    limit: 100,
  };

  let entries: DirectoryEntry[] = [];
  try {
    ({ entries } = await source.search(filters));
  } catch (error) {
    if (!isMissingOrganizationsTableError(error)) {
      throw error;
    }
  }
  const pool: SurveyorCandidate[] = entries.map(mapDirectoryEntryToSurveyor);

  return findSurveyors(pool, query);
}
