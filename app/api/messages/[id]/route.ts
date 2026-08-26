import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, messageParticipants } from '@/lib/db/schemas/messages-schema';
import { and, eq, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

async function isActiveParticipant(threadId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: messageParticipants.id })
    .from(messageParticipants)
    .where(and(
      eq(messageParticipants.threadId, threadId),
      eq(messageParticipants.userId, userId),
      eq(messageParticipants.isActive, true),
    ))
    .limit(1);
  return Boolean(row);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    if (!(await isActiveParticipant(id, session.userId))) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 403 });
    }
    const msgs = await db.select().from(messages).where(eq(messages.threadId, id)).orderBy(desc(messages.createdAt));
    return NextResponse.json({ success: true, data: msgs });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'فشل في جلب الرسائل' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    if (!(await isActiveParticipant(id, session.userId))) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 403 });
    }
    const body = await request.json();
    const [msg] = await db.insert(messages).values({
      threadId: id, senderId: session.userId, content: body.content,
    }).returning();
    return NextResponse.json({ success: true, data: msg });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'فشل في ارسال الرسالة' }, { status: 500 });
  }
}
