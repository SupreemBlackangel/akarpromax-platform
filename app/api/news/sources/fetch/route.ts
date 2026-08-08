import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { ingestSource } from "@/lib/news/ingestion";
import { checkRateLimit } from "@/lib/amrs/security";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

const SOURCE_PERMISSION = PERMISSIONS.NEWS_SOURCES_MANAGE;

export async function POST(request: NextRequest) {
  const rate = checkRateLimit("api:news:sources:fetch", { maxRequests: 30, windowMs: 60 * 1000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, SOURCE_PERMISSION)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const id = String(body.sourceId ?? "").slice(0, 80);
  if (!id) return NextResponse.json({ error: "sourceId required" }, { status: 400 });

  const summary = await ingestSource(id);
  return NextResponse.json(summary, summary.fetched ? { status: 200 } : { status: 422 });
}
