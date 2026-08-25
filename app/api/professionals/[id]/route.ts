import { NextRequest, NextResponse } from "next/server";

// Compatibility alias for the historical provider URL. The canonical public
// serializer owns the response so this route can never reintroduce raw rows,
// contact data, account identifiers or unapproved providers.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  url.pathname = `/api/service-providers/${encodeURIComponent(id)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  return new NextResponse(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
}
