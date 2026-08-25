import { NextRequest, NextResponse } from "next/server";
import { authenticateOfficeRequest } from "@/lib/integration/office-auth";
import { getSponsorSubscriptionSnapshot } from "@/lib/integration/subscription";

export const dynamic = "force-dynamic";

/**
 * GET /api/office/v1/subscription
 *
 * Authenticated with the existing Office device credential
 * (Authorization: Bearer apd_..., x-protocol-version, x-app-version) through
 * the shared `authenticateOfficeRequest` helper — no second auth system, no
 * shared signature, no user token in the query string.
 *
 * No scope gate: subscription status is not an optional feature. Every paired
 * device needs to know whether its own sponsor's subscription is live, and
 * the scope list stored on a credential is fixed at pairing time, so gating
 * this on a new scope would lock out every already-paired device.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;

  const snapshot = await getSponsorSubscriptionSnapshot(auth.device.sponsorId);
  return NextResponse.json(snapshot);
}
