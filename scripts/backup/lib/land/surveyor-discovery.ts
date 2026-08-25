import { Point, SurveyorCandidate, SurveyorQuery, SurveyorSearchResult } from "./contracts";
import { REPUTATION_LEVELS } from "@/lib/amrs/contracts/common";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function annotateDistance(candidate: SurveyorCandidate, from: Point): SurveyorCandidate {
  if (!candidate.location) return candidate;
  return { ...candidate, distanceKm: haversineKm(from, candidate.location) };
}

export function isWithinRadius(candidate: SurveyorCandidate, maxDistanceKm: number): boolean {
  if (candidate.distanceKm === undefined) return true;
  return candidate.distanceKm <= maxDistanceKm;
}

export function reputationRank(reputationLevel?: string, score?: number): number {
  if (score !== undefined) return score;
  if (!reputationLevel) return 0;
  const idx = REPUTATION_LEVELS.indexOf(reputationLevel as (typeof REPUTATION_LEVELS)[number]);
  return idx < 0 ? 0 : idx;
}

export function findSurveyors(
  pool: SurveyorCandidate[],
  query: SurveyorQuery,
): SurveyorSearchResult {
  const roleFilter = (query.role ?? "surveyor").toLowerCase();

  let candidates = pool
    .filter((c) => c.role.toLowerCase() === roleFilter)
    .map((c) => annotateDistance(c, query.landPoint));

  if (query.onlyAvailable !== false) {
    candidates = candidates.filter((c) => c.isAvailable);
  }

  if (query.onlyVerified !== false) {
    candidates = candidates.filter((c) => c.isVerified);
  }

  if (query.minReputationScore !== undefined) {
    candidates = candidates.filter((c) => (c.reputationScore ?? 0) >= query.minReputationScore!);
  }

  if (query.maxDistanceKm !== undefined) {
    candidates = candidates.filter((c) => isWithinRadius(c, query.maxDistanceKm!));
  }

  const sortBy = query.sortBy ?? "reputation";
  candidates = [...candidates].sort((a, b) => {
    switch (sortBy) {
      case "distance": {
        const da = a.distanceKm ?? Infinity;
        const db = b.distanceKm ?? Infinity;
        return da - db;
      }
      case "rating":
        return (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0);
      case "jobs":
        return (b.jobsCompleted ?? 0) - (a.jobsCompleted ?? 0);
      case "reputation":
      default:
        return reputationRank(b.reputationLevel, b.reputationScore) -
          reputationRank(a.reputationLevel, a.reputationScore);
    }
  });

  const total = candidates.length;
  if (query.limit !== undefined) {
    candidates = candidates.slice(0, query.limit);
  }

  return { candidates, total, query };
}

export const DEFAULT_SURVEYOR_QUERY: Pick<SurveyorQuery, "role" | "onlyAvailable" | "onlyVerified" | "sortBy"> = {
  role: "surveyor",
  onlyAvailable: true,
  onlyVerified: true,
  sortBy: "reputation",
};
