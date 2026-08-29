import { NextRequest, NextResponse } from 'next/server';
import { GeoService } from '@/lib/services/geo/geo.service';
import { resolveGeoRequest, type GeoProvider } from '@/lib/services/geo/geo-contract';

export const dynamic = 'force-dynamic';

// Geo lookups are public reference data. The desktop office app's WebView
// (origin https://akarapp.local, via /office-app/bootstrap.js) reads them
// cross-origin to fill the country/governorate/city selects, exactly like
// /api/program/login and /api/program/profile already allow. Without these
// headers the browser blocks the response and the selects stay empty.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider: GeoProvider = new GeoService();

  const result = await resolveGeoRequest(
    { type: searchParams.get('type'), parentId: searchParams.get('parentId') },
    provider,
  );

  // The full underlying error stays on the server. `result.body` is the only
  // thing that reaches the client and never contains internal detail.
  if (result.internal) {
    console.error(
      `[Geo API] ${result.internal.code} type=${result.internal.type ?? 'unknown'}`,
      result.internal.cause,
    );
  }

  return NextResponse.json(result.body, { status: result.status, headers: CORS_HEADERS });
}
