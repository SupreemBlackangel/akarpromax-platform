import { NextRequest, NextResponse } from 'next/server';
import { GeoService } from '@/lib/services/geo/geo.service';
import { resolveGeoRequest, type GeoProvider } from '@/lib/services/geo/geo-contract';

export const dynamic = 'force-dynamic';

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

  return NextResponse.json(result.body, { status: result.status });
}
