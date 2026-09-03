import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";
import { recordConversion } from "@/lib/ads/events";
import { resolveTrackRequest, type TrackRequest } from "@/lib/ads/track";
import { claimNonce } from "@/lib/ads/nonce-ledger";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/** The largest conversion value that could be a real transaction. */
const MAX_CONVERSION_VALUE = 100_000_000;

/**
 * The largest value on the ads surface, and the one it was cheapest to forge.
 *
 * A conversion is worth more than an impression or a click: it is what an
 * advertiser is billed on and what performance reports are read from. This
 * route required a signed token, which its sibling `/api/ad-events` did not --
 * but unlike `/api/ads/impression` and `/api/ads/click` it had neither a rate
 * limit nor a nonce claim, so one valid token could be replayed without limit,
 * and `value` had no ceiling.
 */
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
  const resolved = await resolveTrackRequest(body);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  // One conversion per minted token, exactly as impressions and clicks work.
  // A retry, a double effect or a replay script all present the same nonce, and
  // only the first is counted. Answering 200 keeps the client from retrying a
  // duplicate it cannot fix.
  if (!claimNonce("conversion", resolved.nonce)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    const db = await getRuntimeDb();
    const conversionType = typeof body.conversionType === "string" ? body.conversionType.trim().slice(0, 32) : "click";
    // Bounded at both ends. It was floored at zero but had no ceiling, so a
    // single forged conversion could carry a value larger than the whole
    // marketplace has ever transacted and make every report downstream
    // meaningless. Out of range is treated as absent rather than clamped: a
    // clamped maximum is a number nobody sent, and it would look real.
    const raw = Number(body.value);
    const value = Number.isFinite(raw) && raw >= 0 && raw <= MAX_CONVERSION_VALUE
      ? Math.floor(raw)
      : 0;
    await recordConversion(db, resolved.campaignId, resolved.ctx, conversionType, value);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to record conversion" }, { status: 500 });
  }
}
