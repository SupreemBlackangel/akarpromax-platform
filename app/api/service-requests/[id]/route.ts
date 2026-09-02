import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getProviderProfileByUserId, getRequestDetail, getRequestFull, listRequestMatches, updateRequest } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";
import { boundedNumber, MONEY } from "@/lib/services/numbers";

export const dynamic = "force-dynamic";

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}


type Params = { params: Promise<{ id: string }> };

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

  const request = await getRequestDetail(id);
  return NextResponse.json({ request }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const existing = await getRequestFull(id);
  if (!existing) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }
  const isCustomer = String(existing.customer_user_id) === identity.email;
  const isAdmin = hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL);
  if (!isCustomer && !isAdmin) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  try {
    await updateRequest(
      id,
      {
        title: body.title === undefined ? undefined : clean(body.title, 300),
        description: body.description === undefined ? undefined : clean(body.description, 4000),
        budgetMin: body.budgetMin === undefined ? undefined : boundedNumber(body.budgetMin, MONEY),
        budgetMax: body.budgetMax === undefined ? undefined : boundedNumber(body.budgetMax, MONEY),
        urgency: body.urgency === undefined ? undefined : clean(body.urgency, 24),
        preferredPeriod: body.preferredPeriod === undefined ? undefined : clean(body.preferredPeriod, 200),
        needsVisit: body.needsVisit === undefined ? undefined : body.needsVisit === true,
        accessNotes: body.accessNotes === undefined ? undefined : clean(body.accessNotes, 1000),
        shortAddress: body.shortAddress === undefined ? undefined : clean(body.shortAddress, 300),
        preferredDate: body.preferredDate === undefined ? undefined : clean(body.preferredDate, 40),
        answers: body.answers === undefined ? undefined : Array.isArray(body.answers) ? (body.answers as Array<{ key: string; label?: string | null; type?: string | null; value?: string | null }>) : null,
      },
      { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_NOT_EDITABLE") {
      return NextResponse.json({ error: "request_not_editable" }, { status: 400 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
