import {
  AddressEvidence,
  GeocodeCandidate,
  ParcelEvidence,
  Point,
} from "./contracts";

export interface GazetteerEntry {
  label: string;
  point: Point;
  keywords: string[];
  countryCode: string;
  adminLevel: number;
}

export const GAZETTEER: readonly GazetteerEntry[] = [
  { label: "الرياض", point: { lat: 24.7136, lon: 46.6753 }, keywords: ["الرياض", "riyadh", "الملك عبدالعزيز", "السعودية"], countryCode: "SA", adminLevel: 1 },
  { label: "جدة", point: { lat: 21.4858, lon: 39.1925 }, keywords: ["جدة", "jeddah", "jedda"], countryCode: "SA", adminLevel: 1 },
  { label: "مكة المكرمة", point: { lat: 21.3891, lon: 39.8579 }, keywords: ["مكة", "مكة المكرمة", "mecca", "makkah"], countryCode: "SA", adminLevel: 1 },
  { label: "المدينة المنورة", point: { lat: 24.5247, lon: 39.5692 }, keywords: ["المدينة", "المدينة المنورة", "medina", "madinah"], countryCode: "SA", adminLevel: 1 },
  { label: "الدمام", point: { lat: 26.4207, lon: 50.0888 }, keywords: ["الدمام", "dammam"], countryCode: "SA", adminLevel: 1 },
  { label: "الطائف", point: { lat: 21.2703, lon: 40.4158 }, keywords: ["الطائف", "taif", "taif city"], countryCode: "SA", adminLevel: 2 },
  { label: "أبها", point: { lat: 18.2164, lon: 42.5053 }, keywords: ["أبها", "abha"], countryCode: "SA", adminLevel: 2 },
  { label: "تبوك", point: { lat: 28.3838, lon: 36.555 }, keywords: ["تبوك", "tabuk"], countryCode: "SA", adminLevel: 2 },
  { label: "الخرج", point: { lat: 24.1667, lon: 47.3333 }, keywords: ["الخرج", "kharj"], countryCode: "SA", adminLevel: 2 },
  { label: "حائل", point: { lat: 27.5219, lon: 41.6907 }, keywords: ["حائل", "hail"], countryCode: "SA", adminLevel: 2 },
  { label: "الأحساء", point: { lat: 25.3833, lon: 49.5833 }, keywords: ["الأحساء", "al-ahsa", "هفوف"], countryCode: "SA", adminLevel: 2 },
  { label: "الجبيل", point: { lat: 27.0046, lon: 49.646 }, keywords: ["الجبيل", "jubail"], countryCode: "SA", adminLevel: 2 },
  { label: "ينبع", point: { lat: 24.0855, lon: 38.0639 }, keywords: ["ينبع", "yanbu"], countryCode: "SA", adminLevel: 2 },
  { label: "القطيف", point: { lat: 26.5654, lon: 50.008 }, keywords: ["القطيف", "qatif"], countryCode: "SA", adminLevel: 2 },
  { label: "الدمام", point: { lat: 26.4207, lon: 50.0888 }, keywords: ["الدمام", "dammam"], countryCode: "SA", adminLevel: 2 },
  { label: "أبوظبي", point: { lat: 24.4539, lon: 54.3773 }, keywords: ["أبوظبي", "abu dhabi"], countryCode: "AE", adminLevel: 1 },
  { label: "دبي", point: { lat: 25.2048, lon: 55.2708 }, keywords: ["دبي", "dubai"], countryCode: "AE", adminLevel: 1 },
  { label: "الشارقة", point: { lat: 25.3463, lon: 55.4209 }, keywords: ["الشارقة", "sharjah"], countryCode: "AE", adminLevel: 1 },
  { label: "العين", point: { lat: 24.2075, lon: 55.7447 }, keywords: ["العين", "al ain"], countryCode: "AE", adminLevel: 2 },
  { label: "مسقط", point: { lat: 23.588, lon: 58.3829 }, keywords: ["مسقط", "muscat"], countryCode: "OM", adminLevel: 1 },
  { label: "صلالة", point: { lat: 17.0151, lon: 54.0924 }, keywords: ["صلالة", "salalah"], countryCode: "OM", adminLevel: 2 },
  { label: "القاهرة", point: { lat: 30.0444, lon: 31.2357 }, keywords: ["القاهرة", "cairo"], countryCode: "EG", adminLevel: 1 },
  { label: "الإسكندرية", point: { lat: 31.2001, lon: 29.9187 }, keywords: ["الإسكندرية", "alexandria"], countryCode: "EG", adminLevel: 1 },
  { label: "عمان", point: { lat: 31.9539, lon: 35.9106 }, keywords: ["عمان", "amman"], countryCode: "JO", adminLevel: 1 },
  { label: "الدوحة", point: { lat: 25.2854, lon: 51.531 }, keywords: ["الدوحة", "doha"], countryCode: "QA", adminLevel: 1 },
  { label: "المنامة", point: { lat: 26.2285, lon: 50.586 }, keywords: ["المنامة", "manama"], countryCode: "BH", adminLevel: 1 },
  { label: "الكويت", point: { lat: 29.3759, lon: 47.9774 }, keywords: ["الكويت", "kuwait city"], countryCode: "KW", adminLevel: 1 },
];

export interface GeocodeInput {
  addresses: AddressEvidence[];
  parcels: ParcelEvidence[];
}

export function geocodeAddress(input: GeocodeInput): GeocodeCandidate[] {
  const candidates: GeocodeCandidate[] = [];
  const seen = new Set<string>();

  const addCandidate = (entry: GazetteerEntry, baseScore: number, source: string) => {
    const key = `${entry.label}|${entry.point.lat}|${entry.point.lon}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({
      point: { lat: entry.point.lat, lon: entry.point.lon },
      label: entry.label,
      score: baseScore,
      source,
    });
  };

  for (const addr of input.addresses) {
    const text = `${addr.city ?? ""} ${addr.district ?? ""} ${addr.street ?? ""}`.trim();
    for (const entry of GAZETTEER) {
      if (text.includes(entry.label)) {
        let score = 0.7;
        if (entry.adminLevel === 1) score += 0.1;
        if (addr.district) score += 0.05;
        if (addr.street) score += 0.05;
        if (addr.postalCode) score += 0.05;
        addCandidate(entry, Math.min(0.98, score), "address");
      }
    }
  }

  for (const parcel of input.parcels) {
    if (parcel.planId || parcel.parcelId) {
      const score = 0.45;
      const label = parcel.planId
        ? `مخطط ${parcel.planId}${parcel.municipality ? ` - ${parcel.municipality}` : ""}`
        : `قطعة ${parcel.parcelId}${parcel.municipality ? ` - ${parcel.municipality}` : ""}`;
      const existing = candidates.find((c) => c.label === label);
      if (existing) {
        existing.score = Math.min(0.98, existing.score + 0.1);
      } else {
        const key = `${label}|parcel`;
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push({
            point: { lat: 0, lon: 0 },
            label,
            score,
            source: "parcel",
          });
        }
      }
    }
  }

  return candidates
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function scoreCandidate(candidate: GeocodeCandidate): GeocodeCandidate {
  return candidate;
}

export function selectBestCandidate(candidates: GeocodeCandidate[]): GeocodeCandidate | null {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, c) => (c.score > best.score ? c : best));
}
