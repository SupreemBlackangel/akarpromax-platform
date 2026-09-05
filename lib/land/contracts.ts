import type { Point, Geometry } from "@/lib/geo/contracts";
import type { ReputationLevel } from "@/lib/amrs/contracts/common";

export type { Point, Geometry };
export type { ReputationLevel };

export interface LandReference {
  parcelId?: string;
  planId?: string;
  plotId?: string;
  municipality?: string;
}

export type LandSource = "coordinates" | "geocoding" | "manual";

export interface LandLocation {
  point: Point;
  geometry?: Geometry;
  label?: string;
  countryCode?: string;
  city?: string;
  district?: string;
}

export interface SaveLandInput {
  ownerId: string;
  title: string;
  location: LandLocation;
  areaSqm?: number;
  reference?: LandReference;
  notes?: string;
  source?: LandSource;
}

export interface SavedLand {
  id: string;
  ownerId: string;
  title: string;
  location: LandLocation;
  areaSqm?: number;
  reference?: LandReference;
  notes?: string;
  source: LandSource;
  createdAt: number;
  updatedAt: number;
}

export interface LandSharePayload {
  landId: string;
  shareToken: string;
  url: string;
  qrPayload: string;
  expiresAt: number;
}

export interface LandDirections {
  from: Point;
  to: Point;
  url: string;
  provider: string;
}

export interface LandListingDraft {
  title: string;
  description: string;
  landId: string;
  location: LandLocation;
  areaSqm?: number;
  reference?: LandReference;
  ownerId: string;
  tags: string[];
}

export interface SurveyorCandidate {
  id: string;
  name: string;
  role: string;
  location?: Point;
  cityId?: string;
  countryCode?: string;
  isAvailable: boolean;
  isVerified: boolean;
  reputationLevel?: ReputationLevel;
  reputationScore?: number;
  ratingAvg?: number;
  jobsCompleted?: number;
  distanceKm?: number;
}

export interface SurveyorQuery {
  landPoint: Point;
  role?: string;
  maxDistanceKm?: number;
  onlyAvailable?: boolean;
  onlyVerified?: boolean;
  minReputationScore?: number;
  sortBy?: "distance" | "reputation" | "rating" | "jobs";
  limit?: number;
}

export interface SurveyorSearchResult {
  candidates: SurveyorCandidate[];
  total: number;
  query: SurveyorQuery;
}

export interface SurveyorDiscovery {
  land: SavedLand;
  results: SurveyorSearchResult;
}
