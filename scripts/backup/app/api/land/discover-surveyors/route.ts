import { NextRequest, NextResponse } from "next/server";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";
import { discoverSurveyorsFromDirectory } from "@/lib/land/amrs-directory";
import { checkRateLimit } from "@/lib/amrs/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit("api:land:surveyors", { maxRequests: 60, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", resetAt: rateLimit.resetAt },
      { status: 429 },
    );
  }

  const q = request.nextUrl.searchParams;
  const lat = parseFloat(q.get("lat") ?? "");
  const lon = parseFloat(q.get("lon") ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: "INVALID_LOCATION" }, { status: 400 });
  }

  await ensurePgIdentitySchema();

  const result = await discoverSurveyorsFromDirectory(
    { lat, lon },
    {
      countryCode: q.get("countryCode") ?? undefined,
      role: q.get("role") ?? "surveyor",
      maxDistanceKm: q.has("maxDistanceKm") ? parseFloat(q.get("maxDistanceKm")!) : undefined,
      onlyAvailable: q.has("onlyAvailable") ? q.get("onlyAvailable") === "true" : undefined,
      onlyVerified: q.has("onlyVerified") ? q.get("onlyVerified") === "true" : undefined,
      minReputationScore: q.has("minReputationScore") ? parseFloat(q.get("minReputationScore")!) : undefined,
      sortBy: (q.get("sortBy") as "distance" | "reputation" | "rating" | "jobs" | undefined) ?? "reputation",
      limit: q.has("limit") ? parseInt(q.get("limit")!, 10) : undefined,
    },
  );

  return NextResponse.json(result);
}

export function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, OPTIONS" } });
}
