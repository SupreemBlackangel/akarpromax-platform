import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schemas/messages-schema';
import { eq, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
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
    const body = await request.json();
    const [msg] = await db.insert(messages).values({
      threadId: id, senderId: session.userId, content: body.content,
    }).returning();
    return NextResponse.json({ success: true, data: msg });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'فشل في ارسال الرسالة' }, { status: 500 });
  }
}
