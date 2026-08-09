import { NextRequest, NextResponse } from "next/server";
import { getResolveResult } from "@/lib/land/resolve-store";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = getResolveResult(id);
  if (!result) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(result);
}

export function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, OPTIONS" } });
}
