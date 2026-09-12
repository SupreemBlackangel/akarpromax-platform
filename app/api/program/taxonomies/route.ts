import { NextResponse } from "next/server";

import { taxonomyPayload } from "@/lib/taxonomy/property-taxonomy";
import { activeOfferTypes, OFFICE_LISTING_STATUSES } from "@/lib/integration/reference";

export const dynamic = "force-dynamic";

/**
 * The property taxonomy, for the office application.
 *
 * The office app shipped its own copy of the lists and mapped them onto the
 * platform's shorter one when publishing, losing the distinctions its users
 * had recorded. It now pulls this on sync instead, so both sides offer the
 * same categories, types, facades and furnishing states — and a palace stays
 * a palace.
 *
 * `offerTypes` and `listingStatuses` are here for the same reason and were the
 * last two lists still hard-coded on the desktop: four chips (sale, rent,
 * management, investment) against the eleven the website offers, so a desktop
 * could not publish تقبيل or فروغ at all. They come from
 * `lib/integration/reference.ts` — the same query `/api/offer-types` and
 * `/api/office/v1/reference` run, not a third copy of the list.
 *
 * Why this endpoint rather than the token-authenticated
 * `/api/office/v1/reference`: the desktop's WebView holds no device token (it
 * lives in the C# host), already fetches this URL, and none of this is
 * private — it is the same list a visitor sees in the website's search
 * filters. The office endpoint stays for paired devices that want the version
 * fingerprint and a 304.
 *
 * Public reference data, and CORS-enabled for the same reason /api/geo is: the
 * office app's WebView is a cross-origin caller (https://akarapp.local).
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const base = taxonomyPayload();

  // A database read, so it can fail in a way the source-held lists cannot. An
  // offer-type list that is briefly missing must not take the categories down
  // with it: the desktop keeps its own copy of every list and only replaces
  // the ones it is actually sent.
  let offerTypes: Array<Record<string, unknown>> = [];
  try {
    const rows = await activeOfferTypes();
    offerTypes = rows.map((row, index) => ({
      // Lowercase, because that is what `dealType` is stored as and what the
      // desktop will send back; the table holds the code upper-cased.
      code: row.code.toLowerCase(),
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      nameTr: row.nameTr ?? null,
      allowDirect: row.allowDirect ?? true,
      allowAuction: row.allowAuction ?? true,
      sortOrder: row.displayOrder ?? index,
    }));
  } catch (error) {
    console.error("[program/taxonomies] offer types unavailable:", error);
  }

  return NextResponse.json(
    {
      ...base,
      version: 2,
      offerTypes,
      listingStatuses: OFFICE_LISTING_STATUSES,
    },
    // Ten minutes rather than an hour: unlike the source-held lists, an offer
    // type is switched on in the admin panel and the office should see it the
    // same morning.
    { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=600" } },
  );
}
