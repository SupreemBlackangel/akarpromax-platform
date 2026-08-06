import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, hasSponsorPermission, requireAuthenticatedEmail } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { openDispute, resolveDispute } from "@services/core";
import { SERVICE_ERROR_CODES, isDisputeStatus } from "@services/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICES_VIEW)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const db = await getRuntimeDb();
  const status = request.nextUrl.searchParams.get("status");
  let sql = "SELECT * FROM service_disputes";
  const params: unknown[] = [];
  if (status && isDisputeStatus(status)) {
    params.push(status);
    sql += " WHERE status = ?1";
  }
  sql += " ORDER BY created_at DESC LIMIT 200";
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  return NextResponse.json({ disputes: result.results ?? [] });
}

type Body = {
  orderId?: string;
  reason?: string;
  description?: string | null;
};

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!identity.authenticated) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  if (!body.orderId || !body.reason) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const userId = requireAuthenticatedEmail(identity);
  try {
    const id = await openDispute(
      {
        orderId: body.orderId,
        openedByUserId: userId,
        reason: body.reason,
        description: body.description ?? null,
      },
      {
        userId,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      },
    );
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "DISPUTE_ALREADY_EXISTS") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.DISPUTE_ALREADY_EXISTS }, { status: 409 });
    }
    if (message === "NOT_PARTICIPANT") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_PARTICIPANT }, { status: 403 });
    }
    throw error;
  }
}

type ResolveBody = {
  id?: string;
  resolutionNote?: string;
};

export async function PATCH(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICES_DISPUTE_RESOLVE)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  let body: ResolveBody;
  try {
    body = (await request.json()) as ResolveBody;
  } catch {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const userId = requireAuthenticatedEmail(identity);
  try {
    await resolveDispute(body.id, body.resolutionNote ?? "", {
      userId,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "DISPUTE_NOT_FOUND") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.DISPUTE_NOT_FOUND }, { status: 404 });
    }
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, PATCH, OPTIONS" } });
}
