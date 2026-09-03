import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";
import { matchAds } from "@/lib/ads/engine";
import { buildContext, isValidPlacement, type MatchRequest } from "@/lib/ads/context";
import { cached, cacheKey } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as MatchRequest | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const ctx = buildContext(body);
  if (!isValidPlacement(ctx.placement)) {
    return NextResponse.json({ error: "A valid placement is required" }, { status: 400 });
  }
  try {
    const db = await getRuntimeDb();
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
      placement: ctx.placement,
      section: ctx.section,
      pageType: ctx.pageType,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ ads: [] }, { status: 200, headers: { "Cache-Control": "public, max-age=10" } });
  }
}
