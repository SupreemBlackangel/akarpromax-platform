import { NextRequest, NextResponse } from "next/server";
import { getLand, deleteLand } from "@/lib/land/saved-land";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const land = getLand(id);
  if (!land) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(land);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerId = request.nextUrl.searchParams.get("ownerId");
  if (!ownerId) {
    return NextResponse.json({ error: "MISSING_OWNER" }, { status: 400 });
  }
  const deleted = deleteLand(id, ownerId);
  if (!deleted) {
    return NextResponse.json({ error: "NOT_FOUND_OR_FORBIDDEN" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, DELETE, OPTIONS" } });
}
