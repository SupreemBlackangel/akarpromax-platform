import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * The browser-side map configuration.
 *
 * The Google Maps JavaScript API key is public by design — it is handed to
 * every visitor's browser, and the thing that protects it is not secrecy but
 * the HTTP-referrer restriction set on it in the Google Cloud console. What it
 * must NOT be is baked into the build: a NEXT_PUBLIC_* variable is inlined at
 * `next build` time, so rotating the key would mean rebuilding and
 * redeploying. Reading it here, at request time, keeps the key in the server's
 * .env alone — set it once, `pm2 restart`, done.
 *
 * With no key configured the platform keeps its OpenStreetMap maps, so a
 * missing or revoked key degrades to the previous behaviour rather than to a
 * blank rectangle.
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const key = (process.env.GOOGLE_MAPS_API_KEY ?? "").trim();
  return NextResponse.json(
    {
      // "google" once a key is configured, "osm" otherwise.
      provider: key ? "google" : "osm",
      googleMapsApiKey: key || null,
    },
    { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=300" } },
  );
}
