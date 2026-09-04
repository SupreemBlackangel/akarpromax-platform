import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";
import { matchAds } from "@/lib/ads/engine";
import { buildContext, isValidPlacement, type MatchRequest } from "@/lib/ads/context";
import { cached, cacheKey } from "@/lib/cache";
import { resolveClaimedGeo } from "@/lib/ads/geo-authority";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as MatchRequest | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  // Built from the raw body so the placement can be validated and so the catch
  // below still has something to name when the failure happens before the
  // registry has been consulted.
  const claimed = buildContext(body);
  if (!isValidPlacement(claimed.placement)) {
    return NextResponse.json({ error: "A valid placement is required" }, { status: 400 });
  }
  try {
    const db = await getRuntimeDb();

    // The registry decides where the visitor is, not the request body. A
    // campaign targeting only Jeddah was served -- and billed -- to a body
    // claiming countryCode "eg" with cityId "jeddah", and to one claiming no
    // country at all. See lib/ads/geo-authority.ts.
    const geo = await resolveClaimedGeo(db, {
      countryCode: body.countryCode,
      regionId: body.regionId == null ? undefined : String(body.regionId),
      cityId: body.cityId == null ? undefined : String(body.cityId),
      districtId: body.districtId == null ? undefined : String(body.districtId),
    });
    const ctx = buildContext({ ...body, ...geo });
    const count = Math.max(1, Math.min(6, Number(body.count) || 1));
    const ads = await cached(
      // Every field the matching depends on must be in the key. It previously
      // omitted pageType, channel, deviceType and operatingSystem while
      // isPageTypeMatch, isChannelMatch, isDeviceMatch and isOsMatch all read
      // them -- so a desktop-only campaign cached for one visitor was served to
      // a phone, and a phone's empty result was served to every desktop for the
      // next thirty seconds.
      cacheKey([
        "ads",
        ctx.placement,
        ctx.section,
        ctx.pageType,
        ctx.channel,
        ctx.deviceType,
        ctx.operatingSystem,
        ctx.entityType,
        ctx.entityId,
        ctx.categoryId,
        ctx.countryCode,
        ctx.regionId,
        ctx.cityId,
        ctx.districtId,
        ctx.latitude?.toFixed(4),
        ctx.longitude?.toFixed(4),
        ctx.language,
        count,
      ]),
      30_000,
      () => matchAds(db, ctx, { count }),
    );
    return NextResponse.json({ ads }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  } catch (error) {
    // The empty list stays -- a page must not break because an ad could not be
    // chosen -- but the reason is no longer thrown away.
    //
    // This swallowed every failure as a successful "no ads", which is why
    // "approved ads are not appearing" could not be diagnosed from the outside:
    // a broken query, a schema drift and a genuinely empty match all produced
    // the same 200 with the same body.
    console.error("[ads/match] failed", {
      placement: claimed.placement,
      section: claimed.section,
      pageType: claimed.pageType,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ ads: [] }, { status: 200, headers: { "Cache-Control": "public, max-age=10" } });
  }
}
