import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getProviderProfileByUserId, getRequestFull, listRequestHistory, listRequestMatches } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * A request's status history, for the people entitled to see it.
 *
 * This route had no authentication and no ownership check at all: anyone who
 * knew or guessed a request id could read its whole history. `SELECT *` on
 * service_request_status_history returns `changed_by` -- the identifier of the
 * person who made each transition -- alongside a free-text `note` that carries
 * whatever a customer or provider wrote when cancelling or updating. So the
 * exposure was other people's identities and their words, not just a status
 * string.
 *
 * Every sibling route under /api/service-requests/[id] already gated on exactly
 * the rule applied here. This one was simply missed.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getRequestFull(id);
  if (!existing) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }

  const isCustomer = String(existing.customer_user_id) === identity.email;
  const isAdmin = hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL);
  let isMatchedProvider = false;

  // A provider sees the history of a request they were actually matched to --
  // they are a party to it. Being an approved provider is not on its own
  // enough, or every provider could read every request in the marketplace.
  if (!isCustomer && !isAdmin) {
    const provider = await getProviderProfileByUserId(identity.email);
    if (provider?.status === "approved") {
      const matches = await listRequestMatches(id);
      isMatchedProvider = matches.some((match) => String(match.provider_id) === String(provider.id));
    }
  }

  if (!isCustomer && !isAdmin && !isMatchedProvider) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }

  const history = await listRequestHistory(id);
  return NextResponse.json({ history }, { headers: { "Cache-Control": "no-store" } });
}
