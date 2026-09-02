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

  // An unknown placement fails only its own slot. Rejecting the whole batch
  // meant one typo in one new page family blanked every ad on that page —
  // a page-wide outage caused by a single slot.
  const servable = resolved.map((ctx) => isValidPlacement(ctx.placement));
  if (!servable.some(Boolean)) {
    return NextResponse.json({ error: "No context has a valid placement" }, { status: 400 });
  }

  try {
    const db = await getRuntimeDb();
    // Aligned by index, not regrouped by placement: a page may legitimately
    // render the same placement twice (a desktop rail and its mobile twin), and
    // regrouping handed each occurrence the other's campaign too.
    const servableIndexes = resolved.map((_, index) => index).filter((index) => servable[index]);
    const matched = await matchAdsBatch(
      db,
      servableIndexes.map((index) => resolved[index]),
      { counts: servableIndexes.map((index) => Number(contexts[index].count) || 1) },
    );
    const adsByIndex = new Map<number, AdMatchResult[]>();
    servableIndexes.forEach((index, position) => adsByIndex.set(index, matched[position] ?? []));

    const results = resolved.map((ctx, index) => ({
      placement: ctx.placement,
      ads: adsByIndex.get(index) ?? [],
    }));
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    // First visit in this browser: hand back the signed session id so the next
    // request is recognised instead of counting as a brand-new "unique" user.
    if (server.issuedSessionCookie) headers["Set-Cookie"] = server.issuedSessionCookie;
    return NextResponse.json({ results }, { headers });
  } catch {
    return NextResponse.json({ results: resolved.map((ctx) => ({ placement: ctx.placement, ads: [] })) }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
