import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forumPosts } from '@/lib/db/schemas/community-schema';
import { getSession } from '@/lib/auth/session';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    const body = await request.json();
    const [post] = await db.insert(forumPosts).values({
      topicId: id, userId: session.userId, content: body.content,
    }).returning();
    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'فشل في انشاء الرد' }, { status: 500 });
  }
}
