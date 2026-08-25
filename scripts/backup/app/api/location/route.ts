import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ARABIC_COUNTRY_TO_CODE: Record<string, string> = {
  "سلطنة عُمان": "om", "عُمان": "om",
  "المملكة العربية السعودية": "sa", "السعودية": "sa",
  "الإمارات العربية المتحدة": "ae", "الإمارات": "ae", "دولة الإمارات": "ae",
  "مصر": "eg", "جمهورية مصر العربية": "eg",
  "العراق": "iq", "جمهورية العراق": "iq",
  "الأردن": "jo", "المملكة الأردنية الهاشمية": "jo",
  "الكويت": "kw", "دولة الكويت": "kw",
  "لبنان": "lb", "الجمهورية اللبنانية": "lb",
  "ليبيا": "ly", "دولة ليبيا": "ly",
  "الجزائر": "dz", "الجمهورية الجزائرية": "dz",
  "المغرب": "ma", "المملكة المغربية": "ma",
  "تونس": "tn", "الجمهورية التونسية": "tn",
  "موريتانيا": "mr", "الجمهورية الإسلامية الموريتانية": "mr",
  "فلسطين": "ps", "دولة فلسطين": "ps",
  "قطر": "qa", "دولة قطر": "qa",
  "السودان": "sd", "جمهورية السودان": "sd",
  "سوريا": "sy", "الجمهورية العربية السورية": "sy",
  "الصومال": "so", "جمهورية الصومال": "so",
  "جيبوتي": "dj", "جمهورية جيبوتي": "dj",
  "جزر القمر": "km", "الاتحاد القمري": "km",
  "البحرين": "bh", "مملكة البحرين": "bh",
  "اليمن": "ye", "الجمهورية اليمنية": "ye",
  "تركيا": "tr", "Türkiye": "tr",
};

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;

function stripDiacritics(value: string): string {
  return value.replace(ARABIC_DIACRITICS, "");
}

function extractCountryCode(countryName: string): string {
  const trimmed = countryName.trim();
  const normalized = stripDiacritics(trimmed);
  for (const [key, code] of Object.entries(ARABIC_COUNTRY_TO_CODE)) {
    if (normalized.includes(stripDiacritics(key))) return code;
  }
  const firstTwo = normalized.toLowerCase().slice(0, 2);
  if (firstTwo >= "aa" && firstTwo <= "zz") return firstTwo;
  return "";
}

function parseAddress(addr: Record<string, unknown>): {
  country: string; countryCode: string; governorate: string; city: string;
  village: string; district: string; street: string;
} {
  const road = String(addr.road || addr.pedestrian || addr.footway || addr.cycleway || addr.path || "");
  const city = String(addr.city || addr.town || addr.municipality || addr.county || addr.state_district || "");
  const village = String(addr.village || addr.hamlet || addr.locality || addr.farm || addr.isolated_dwelling || addr.croft || "");
  const district = String(addr.suburb || addr.neighbourhood || addr.quarter || addr.borough || addr.ward || "");
  const governorate = String(addr.state || addr.region || addr.province || "");
  const country = String(addr.country || "");
  const countryCode = extractCountryCode(country);
  return { country, countryCode, governorate, city, village, district, street: road };
}

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const q = request.nextUrl.searchParams.get("q");

  if (lat && lng) {
    await sleep(1000);
    const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1&accept-language=ar`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AkarPromax/1.0 (location-service)" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }
    const data = await res.json();
    if (!data || !data.address) {
      return NextResponse.json({ error: "No address found" }, { status: 404 });
    }
    const addr = parseAddress(data.address);
    return NextResponse.json({
      displayName: String(data.display_name || ""),
      lat: data.lat ? Number(data.lat) : null,
      lng: data.lon ? Number(data.lon) : null,
      ...addr,
    });
  }

  if (q) {
    await sleep(1000);
    const url = `${NOMINATIM_BASE}/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=5&accept-language=ar`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AkarPromax/1.0 (location-service)" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Search failed" }, { status: 502 });
    }
    const results = await res.json();
    const mapped = (Array.isArray(results) ? results : []).map((item: Record<string, unknown>) => {
      const addr = parseAddress(item.address as Record<string, unknown> || {});
      return {
        displayName: String(item.display_name || ""),
        lat: item.lat ? Number(item.lat) : null,
        lng: item.lon ? Number(item.lon) : null,
        ...addr,
      };
    });
    return NextResponse.json(mapped);
  }

  return NextResponse.json({ error: "Provide lat+lng or q parameter" }, { status: 400 });
}
