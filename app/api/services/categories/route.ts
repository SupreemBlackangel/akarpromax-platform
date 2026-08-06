import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { createCategory, listCategories } from "@services/core";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get("country") ?? undefined;
  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
  const categories = await listCategories(country, includeInactive);
  return NextResponse.json({ categories });
}

type Body = {
  countryCode?: string;
  code?: string;
  parentId?: string | null;
  sortOrder?: number;
};

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICES_CREATE)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }

  const countryCode = body.countryCode?.trim().toUpperCase();
  const code = body.code?.trim().toLowerCase();
  if (!countryCode || !code) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }

  try {
    const id = await createCategory(
      { countryCode, code, parentId: body.parentId ?? null, sortOrder: body.sortOrder ?? 0 },
      { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
    );
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CATEGORY_CONFLICT") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.CATEGORY_CONFLICT }, { status: 409 });
    }
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
