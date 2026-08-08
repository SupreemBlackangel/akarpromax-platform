import { NextRequest, NextResponse } from "next/server";
import { saveLand, getLandsByOwner, parseLandReference } from "@/lib/land/saved-land";
import { checkRateLimit } from "@/lib/amrs/security";
import { LandReference } from "@/lib/land/contracts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit("api:land:create", { maxRequests: 30, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", resetAt: rateLimit.resetAt },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const input = body as {
    ownerId?: string;
    title?: string;
    location?: { point?: { lat?: number; lon?: number } };
    areaSqm?: number;
    reference?: LandReference;
    notes?: string;
    source?: string;
  };

  if (!input.ownerId || !input.title) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }
  if (!input.location?.point || typeof input.location.point.lat !== "number" || typeof input.location.point.lon !== "number") {
    return NextResponse.json({ error: "INVALID_LOCATION" }, { status: 400 });
  }

  const land = saveLand({
    ownerId: input.ownerId,
    title: input.title,
    location: {
      point: { lat: input.location.point.lat, lon: input.location.point.lon },
    },
    areaSqm: input.areaSqm,
    reference: parseLandReference(input.reference),
    notes: input.notes,
    source: (input.source as "coordinates" | "geocoding" | "manual") ?? "manual",
  });

  return NextResponse.json(land, { status: 201 });
}

export async function GET(request: NextRequest) {
  const ownerId = request.nextUrl.searchParams.get("ownerId");
  if (!ownerId) {
    return NextResponse.json({ error: "MISSING_OWNER" }, { status: 400 });
  }
  const lands = getLandsByOwner(ownerId);
  return NextResponse.json({ lands, total: lands.length });
}

export function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "POST, GET, OPTIONS" } });
}
