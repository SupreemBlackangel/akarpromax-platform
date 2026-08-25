import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { knowledgeItems } from '@/lib/db/schemas/knowledge-schema';
import { eq, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const { db, end } = getDb();
    try {
      const items = await db.select().from(knowledgeItems).where(eq(knowledgeItems.status, 'published')).orderBy(desc(knowledgeItems.createdAt));
      return NextResponse.json({ success: true, data: items });
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
    const { db: db2, end: end2 } = getDb();
    try {
      const [item] = await db2.insert(knowledgeItems).values({
        type: body.type,
        titleAr: body.titleAr,
        titleEn: body.titleEn || '',
        descriptionAr: body.descriptionAr,
        descriptionEn: body.descriptionEn || '',
        category: body.category,
        author: body.author,
        vendor: body.vendor,
        cover: body.cover,
        fileUrl: body.fileUrl,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        version: body.version,
        language: body.language || 'ar',
        isFree: body.isFree !== undefined ? body.isFree : true,
        uploadedBy: session.userId,
        status: 'published',
      }).returning();
      return NextResponse.json({ success: true, data: item });
    } finally {
      await end2();
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'فشل في إنشاء المورد' }, { status: 500 });
  }
}
