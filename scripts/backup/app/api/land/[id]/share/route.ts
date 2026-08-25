import { NextRequest, NextResponse } from "next/server";
import { getLand } from "@/lib/land/saved-land";
import { createSharePayload, buildDirections, buildMapViewUrl, buildListingDraft } from "@/lib/land/share";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const land = getLand(id);
  if (!land) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const share = createSharePayload(land, { baseUrl: BASE_URL });
  return NextResponse.json(share);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const land = getLand(id);
  if (!land) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const mode = (body as { mode?: string }).mode;

  if (mode === "directions") {
    const userLat = (body as { from?: { lat?: number; lon?: number } }).from;
    const directions = buildDirections(
      userLat?.lat !== undefined && userLat.lon !== undefined
        ? { lat: userLat.lat, lon: userLat.lon }
        : { lat: land.location.point.lat + 0.001, lon: land.location.point.lon },
      land.location.point,
    );
    return NextResponse.json(directions);
  }

  if (mode === "map") {
    return NextResponse.json({ url: buildMapViewUrl(land.location.point) });
  }

  if (mode === "listing") {
    return NextResponse.json({ draft: buildListingDraft(land) });
  }

  const share = createSharePayload(land, { baseUrl: BASE_URL });
  return NextResponse.json(share);
}

export function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
