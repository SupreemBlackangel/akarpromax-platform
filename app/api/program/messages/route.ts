import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { messageThreads, messageParticipants, messages } from "@/lib/db/schemas/messages-schema";
import { verifySessionPayload } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";

export const dynamic = "force-dynamic";

/**
 * Desktop bridge for advertiser enquiries. Website visitors who click "contact
 * the advertiser" on a property create a message thread whose recipient is the
 * property's owner (userId). That owner is the same account the desktop app logs
 * in as (/api/program/login stamps the same user.id it publishes properties
 * with), so the office can read and reply to those enquiries from inside the
 * desktop app through this endpoint — same threads as the website chat widget.
 *
 * Auth: the desktop bearer/X-API-Key session token (same as other /api/program).
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Source",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

async function authUserId(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const token = bearer || request.headers.get("x-api-key") || "";
  if (!token) return null;
  const payload = await verifySessionPayload(token, getRuntimeEnv().sessionSecret);
  return payload?.userId ?? null;
}

async function isParticipant(threadId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: messageParticipants.id })
    .from(messageParticipants)
    .where(and(eq(messageParticipants.threadId, threadId), eq(messageParticipants.userId, userId), eq(messageParticipants.isActive, true)))
    .limit(1);
  return Boolean(row);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const userId = await authUserId(request);
  if (!userId) return json({ success: false, message: "غير مصرح" }, 401);

  const url = new URL(request.url);
  const threadId = url.searchParams.get("threadId");

  // Messages within one thread (the office must be a participant).
  if (threadId) {
    if (!(await isParticipant(threadId, userId))) return json({ success: false, message: "غير مصرح" }, 403);
    const rows = await db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(desc(messages.createdAt));
    return json({ success: true, messages: rows.reverse(), myUserId: userId }, 200);
  }

  // Thread list for this office, newest first, with the last message preview.
  const parts = await db
    .select({ threadId: messageParticipants.threadId })
    .from(messageParticipants)
    .where(and(eq(messageParticipants.userId, userId), eq(messageParticipants.isActive, true)));
  const threadIds = parts.map((p) => p.threadId).filter((v): v is string => Boolean(v));
  if (threadIds.length === 0) return json({ success: true, threads: [] }, 200);

  const threads = await db
    .select()
    .from(messageThreads)
    .where(inArray(messageThreads.id, threadIds))
    .orderBy(desc(messageThreads.updatedAt));

  const lastByThread = new Map<string, { content: string; createdAt: unknown }>();
  const lastRows = await db.select().from(messages).where(inArray(messages.threadId, threadIds)).orderBy(desc(messages.createdAt));
  for (const m of lastRows) {
    if (m.threadId && !lastByThread.has(m.threadId)) lastByThread.set(m.threadId, { content: m.content, createdAt: m.createdAt });
  }

  return json({
    success: true,
    threads: threads.map((t) => ({
      id: t.id,
      title: t.title,
      context: t.context,
      contextId: t.contextId,
      updatedAt: t.updatedAt,
      lastMessage: lastByThread.get(t.id)?.content ?? null,
    })),
  }, 200);
}

export async function POST(request: Request) {
  const userId = await authUserId(request);
  if (!userId) return json({ success: false, message: "غير مصرح" }, 401);

  const body = (await request.json().catch(() => null)) as { threadId?: string; content?: string } | null;
  const threadId = typeof body?.threadId === "string" ? body.threadId : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!threadId || !content) return json({ success: false, message: "المحتوى مطلوب" }, 400);
  if (!(await isParticipant(threadId, userId))) return json({ success: false, message: "غير مصرح" }, 403);

  const [msg] = await db.insert(messages).values({ threadId, senderId: userId, content: content.slice(0, 4000) }).returning();
  await db.update(messageThreads).set({ updatedAt: new Date() }).where(eq(messageThreads.id, threadId));
  return json({ success: true, message: msg }, 201);
}
