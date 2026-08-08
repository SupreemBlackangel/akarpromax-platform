import { GeocodingProvider, LandGeoEvidence } from "./contracts";
import type { GeocodeCandidate } from "@/lib/geo/contracts";
import { geocodeAddress, selectBestCandidate, scoreCandidate } from "@/lib/geo/geocoding";

export class GazetteerGeocodingProvider implements GeocodingProvider {
  readonly name = "gazetteer";

  async searchCandidates(evidence: LandGeoEvidence): Promise<GeocodeCandidate[]> {
    const candidates = geocodeAddress({
      addresses: evidence.addresses,
      parcels: evidence.parcels,
    });
    return candidates.map((c) => scoreCandidate(c)).filter((c) => c.score > 0);
  }
}

export async function bestCandidate(candidates: GeocodeCandidate[]): Promise<GeocodeCandidate | null> {
  if (candidates.length === 0) return null;
  return selectBestCandidate(candidates);
}

export const DEFAULT_GEOCODING_PROVIDER: GeocodingProvider = new GazetteerGeocodingProvider();
