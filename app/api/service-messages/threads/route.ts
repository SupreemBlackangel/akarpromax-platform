import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/identity-auth";
import { listInbox, startMessageThread } from "@services/marketplace";
import { isMessageContext } from "@services/message-contexts";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const threads = await listInbox(identity.email);
  return NextResponse.json({ threads }, { headers: { "Cache-Control": "no-store" } });
}

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
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : null;
  const contextLink = typeof body.contextLink === "string" ? body.contextLink.trim().slice(0, 500) : null;
  const participantIds = Array.isArray(body.participantIds)
    ? body.participantIds.filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim())
    : [];
  if (!isMessageContext(threadType) || !threadId) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const thread = await startMessageThread({
    threadType,
    threadId,
    title,
    contextLink,
    participantIds,
    actorUserId: identity.email,
  });
  return NextResponse.json({ thread }, { status: 201 });
}
