import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/identity-auth";
import { isThreadParticipant, resolveRecipientUserId, sendMessageFull } from "@services/marketplace";
import { isMessageContext } from "@services/message-contexts";
import { SERVICE_ERROR_CODES } from "@services/constants";

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
  const threadType = typeof body.threadType === "string" ? body.threadType.trim() : "";
  const threadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
  const messageBody = typeof body.body === "string" ? body.body.trim().slice(0, 4000) : "";
  if (!isMessageContext(threadType) || !threadId || !messageBody) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }

  const participant = await isThreadParticipant(threadType, threadId, identity.email);
  if (!participant) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }

  const recipientUserId = await resolveRecipientUserId(threadType, threadId, identity.email);

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
