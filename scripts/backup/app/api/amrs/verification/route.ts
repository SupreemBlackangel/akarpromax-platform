import { NextRequest, NextResponse } from "next/server";
import { getSessionIdentity } from "@/lib/sponsor-auth";
import { listVerifications, submitVerification, getVerificationSummary } from "@/lib/amrs/verification";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await ensurePgIdentitySchema();
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams;
  const entityType = (q.get("entityType") ?? "user") as "user" | "professional" | "organization";
  const entityId = q.get("entityId") ?? identity.email;

  const records = await listVerifications(entityType, entityId);
  const summary = getVerificationSummary(records);
  return NextResponse.json({ records, summary }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  await ensurePgIdentitySchema();
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const entityType = body.entityType as string;
  const entityId = body.entityId as string;
  const type = body.type as string;

  if (!entityType || !["user", "professional", "organization"].includes(entityType)) {
    return NextResponse.json({ error: "INVALID_ENTITY_TYPE" }, { status: 400 });
  }
  if (!entityId || typeof entityId !== "string") {
    return NextResponse.json({ error: "INVALID_ENTITY_ID" }, { status: 400 });
  }
  if (!type || !["email", "phone", "identity", "professional", "organization", "license"].includes(type)) {
    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
  }

  const record = await submitVerification({
    entityType: entityType as "user" | "professional" | "organization",
    entityId,
    type: type as "email" | "phone" | "identity" | "professional" | "organization" | "license",
    source: "manual",
    countryCode: body.countryCode as string | undefined,
  });

  return NextResponse.json({ ok: true, record }, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
