import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forumTopics, forumPosts } from '@/lib/db/schemas/community-schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [topic] = await db.select().from(forumTopics).where(eq(forumTopics.id, id));
    if (!topic) return NextResponse.json({ success: false, error: 'الموضوع غير موجود' }, { status: 404 });

    const posts = await db.select().from(forumPosts).where(eq(forumPosts.topicId, id));
    return NextResponse.json({ success: true, data: { ...topic, posts } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'فشل في جلب الموضوع' }, { status: 500 });
  }
}
