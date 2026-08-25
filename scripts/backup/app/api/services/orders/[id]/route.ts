import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function proxyToCanonical(request: NextRequest, canonicalPath: string): Promise<NextResponse> {
  const url = new URL(request.url);
  url.pathname = canonicalPath;
  const headers = new Headers(request.headers);
  headers.set("x-forwarded-path", request.nextUrl.pathname);
  return fetch(url.toString(), {
    method: request.method,
    headers,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
    redirect: "manual",
  }).then((res) => new NextResponse(res.body, { status: res.status, statusText: res.statusText, headers: res.headers }));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToCanonical(request, `/api/service-orders/${id}`);
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "PATCH, OPTIONS" } });
}