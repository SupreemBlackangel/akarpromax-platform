import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";
import { recordClick, verifyTrackingTokenDetailed } from "@/lib/ads/events";
import { resolveTrackRequest, type TrackRequest } from "@/lib/ads/track";
import { buildContext, isValidPlacement } from "@/lib/ads/context";
import { resolveServerAdContext } from "@/lib/ads/server-context";
import { claimNonce } from "@/lib/ads/nonce-ledger";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";
import { safeRedirect } from "@/lib/ads/click-target";

export const dynamic = "force-dynamic";

async function targetUrlFor(campaignId: string): Promise<string | null> {
  const db = await getRuntimeDb();
  const row = await db
    .prepare("SELECT target_url FROM ad_campaigns WHERE id = ?1 LIMIT 1")
    .bind(campaignId)
    .first<{ target_url: string }>();
  return row?.target_url ?? null;
}

export async function POST(request: NextRequest) {
  const limit = await enforceRateLimit("ads_click", clientIp(request));
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

  try {
    const origin = request.nextUrl.origin;
    // A duplicate still gets the destination back -- the caller is navigating
    // somewhere and must not be stranded -- it just is not billed twice.
    const fresh = claimNonce("click", resolved.nonce);
    if (fresh) {
      const db = await getRuntimeDb();
      await recordClick(db, resolved.campaignId, resolved.ctx, new Date(), {
        creativeId: resolved.creativeId,
        inventoryClass: resolved.inventoryClass,
      });
    }
    const target = safeRedirect(await targetUrlFor(resolved.campaignId), origin);
    return NextResponse.json({ ok: true, duplicate: !fresh, redirectUrl: target });
  } catch {
    return NextResponse.json({ error: "Failed to record click" }, { status: 500 });
  }
}

/**
 * The link target of every ad.
 *
 * The slot's anchor points here rather than at the advertiser, so the browser
 * does the navigating: a plain click, a middle click, cmd/ctrl-click and
 * "Open link in new tab" all work and all count exactly once. The previous
 * design called preventDefault on plain clicks, POSTed, then assigned
 * location.href -- which forced every external ad into the current tab despite
 * its own target="_blank", made the visitor wait for the round trip, and
 * recorded nothing at all for modifier-clicks, since the handler bailed out and
 * the href went straight to the advertiser.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const verified = await verifyTrackingTokenDetailed(token);
  if (!verified) {
    return NextResponse.redirect(new URL("/", origin), 302);
  }
  const { payload, expired } = verified;

  try {
    // An expired token was still genuinely ours: send the visitor to the ad
    // they clicked, and simply do not bill it.
    if (!expired && claimNonce("click", payload.n)) {
      const limit = await enforceRateLimit("ads_click", clientIp(request));
      if (limit.allowed) {
        // Device, host and session come from the request itself. They used to
        // be read from query parameters, which any visitor could rewrite to
        // attribute their click to a different device or session.
        const server = resolveServerAdContext(request);
        const ctx = buildContext(
          {
            placement: payload.pl,
            section: payload.sec,
            pageType: payload.pg,
            language: (request.nextUrl.searchParams.get("locale") as TrackRequest["language"]) ?? "ar",
          },
          server,
        );
        if (isValidPlacement(ctx.placement)) {
          const db = await getRuntimeDb();
          await recordClick(db, payload.cid, ctx, new Date(), {
            creativeId: payload.cr ?? null,
            inventoryClass: payload.ic ?? "commercial",
          });
        }
      }
    }
    const target = safeRedirect(await targetUrlFor(payload.cid), origin);
    return NextResponse.redirect(target, 302);
  } catch {
    return NextResponse.redirect(new URL("/", origin), 302);
  }
}
