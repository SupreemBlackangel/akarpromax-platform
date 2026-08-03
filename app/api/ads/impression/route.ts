import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";
import { recordImpression } from "@/lib/ads/events";
import { resolveTrackRequest, type TrackRequest } from "@/lib/ads/track";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as TrackRequest | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const resolved = await resolveTrackRequest(body);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  try {
    const db = await getRuntimeDb();
    await recordImpression(db, resolved.campaignId, resolved.ctx);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to record impression" }, { status: 500 });
  }
}
