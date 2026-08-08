import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { createNewsSource, deleteNewsSource, listNewsSources, updateNewsSource } from "@/lib/news/sources";
import { checkRateLimit } from "@/lib/amrs/security";

export const dynamic = "force-dynamic";

const SOURCE_PERMISSION = PERMISSIONS.NEWS_SOURCES_MANAGE;

export async function GET(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.NEWS_VIEW) && !hasSponsorPermission(identity, SOURCE_PERMISSION)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const sources = await listNewsSources(status ? { status } : undefined);
  return NextResponse.json({ sources });
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit("api:news:sources:create", { maxRequests: 20, windowMs: 60 * 60 * 1000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, SOURCE_PERMISSION)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  try {
    const source = await createNewsSource(body, identity.email);
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, SOURCE_PERMISSION)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const id = String(body.id ?? "").slice(0, 80);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const source = await updateNewsSource(id, body);
    return NextResponse.json({ source });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Source not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, SOURCE_PERMISSION)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = String(request.nextUrl.searchParams.get("id") ?? "").slice(0, 80);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    await deleteNewsSource(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
