export type MatchRequestRow = {
  id: string;
  category_id: string;
  country_code: string;
  city_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  urgency?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
};

export type ProviderPriceRange = {
  category_id: string;
  price_from?: number | null;
  price_to?: number | null;
};

export type MatchProviderRow = {
  id: string;
  user_id: string;
  country_code: string;
  city_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  service_radius_km?: number | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  completion_rate?: number | null;
  response_rate?: number | null;
  status?: string;
  category_ids: string[];
  price_ranges: ProviderPriceRange[];
};

export type MatchScoreResult = {
  providerId: string;
  score: number;
  categoryMatch: boolean;
  distanceKm: number | null;
  budgetFit: boolean;
  urgencyBonus: number;
  ratingBonus: number;
  responseBonus: number;
  reasons: string[];
};

export function distanceKm(
  a: { latitude?: number | null; longitude?: number | null },
  b: { latitude?: number | null; longitude?: number | null },
): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export const PLATFORM_MAX_SERVICE_RADIUS_KM = 10;

const toNum = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function computeMatchScore(
  request: MatchRequestRow,
  provider: MatchProviderRow,
): MatchScoreResult | null {
  const reasons: string[] = [];

  if (provider.status && provider.status !== "approved") return null;

  const requestCountry = String(request.country_code || "").toUpperCase();
  const providerCountry = String(provider.country_code || "").toUpperCase();
  if (providerCountry && requestCountry && providerCountry !== requestCountry) return null;

  const coversCategory = provider.category_ids.some((id) => String(id) === String(request.category_id));
  if (!coversCategory) return null;

  let score = 40;
  reasons.push("category_match");

  const requestCity = String(request.city_id || "").trim().toLowerCase();
  const providerCity = String(provider.city_id || "").trim().toLowerCase();

  // Marketplace policy: a provider must serve the same city. Coordinates,
  // when available on both sides, additionally enforce a hard 10 km cap.
  if (requestCity && providerCity && requestCity !== providerCity) return null;

  const requestLat = toNum(request.latitude);
  const requestLng = toNum(request.longitude);
  const providerLat = toNum(provider.latitude);
  const providerLng = toNum(provider.longitude);
  const providerRadius = toNum(provider.service_radius_km) ?? PLATFORM_MAX_SERVICE_RADIUS_KM;
  const effectiveRadius = Math.max(0.1, Math.min(providerRadius, PLATFORM_MAX_SERVICE_RADIUS_KM));

  let distance: number | null = null;
  const requestHasGeo = requestLat != null && requestLng != null;
  const providerHasGeo = providerLat != null && providerLng != null;

  if (requestHasGeo && providerHasGeo) {
    distance = distanceKm(
      { latitude: requestLat, longitude: requestLng },
      { latitude: providerLat, longitude: providerLng },
    );
    if (distance != null && distance > effectiveRadius) return null;
    if (distance != null) {
      score += Math.max(0, 30 - Math.round(distance * 2));
      reasons.push(`distance_${Math.round(distance * 10) / 10}km`);
    }
  } else {
    // Missing coordinates are allowed only when both sides still resolve to
    // the same city; never fall back to country-wide matching.
    if (!requestCity || !providerCity || requestCity !== providerCity) return null;
    score += 12;
    reasons.push("same_city");
  }

  const urgency = String(request.urgency || "").toLowerCase();
  let urgencyBonus = 0;
  if (urgency === "urgent") urgencyBonus = 10;
  else if (urgency === "asap" || urgency === "today") urgencyBonus = 6;
  else if (urgency === "this_week") urgencyBonus = 3;
  score += urgencyBonus;
  if (urgencyBonus > 0) reasons.push(`urgency_${urgency}`);

  const requestMin = toNum(request.budget_min);
  const requestMax = toNum(request.budget_max);
  const range = provider.price_ranges.find((entry) => String(entry.category_id) === String(request.category_id));
  const priceFrom = range ? toNum(range.price_from) : null;
  const priceTo = range ? toNum(range.price_to) : null;

  let budgetFit = false;
  if (priceFrom != null || priceTo != null) {
    const providerLow = priceFrom ?? 0;
    const providerHigh = priceTo ?? priceFrom ?? Infinity;
    const requestLow = requestMin ?? 0;
    const requestHigh = requestMax ?? Infinity;
    budgetFit = providerLow <= requestHigh && providerHigh >= requestLow;
  } else if (requestMin != null || requestMax != null) {
    budgetFit = true;
  }
  if (budgetFit) {
    score += 8;
    reasons.push("budget_fit");
  }

  const rating = toNum(provider.rating_avg);
  let ratingBonus = 0;
  if (rating != null) {
    if (rating >= 4.5) ratingBonus = 10;
    else if (rating >= 4.0) ratingBonus = 7;
    else if (rating >= 3.5) ratingBonus = 4;
  }
  score += ratingBonus;
  if (ratingBonus > 0) reasons.push(`rating_${Math.round((rating ?? 0) * 10) / 10}`);

  const responseRate = toNum(provider.response_rate);
  let responseBonus = 0;
  if (responseRate != null) {
    if (responseRate >= 95) responseBonus = 7;
    else if (responseRate >= 85) responseBonus = 4;
  }
  score += responseBonus;
  if (responseBonus > 0) reasons.push("fast_response");

  const completionRate = toNum(provider.completion_rate);
  if (completionRate != null && completionRate >= 95) {
    score += 5;
    reasons.push("high_completion");
  }

  return {
    providerId: provider.id,
    score: Math.max(0, Math.min(100, score)),
    categoryMatch: true,
    distanceKm: distance,
    budgetFit,
    urgencyBonus,
    ratingBonus,
    responseBonus,
    reasons,
  };
}
