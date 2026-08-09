import { NextRequest, NextResponse } from "next/server";
import { getLand } from "@/lib/land/saved-land";
import { findSurveyors, DEFAULT_SURVEYOR_QUERY } from "@/lib/land/surveyor-discovery";
import { SurveyorCandidate, SurveyorQuery } from "@/lib/land/contracts";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const land = getLand(id);
  if (!land) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const q = request.nextUrl.searchParams;
  const poolRaw = q.get("pool") ?? "[]";

  let pool: SurveyorCandidate[];
  try {
    pool = JSON.parse(poolRaw) as SurveyorCandidate[];
  } catch {
    return NextResponse.json({ error: "INVALID_POOL" }, { status: 400 });
  }

  const query: SurveyorQuery = {
    ...DEFAULT_SURVEYOR_QUERY,
    landPoint: land.location.point,
    role: q.get("role") ?? undefined,
    maxDistanceKm: q.has("maxDistanceKm") ? parseFloat(q.get("maxDistanceKm")!) : undefined,
    onlyAvailable: q.has("onlyAvailable") ? q.get("onlyAvailable") === "true" : undefined,
    onlyVerified: q.has("onlyVerified") ? q.get("onlyVerified") === "true" : undefined,
    minReputationScore: q.has("minReputationScore")
      ? parseFloat(q.get("minReputationScore")!)
      : undefined,
    sortBy: (q.get("sortBy") as SurveyorQuery["sortBy"]) ?? undefined,
    limit: q.has("limit") ? parseInt(q.get("limit")!, 10) : undefined,
  };

  const result = findSurveyors(pool, query);
  return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=30" } });
}

export function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, OPTIONS" } });
}
