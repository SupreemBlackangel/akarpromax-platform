import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import {
  createNewsPlacement,
  deleteNewsPlacement,
  listNewsPlacements,
  updateNewsPlacement,
} from "@/lib/news/placements";

export const dynamic = "force-dynamic";

const MANAGE_PERMISSION = PERMISSIONS.NEWS_UPDATE;

export async function GET(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.NEWS_VIEW) && !hasSponsorPermission(identity, MANAGE_PERMISSION)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const newsId = request.nextUrl.searchParams.get("newsId")?.slice(0, 80) || undefined;
  const channel = request.nextUrl.searchParams.get("channel")?.slice(0, 40) || undefined;
  const placements = await listNewsPlacements(newsId, channel);
  return NextResponse.json({ placements });
}

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, MANAGE_PERMISSION)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const newsId = String(body.newsId ?? "").slice(0, 80);
  if (!newsId) return NextResponse.json({ error: "newsId required" }, { status: 400 });
  try {
    const placement = await createNewsPlacement(newsId, body);
    return NextResponse.json({ placement }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: message === "News item not found" ? 404 : 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, MANAGE_PERMISSION)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const id = String(body.id ?? "").slice(0, 80);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const placement = await updateNewsPlacement(id, body);
    return NextResponse.json({ placement });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: message === "Placement not found" ? 404 : 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, MANAGE_PERMISSION)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = String(request.nextUrl.searchParams.get("id") ?? "").slice(0, 80);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteNewsPlacement(id);
  return NextResponse.json({ ok: true });
}
