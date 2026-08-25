import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/identity-auth";
import { isThreadParticipant, markThreadRead, threadMessages } from "@services/marketplace";
import { isMessageContext } from "@services/message-contexts";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ threadType: string; threadId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { threadType, threadId } = await params;
  if (!isMessageContext(threadType)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const participant = await isThreadParticipant(threadType, threadId, identity.email);
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
  if (!isMessageContext(threadType)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const participant = await isThreadParticipant(threadType, threadId, identity.email);
  if (!participant) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  await markThreadRead(threadType, threadId, identity.email);
  return NextResponse.json({ ok: true });
}
