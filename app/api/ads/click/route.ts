import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";
import { recordClick } from "@/lib/ads/events";
import { resolveTrackRequest, type TrackRequest } from "@/lib/ads/track";
import { buildContext, isValidPlacement } from "@/lib/ads/context";
import { verifyTrackingToken } from "@/lib/ads/events";

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
    await recordClick(db, resolved.campaignId, resolved.ctx);
    const row = await db
      .prepare("SELECT target_url FROM ad_campaigns WHERE id = ?1 LIMIT 1")
      .bind(resolved.campaignId)
      .first<{ target_url: string }>();
    return NextResponse.json({ ok: true, redirectUrl: row?.target_url || "/" });
  } catch {
    return NextResponse.json({ error: "Failed to record click" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const payload = await verifyTrackingToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin), 302);
  }
  const ctx = buildContext({
    placement: payload.pl,
    section: payload.sec,
    pageType: payload.pg,
    sessionId: request.nextUrl.searchParams.get("session") ?? undefined,
    countryCode: request.nextUrl.searchParams.get("country") ?? undefined,
    language: (request.nextUrl.searchParams.get("locale") as TrackRequest["language"]) ?? "ar",
    deviceType: (request.nextUrl.searchParams.get("device") as TrackRequest["deviceType"]) ?? "desktop",
  });
  if (!isValidPlacement(ctx.placement)) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin), 302);
  }
  try {
    const db = await getRuntimeDb();
    await recordClick(db, payload.cid, ctx);
    const row = await db
      .prepare("SELECT target_url FROM ad_campaigns WHERE id = ?1 LIMIT 1")
      .bind(payload.cid)
      .first<{ target_url: string }>();
    const target = row?.target_url || "/";
    return NextResponse.redirect(target.startsWith("/") ? new URL(target, request.nextUrl.origin) : target, 302);
  } catch {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin), 302);
  }
}
