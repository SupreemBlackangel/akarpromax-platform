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
