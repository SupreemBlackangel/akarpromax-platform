import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { markThreadRead, threadMessages } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ threadType: string; threadId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { threadType, threadId } = await params;
  if (threadType !== "request" && threadType !== "order") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const db = await getRuntimeDb();
  const participant = await participantCheck(db, threadType, threadId, identity.email);
  if (!participant) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const messages = await threadMessages(threadType, threadId);
  await markThreadRead(threadType, threadId, identity.email);
  return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(_request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { threadType, threadId } = await params;
  if (threadType !== "request" && threadType !== "order") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const db = await getRuntimeDb();
  const participant = await participantCheck(db, threadType, threadId, identity.email);
  if (!participant) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  await markThreadRead(threadType, threadId, identity.email);
  return NextResponse.json({ ok: true });
}

async function participantCheck(db: { prepare: (sql: string) => { bind: (...args: unknown[]) => { first: <T>() => Promise<T | null> } } }, threadType: string, threadId: string, userId: string) {
  if (threadType === "order") {
    const order = await db.prepare("SELECT customer_user_id, provider_user_id FROM service_orders WHERE id = ?1").bind(threadId).first<{ customer_user_id: string; provider_user_id: string }>();
    return !!order && (order.customer_user_id === userId || order.provider_user_id === userId);
  }
  const requestRow = await db.prepare("SELECT customer_user_id FROM service_requests WHERE id = ?1").bind(threadId).first<{ customer_user_id: string }>();
  if (!requestRow) return false;
  if (requestRow.customer_user_id === userId) return true;
  const offer = await db
    .prepare("SELECT id FROM service_offers WHERE request_id = ?1 AND provider_user_id = ?2 AND status != 'withdrawn' LIMIT 1")
    .bind(threadId, userId)
    .first<{ id: string }>();
  return !!offer;
}
