import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { forumTopics } from '@/lib/db/schemas/community-schema';
import { desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const { db, end } = getDb();
    try {
      const topics = await db.select().from(forumTopics).orderBy(desc(forumTopics.createdAt));
      return NextResponse.json({ success: true, data: topics });
    } finally {
      await end();
    }
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    const body = await request.json();
    const { db, end } = getDb();
    try {
      const [topic] = await db.insert(forumTopics).values({
        categoryId: body.categoryId,
        userId: session.userId,
        title: body.title,
        content: body.content,
      }).returning();
      return NextResponse.json({ success: true, data: topic });
    } finally {
      await end();
    }
  } catch {
    return NextResponse.json({ success: false, error: 'فشل في إنشاء الموضوع' }, { status: 500 });
  }
}
