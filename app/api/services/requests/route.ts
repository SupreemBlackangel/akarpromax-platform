import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, requireAuthenticatedEmail } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { createRequest, listRequests } from "@/lib/services/core";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const country = q.get("country") ?? undefined;
  const city = q.get("city") ?? undefined;
  const category = q.get("categoryId") ?? undefined;
  const status = q.get("status") ?? undefined;
  const customer = q.get("customerUserId") ?? undefined;
  const requests = await listRequests({ countryCode: country, cityId: city, categoryId: category, status, customerUserId: customer });
  return NextResponse.json({ requests });
}

type RequestBody = {
  categoryId?: string;
  countryCode?: string;
  cityId?: string;
  districtId?: string | null;
  titleKey?: string | null;
  descriptionKey?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!identity.authenticated) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!identity.permissions.includes(PERMISSIONS.SERVICES_CREATE) && identity.role === "viewer") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const userId = requireAuthenticatedEmail(identity);

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  if (!body.categoryId || !body.countryCode || !body.cityId) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }

  const id = await createRequest(
    {
      customerUserId: userId,
      categoryId: body.categoryId,
      countryCode: body.countryCode,
      cityId: body.cityId,
      districtId: body.districtId ?? null,
      titleKey: body.titleKey ?? null,
      descriptionKey: body.descriptionKey ?? null,
      budgetMin: body.budgetMin ?? null,
      budgetMax: body.budgetMax ?? null,
      currency: body.currency ?? "OMR",
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
    },
    { userId, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
  );
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}

