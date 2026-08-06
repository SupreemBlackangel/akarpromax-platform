import { NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { getProviderProfileByUserId, listProviderCategories, listProviderDocuments, listPortfolioItems } from "@/lib/services/marketplace";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const profile = await getProviderProfileByUserId(identity.email);
  if (!profile) {
    return NextResponse.json({ profile: null });
  }
  const providerId = String(profile.id);
  const [categories, documents, portfolio] = await Promise.all([
    listProviderCategories(providerId),
    listProviderDocuments(providerId),
    listPortfolioItems(providerId),
  ]);
  return NextResponse.json({ profile, categories, documents, portfolio });
}
