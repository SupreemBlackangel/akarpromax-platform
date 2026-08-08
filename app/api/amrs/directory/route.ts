import { NextRequest, NextResponse } from "next/server";
import { searchDirectory, getDirectoryEntry, getDirectoryStats } from "@/lib/amrs/directory";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;

  if (q.has("stats")) {
    const stats = await getDirectoryStats();
    return NextResponse.json(stats, { headers: { "Cache-Control": "public, max-age=300" } });
  }

  if (q.has("id")) {
    const entry = await getDirectoryEntry(q.get("id")!);
    if (!entry) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(entry, { headers: { "Cache-Control": "public, max-age=60" } });
  }

  const result = await searchDirectory({
    entityType: (q.get("entityType") as "user" | "professional" | "organization") ?? undefined,
    organizationType: (q.get("organizationType") as "real_estate" | "business" | "other") ?? undefined,
    classification: (q.get("classification") as "startup" | "sme" | "established" | "enterprise") ?? undefined,
    reputationLevel: (q.get("reputationLevel") as "new" | "rising" | "distinguished" | "gold" | "promax") ?? undefined,
    countryCode: q.get("country") ?? undefined,
    cityId: q.get("city") ?? undefined,
    search: q.get("q") ?? undefined,
    sortBy: (q.get("sortBy") as "name" | "rating" | "reputation" | "created") ?? undefined,
    sortDir: (q.get("sortDir") as "asc" | "desc") ?? undefined,
    limit: q.has("limit") ? parseInt(q.get("limit")!, 10) : undefined,
    offset: q.has("offset") ? parseInt(q.get("offset")!, 10) : undefined,
  });

  return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=30" } });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, OPTIONS" } });
}
