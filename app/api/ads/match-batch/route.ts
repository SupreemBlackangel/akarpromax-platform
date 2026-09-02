import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";
import { matchAdsBatch } from "@/lib/ads/engine";
import { buildContext, isValidPlacement, type MatchRequest } from "@/lib/ads/context";
import type { AdMatchResult } from "@/lib/ads/types";
import { resolveServerAdContext } from "@/lib/ads/server-context";

export const dynamic = "force-dynamic";

type BatchBody = {
  contexts: MatchRequest[];
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as BatchBody | null;
  if (!body || typeof body !== "object" || !Array.isArray(body.contexts)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const contexts = body.contexts.slice(0, 40);
  // Derive what the request proves (device, host, signed session) once, then
  // apply it to every context in the batch.
  const server = resolveServerAdContext(request, contexts[0]?.countryCode);
  const resolved = contexts.map((context) => buildContext(context, server));
  for (const ctx of resolved) {
    if (!isValidPlacement(ctx.placement)) {
      return NextResponse.json({ error: "Every context requires a valid placement" }, { status: 400 });
    }
  }
  try {
    const db = await getRuntimeDb();
    const results: { placement: string; ads: AdMatchResult[] }[] = [];
    const flat = await matchAdsBatch(db, resolved);
    const byPlacement = new Map<string, AdMatchResult[]>();
    for (const ad of flat) {
      const list = byPlacement.get(ad.placement) ?? [];
      list.push(ad);
      byPlacement.set(ad.placement, list);
    }
    for (const ctx of resolved) {
      results.push({ placement: ctx.placement, ads: byPlacement.get(ctx.placement) ?? [] });
    }
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    // First visit in this browser: hand back the signed session id so the next
    // request is recognised instead of counting as a brand-new "unique" user.
    if (server.issuedSessionCookie) headers["Set-Cookie"] = server.issuedSessionCookie;
    return NextResponse.json({ results }, { headers });
  } catch {
    return NextResponse.json({ results: resolved.map((ctx) => ({ placement: ctx.placement, ads: [] })) }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
