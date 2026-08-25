import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { canAccessAmrsAdmin } from "@/lib/amrs/access";
import { getSession } from "@/lib/auth/session";
import { getSessionIdentity } from "@/lib/sponsor-auth";
import { createOrganization, listOrganizations } from "@/lib/amrs/organization";
import { getDb } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";

export const dynamic = "force-dynamic";

const ORG_TYPES = ["real_estate", "law_office", "business", "other"] as const;
const CLASSIFICATIONS = ["startup", "sme", "established", "enterprise"] as const;
const STATUSES = ["draft", "pending_review", "active", "rejected", "suspended", "deleted"] as const;

function validCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export async function GET(request: NextRequest) {
  await ensurePgIdentitySchema();

  const q = request.nextUrl.searchParams;
  const typeParam = q.get("type");
  const type = ORG_TYPES.includes(typeParam as (typeof ORG_TYPES)[number])
    ? (typeParam as (typeof ORG_TYPES)[number])
    : undefined;

  if (q.get("mine") === "1") {
    const session = await getSession(request.headers.get("cookie") ?? undefined);
    if (!session?.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { db, end } = getDb();
    try {
      const conditions = [
        eq(organizationMembers.userId, session.userId),
        eq(organizationMembers.status, "active"),
      ];
      if (type) conditions.push(eq(organizations.type, type));

      const rows = await db
        .select({
          organization: organizations,
          membership: {
            id: organizationMembers.id,
            role: organizationMembers.role,
            status: organizationMembers.status,
            joinedAt: organizationMembers.joinedAt,
          },
        })
        .from(organizationMembers)
        .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(and(...conditions));

      return NextResponse.json(
        { organizations: rows.map((row) => ({ ...row.organization, membership: row.membership })), total: rows.length },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    } finally {
      await end();
    }
  }

  const identity = await getSessionIdentity();
  const requestedStatusParam = q.get("status");
  const requestedStatus = STATUSES.includes(requestedStatusParam as (typeof STATUSES)[number])
    ? (requestedStatusParam as (typeof STATUSES)[number])
    : undefined;

  const status = canAccessAmrsAdmin(identity) ? requestedStatus : "active";
  const countryCode = q.get("country") ?? undefined;
  const parsedLimit = Number.parseInt(q.get("limit") ?? "20", 10);
  const parsedOffset = Number.parseInt(q.get("offset") ?? "0", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 20;
  const offset = Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0;

  const result = await listOrganizations({ type, status, countryCode, limit, offset });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  await ensurePgIdentitySchema();

  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session?.userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const type = String(body.type ?? "");
  const classification = String(body.classification ?? "");
  const countryCode = String(body.countryCode ?? "").trim().toUpperCase();
  const nameAr = typeof body.nameAr === "string" ? body.nameAr.trim() : "";
  const nameEn = typeof body.nameEn === "string" ? body.nameEn.trim() : "";

  if (!ORG_TYPES.includes(type as (typeof ORG_TYPES)[number])) {
    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
  }
  if (!CLASSIFICATIONS.includes(classification as (typeof CLASSIFICATIONS)[number])) {
    return NextResponse.json({ error: "INVALID_CLASSIFICATION" }, { status: 400 });
  }
  if (!nameAr && !nameEn) {
    return NextResponse.json({ error: "ORGANIZATION_NAME_REQUIRED" }, { status: 400 });
  }
  if (!/^[A-Z0-9-]{2,8}$/.test(countryCode)) {
    return NextResponse.json({ error: "INVALID_COUNTRY" }, { status: 400 });
  }
  if (body.latitude !== undefined && !validCoordinate(body.latitude, -90, 90)) {
    return NextResponse.json({ error: "INVALID_LATITUDE" }, { status: 400 });
  }
  if (body.longitude !== undefined && !validCoordinate(body.longitude, -180, 180)) {
    return NextResponse.json({ error: "INVALID_LONGITUDE" }, { status: 400 });
  }

  try {
    const result = await createOrganization(
      {
        nameAr: nameAr || undefined,
        nameEn: nameEn || undefined,
        nameTr: typeof body.nameTr === "string" ? body.nameTr.trim() : undefined,
        type: type as "real_estate" | "law_office" | "business" | "other",
        classification: classification as "startup" | "sme" | "established" | "enterprise",
        countryCode,
        cityId: typeof body.cityId === "string" ? body.cityId.trim() : undefined,
        districtId: typeof body.districtId === "string" ? body.districtId.trim() : undefined,
        latitude: body.latitude as number | undefined,
        longitude: body.longitude as number | undefined,
        descriptionAr: typeof body.descriptionAr === "string" ? body.descriptionAr : undefined,
        descriptionEn: typeof body.descriptionEn === "string" ? body.descriptionEn : undefined,
        descriptionTr: typeof body.descriptionTr === "string" ? body.descriptionTr : undefined,
        websiteUrl: typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : undefined,
        contactEmail: typeof body.contactEmail === "string" ? body.contactEmail.trim().toLowerCase() : undefined,
        contactPhone: typeof body.contactPhone === "string" ? body.contactPhone.trim() : undefined,
      },
      session.userId,
    );

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (message === "SLUG_GENERATION_FAILED") {
      return NextResponse.json({ error: "SLUG_CONFLICT" }, { status: 409 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
