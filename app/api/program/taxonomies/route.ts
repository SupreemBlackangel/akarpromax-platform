import { NextResponse } from "next/server";
import { taxonomyPayload } from "@/lib/taxonomy/property-taxonomy";

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
  return NextResponse.json(taxonomyPayload(), {
    headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=3600" },
  });
}
