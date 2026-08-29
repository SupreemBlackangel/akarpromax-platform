import { NextRequest, NextResponse } from "next/server";
import { listOfficeNews } from "@/lib/integration/news";
import { listOfficeAds } from "@/lib/integration/ads";
import { OFFICE_AD_PLACEMENTS } from "@/lib/integration/constants";

export const dynamic = "force-dynamic";

/**
 * Legacy desktop-app compatibility bridge.
 *
 * The distributed AkarProMax Office desktop app (its embedded WebView UI)
 * POSTs here for its news ticker and ad banners. Historically it targeted a
 * now-dead hyphenated host with a hardcoded "signature" master key; the
 * shipped webui is patched to call this live host instead.
 *
 * SECURITY: the hardcoded `signature` is deliberately NOT trusted or checked.
 * This endpoint returns ONLY public content — the same office-channel news
 * and ads any office would see — so there is no privileged data to guard and
 * the leaked master key grants nothing. Account-scoped or write operations
 * live behind the real device-token protocol at /api/office/v1/* instead.
 *
 * Region filtering: the app may send `country` (2-letter) and optional `city`
 * in the body. With no country, only globally-scoped news and untargeted ads
 * are returned — never silently defaulted to one market (canonical geo rule).
 *
 * CORS: the desktop WebView serves the UI from https://akarapp.local, so this
 * cross-origin call needs permissive CORS. That is safe here because the
 * payload is entirely public content.
 *
 * Response shape matches what the webui expects: { success, news, ads }.
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

type SyncBody = {
  country?: unknown;
  city?: unknown;
  action?: unknown;
};

function normalizeCountry(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 2) : "";
}

export async function POST(req: NextRequest) {
  let body: SyncBody = {};
  try {
    body = (await req.json()) as SyncBody;
  } catch {
    body = {};
  }

  const countryCode = normalizeCountry(body.country);
  const cityId = countryCode && typeof body.city === "string" ? body.city.trim() || undefined : undefined;

  try {
    const [newsItems, ads] = await Promise.all([
      listOfficeNews({ countryCode, cityId, limit: 30, channel: "OFFICE_TICKER" }),
      countryCode
        ? listOfficeAds({ countryCode, placement: OFFICE_AD_PLACEMENTS[0], limit: 10 })
        : Promise.resolve([]),
    ]);

    // The desktop webui normalizer reads { id, text } for news and a loose
    // ad object ({ id, title, subtitle, placement, imageUrl, linkUrl }).
    const news = newsItems.map((item) => ({
      id: item.id,
      text: item.titleAr || item.titleEn || item.titleTr,
      linkUrl: item.linkUrl,
    }));

    const mappedAds = ads.map((ad) => ({
      id: ad.id,
      title: ad.titleAr || ad.titleEn || ad.titleTr,
      subtitle: ad.descriptionAr || ad.descriptionEn || ad.descriptionTr,
      placement: "any" as const,
      imageUrl: ad.mediaUrl,
      linkUrl: ad.targetUrl,
    }));

    return NextResponse.json({ success: true, news, ads: mappedAds }, { headers: CORS_HEADERS });
  } catch {
    // Fail soft: the desktop app treats a non-success as "keep last cache".
    return NextResponse.json({ success: false, news: [], ads: [] }, { headers: CORS_HEADERS });
  }
}

// Some builds probe with GET; answer harmlessly so the app never errors hard.
export async function GET() {
  return NextResponse.json({ success: true, news: [], ads: [] }, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
