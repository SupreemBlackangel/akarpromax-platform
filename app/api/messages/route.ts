import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messageThreads, messageParticipants, messages } from '@/lib/db/schemas/messages-schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });

    const threads = await db.select()
      .from(messageThreads)
      .innerJoin(messageParticipants, eq(messageParticipants.threadId, messageThreads.id))
      .where(eq(messageParticipants.userId, session.userId))
      .orderBy(desc(messageThreads.updatedAt));

    return NextResponse.json({ success: true, data: threads });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'فشل في جلب المحادثات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });

    const body = await request.json();

    if (body.recipientId && body.recipientId === session.userId) {
      return NextResponse.json({ success: false, error: 'لا يمكنك مراسلة نفسك' }, { status: 400 });
    }

    // Contextual conversations (e.g. a property enquiry) are deduplicated: the
    // same visitor asking about the same listing reopens the existing thread
    // instead of creating a new one on every click.
    if (body.recipientId && body.contextId && body.context) {
      const existing = await db.select({ id: messageThreads.id })
        .from(messageThreads)
        .innerJoin(messageParticipants, eq(messageParticipants.threadId, messageThreads.id))
        .where(and(
          eq(messageThreads.context, body.context),
          eq(messageThreads.contextId, body.contextId),
          eq(messageParticipants.userId, session.userId),
        ))
        .limit(1);
      if (existing[0]) {
        const [thread] = await db.select().from(messageThreads).where(eq(messageThreads.id, existing[0].id)).limit(1);
        return NextResponse.json({ success: true, data: thread, existing: true });
      }
    }

    const [thread] = await db.insert(messageThreads).values({
      title: body.title,
      context: body.context || 'general',
      contextId: body.contextId || null,
    }).returning();

    await db.insert(messageParticipants).values({ threadId: thread.id, userId: session.userId });
    if (body.recipientId) {
      await db.insert(messageParticipants).values({ threadId: thread.id, userId: body.recipientId });
    }

    if (body.content) {
      await db.insert(messages).values({ threadId: thread.id, senderId: session.userId, content: body.content });
    }

    return NextResponse.json({ success: true, data: thread });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'فشل في إنشاء المحادثة' }, { status: 500 });
  }
}
