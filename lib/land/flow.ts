import { Point } from "./contracts";
import { SavedLand, SaveLandInput } from "./contracts";
import { getLand, saveLand } from "./saved-land";
import {
  buildDirections,
  buildListingDraft,
  buildMapViewUrl,
  createSharePayload,
} from "./share";
import { findSurveyors, DEFAULT_SURVEYOR_QUERY } from "./surveyor-discovery";
import { SurveyorCandidate, SurveyorQuery } from "./contracts";

export interface LandFlowResult {
  land: SavedLand;
  mapUrl: string;
  shareUrl: string;
  qrPayload: string;
  directionsUrl: string;
  listingDraft: ReturnType<typeof buildListingDraft>;
  surveyors: SurveyorCandidate[];
}

export interface LandFlowConfig {
  baseUrl: string;
  userLocation?: Point;
}

export function runLandFlow(
  input: SaveLandInput,
  pool: SurveyorCandidate[],
  query: SurveyorQuery,
  config: LandFlowConfig,
): LandFlowResult {
  const land = saveLand(input);
  return buildLandFlow(land, pool, query, config);
}

export function buildLandFlow(
  land: SavedLand,
  pool: SurveyorCandidate[],
  query: SurveyorQuery,
  config: LandFlowConfig,
): LandFlowResult {
  const point = land.location.point;

  const mapUrl = buildMapViewUrl(point);
  const share = createSharePayload(land, { baseUrl: config.baseUrl });
  const directions = buildDirections(
    config.userLocation ?? { lat: point.lat + 0.001, lon: point.lon },
    point,
  );
  const listingDraft = buildListingDraft(land);

  const effectiveQuery: SurveyorQuery = {
    ...DEFAULT_SURVEYOR_QUERY,
    ...query,
    landPoint: query.landPoint ?? point,
  };
  const surveyors = findSurveyors(pool, effectiveQuery).candidates;

  return {
    land,
    mapUrl,
    shareUrl: share.url,
    qrPayload: share.qrPayload,
    directionsUrl: directions.url,
    listingDraft,
    surveyors,
  };
}
