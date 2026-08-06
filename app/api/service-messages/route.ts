import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { sendMessageFull } from "@/lib/services/marketplace";
import { getRuntimeDb } from "@/lib/runtime-db";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const threadType = body.threadType === "order" ? "order" : body.threadType === "request" ? "request" : "";
  const threadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
  const messageBody = typeof body.body === "string" ? body.body.trim().slice(0, 4000) : "";
  if (!threadType || !threadId || !messageBody) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }

  const db = await getRuntimeDb();
  let recipientUserId: string | null = null;
  if (threadType === "order") {
    const order = await db.prepare("SELECT customer_user_id, provider_user_id FROM service_orders WHERE id = ?1").bind(threadId).first<{ customer_user_id: string; provider_user_id: string }>();
    if (!order) return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
    if (order.customer_user_id !== identity.email && order.provider_user_id !== identity.email) {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
    }
    recipientUserId = order.customer_user_id === identity.email ? order.provider_user_id : order.customer_user_id;
  } else {
    const requestRow = await db.prepare("SELECT customer_user_id FROM service_requests WHERE id = ?1").bind(threadId).first<{ customer_user_id: string }>();
    if (!requestRow) return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
    recipientUserId = requestRow.customer_user_id;
  }

  const id = await sendMessageFull(
    {
      threadType,
      threadId,
      senderUserId: identity.email,
      body: messageBody,
      recipientUserId,
    },
    { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
  );
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
