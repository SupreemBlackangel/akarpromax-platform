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
      cacheKey([
        "ads",
        ctx.placement,
        ctx.section,
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
  } catch {
    return NextResponse.json({ ads: [] }, { status: 200, headers: { "Cache-Control": "public, max-age=10" } });
  }
}
