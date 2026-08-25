/**
 * L1C-0 — `/api/service-analytics`.
 *
 * BEFORE: counted rows in the non-canonical Drizzle/PG service tables from
 * `lib/db/schemas/services-schema.ts` (a second Services store) and keyed on
 * `session.userId` (uuid) while the whole marketplace keys on the account
 * email.
 *
 * AFTER: delegates to `getUserServiceAnalytics` in the canonical marketplace
 * domain service, so the counters come from the same `service_requests` /
 * `service_offers` / `service_orders` / `service_reviews` rows the rest of the
 * Services Marketplace reads and writes. Response shape is unchanged.
 */
import { NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { getUserServiceAnalytics } from "@services/marketplace";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getUserServiceAnalytics(identity.email);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[api/service-analytics] error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
