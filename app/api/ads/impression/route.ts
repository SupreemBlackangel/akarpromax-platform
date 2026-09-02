import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";
import { recordImpression } from "@/lib/ads/events";
import { resolveTrackRequest, type TrackRequest } from "@/lib/ads/track";
import { resolveServerAdContext } from "@/lib/ads/server-context";
import { claimNonce } from "@/lib/ads/nonce-ledger";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limit = await enforceRateLimit("ads_impression", clientIp(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = (await request.json().catch(() => null)) as TrackRequest | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const server = resolveServerAdContext(request, body.countryCode);
  const resolved = await resolveTrackRequest(body, server);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  // One impression per minted token. A remount, StrictMode's double effect, a
  // retried request or a replay script all present the same nonce, and only the
  // first is billed. Answering 200 keeps the client from retrying a duplicate
  // it cannot fix.
  if (!claimNonce("impression", resolved.nonce)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    const db = await getRuntimeDb();
    await recordImpression(db, resolved.campaignId, resolved.ctx, new Date(), {
      creativeId: resolved.creativeId,
      inventoryClass: resolved.inventoryClass,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to record impression" }, { status: 500 });
  }
}
