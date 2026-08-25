import { NextRequest, NextResponse } from "next/server";

import { getProviderProfileById, listProviderCategories, listPortfolioItems, listReviews, PROVIDER_STATUS } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";
import {
  toPublicPortfolioItem,
  toPublicProviderCategory,
  toPublicProviderProfile,
  toPublicServiceReview,
} from "@services/public-dto";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const profile = await getProviderProfileById(id);
  if (!profile || profile.status !== PROVIDER_STATUS.APPROVED) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }
  const [categories, portfolio, reviews] = await Promise.all([
    listProviderCategories(id),
    listPortfolioItems(id),
    listReviews({ revieweeUserId: String(profile.user_id), limit: 100 }),
  ]);
  return NextResponse.json(
    {
      profile: toPublicProviderProfile(profile),
      categories: categories.map(toPublicProviderCategory),
      portfolio: portfolio.map(toPublicPortfolioItem),
      reviews: reviews.map(toPublicServiceReview),
      rating: {
        ratingAvg: Number(profile.rating_avg ?? 0),
        ratingCount: Number(profile.rating_count ?? 0),
      },
    },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } },
  );
}
