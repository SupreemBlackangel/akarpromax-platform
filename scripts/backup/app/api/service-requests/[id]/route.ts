import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRequestDetail, getRequestFull, updateRequest } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const request = await getRequestDetail(id);
  if (!request) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }
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
        title: body.title === undefined ? null : clean(body.title, 300),
        description: body.description === undefined ? null : clean(body.description, 4000),
        budgetMin: body.budgetMin === undefined ? null : cleanNumber(body.budgetMin),
        budgetMax: body.budgetMax === undefined ? null : cleanNumber(body.budgetMax),
        urgency: body.urgency === undefined ? null : clean(body.urgency, 24),
        preferredPeriod: body.preferredPeriod === undefined ? null : clean(body.preferredPeriod, 200),
        needsVisit: body.needsVisit === undefined ? null : body.needsVisit === true,
        accessNotes: body.accessNotes === undefined ? null : clean(body.accessNotes, 1000),
        shortAddress: body.shortAddress === undefined ? null : clean(body.shortAddress, 300),
        preferredDate: body.preferredDate === undefined ? null : clean(body.preferredDate, 40),
        answers: body.answers === undefined ? null : Array.isArray(body.answers) ? (body.answers as Array<{ key: string; label?: string | null; type?: string | null; value?: string | null }>) : null,
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
