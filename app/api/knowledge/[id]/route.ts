import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { knowledgeItems } from '@/lib/db/schemas/knowledge-schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, end } = getDb();
    try {
      const { id } = await params;
      const [item] = await db.select().from(knowledgeItems).where(eq(knowledgeItems.id, id));
      if (!item) return NextResponse.json({ success: false, error: 'المورد غير موجود' }, { status: 404 });
      return NextResponse.json({ success: true, data: item });
    } finally {
      await end();
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'فشل في جلب المورد' }, { status: 500 });
    }
}
