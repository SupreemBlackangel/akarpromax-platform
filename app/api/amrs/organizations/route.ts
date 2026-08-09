import { NextRequest, NextResponse } from "next/server";
import { canAccessAmrsAdmin } from "@/lib/amrs/access";
import { getSession } from "@/lib/auth/session";
import { getSessionIdentity } from "@/lib/sponsor-auth";
import { createOrganization, listOrganizations } from "@/lib/amrs/organization";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await ensurePgIdentitySchema();
  const identity = await getSessionIdentity();
  const q = request.nextUrl.searchParams;
  const type = q.get("type") as "real_estate" | "business" | "other" | undefined;
  const requestedStatus = q.get("status") as "draft" | "pending_review" | "active" | "suspended" | "deleted" | undefined;
  const status = canAccessAmrsAdmin(identity) ? requestedStatus : "active";
  const countryCode = q.get("country") ?? undefined;
  const limit = Math.min(parseInt(q.get("limit") ?? "20", 10), 100);
  const offset = parseInt(q.get("offset") ?? "0", 10);

  const result = await listOrganizations({ type, status, countryCode, limit, offset });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  await ensurePgIdentitySchema();
  const identity = await getSessionIdentity();
  const session = await getSession();
  if (!identity.authenticated || !identity.email || !session?.userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const type = body.type as string;
  const classification = body.classification as string;
  const countryCode = body.countryCode as string;

  if (!type || !["real_estate", "business", "other"].includes(type)) {
    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
  }
  if (!classification || !["startup", "sme", "established", "enterprise"].includes(classification)) {
    return NextResponse.json({ error: "INVALID_CLASSIFICATION" }, { status: 400 });
  }
  if (!countryCode || typeof countryCode !== "string") {
    return NextResponse.json({ error: "INVALID_COUNTRY" }, { status: 400 });
  }

  try {
    const result = await createOrganization(
      {
        nameAr: body.nameAr as string | undefined,
        nameEn: body.nameEn as string | undefined,
        nameTr: body.nameTr as string | undefined,
        type: type as "real_estate" | "business" | "other",
        classification: classification as "startup" | "sme" | "established" | "enterprise",
        countryCode,
        cityId: body.cityId as string | undefined,
        districtId: body.districtId as string | undefined,
        latitude: body.latitude as number | undefined,
        longitude: body.longitude as number | undefined,
        descriptionAr: body.descriptionAr as string | undefined,
        descriptionEn: body.descriptionEn as string | undefined,
        descriptionTr: body.descriptionTr as string | undefined,
        websiteUrl: body.websiteUrl as string | undefined,
        contactEmail: body.contactEmail as string | undefined,
        contactPhone: body.contactPhone as string | undefined,
      },
      session.userId,
    );

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    if (message === "SLUG_GENERATION_FAILED") {
      return NextResponse.json({ error: "SLUG_CONFLICT" }, { status: 409 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
