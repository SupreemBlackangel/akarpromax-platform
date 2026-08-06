import { NextRequest, NextResponse } from "next/server";

import { getProviderProfileById, listProviderCategories, listPortfolioItems, providerReviews } from "@/lib/services/marketplace";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const profile = await getProviderProfileById(id);
  if (!profile) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }
  const providerUserId = String(profile.user_id);
  const [categories, portfolio, reviews] = await Promise.all([
    listProviderCategories(id),
    listPortfolioItems(id),
    providerReviews(providerUserId),
  ]);
  return NextResponse.json(
    { profile, categories, portfolio, rating: reviews },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } },
  );
}
