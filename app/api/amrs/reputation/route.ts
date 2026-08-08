import { NextRequest, NextResponse } from "next/server";
import { getReputationProfile, getReputationHistory, getReputationDistribution } from "@/lib/amrs/reputation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const entityType = (q.get("entityType") ?? "professional") as "user" | "professional" | "organization";
  const entityId = q.get("entityId");

  if (q.has("distribution")) {
    const dist = await getReputationDistribution();
    return NextResponse.json({ distribution: dist }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!entityId) {
    return NextResponse.json({ error: "MISSING_ENTITY_ID" }, { status: 400 });
  }

  const profile = await getReputationProfile(entityType, entityId);
  if (!profile) {
    return NextResponse.json({ profile: null, history: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const history = await getReputationHistory(entityType, entityId);
  return NextResponse.json({ profile, history }, { headers: { "Cache-Control": "no-store" } });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, OPTIONS" } });
}
