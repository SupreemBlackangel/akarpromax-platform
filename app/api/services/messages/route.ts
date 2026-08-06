import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, requireAuthenticatedEmail } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { sendMessage, threadMessages } from "@services/core";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Body = {
  threadType?: "request" | "order";
  threadId?: string;
  body?: string;
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
  if (body.threadType !== "request" && body.threadType !== "order") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  if (!body.threadId || !body.body) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const userId = requireAuthenticatedEmail(identity);
  const id = await sendMessage(
    {
      threadType: body.threadType,
      threadId: body.threadId,
      senderUserId: userId,
      body: body.body,
    },
    {
      userId,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    },
  );
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!identity.authenticated) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const threadType = request.nextUrl.searchParams.get("threadType");
  const threadId = request.nextUrl.searchParams.get("threadId");
  if (threadType !== "request" && threadType !== "order") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_QUERY }, { status: 400 });
  }
  if (!threadId) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_QUERY }, { status: 400 });
  }

  const db = await getRuntimeDb();
  if (threadType === "order") {
    const order = await db.prepare("SELECT * FROM service_orders WHERE id = ?1").bind(threadId).first<Record<string, unknown>>();
    if (!order) return NextResponse.json({ error: SERVICE_ERROR_CODES.ORDER_NOT_FOUND }, { status: 404 });
    if (order.customer_user_id !== identity.email && order.provider_user_id !== identity.email) {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_PARTICIPANT }, { status: 403 });
    }
  } else {
    const row = await db.prepare("SELECT * FROM service_requests WHERE id = ?1").bind(threadId).first<Record<string, unknown>>();
    if (!row) return NextResponse.json({ error: SERVICE_ERROR_CODES.REQUEST_NOT_FOUND }, { status: 404 });
  }

  const messages = await threadMessages(threadType, threadId);
  return NextResponse.json({ messages });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
