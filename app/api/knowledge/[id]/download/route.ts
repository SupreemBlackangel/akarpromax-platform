import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { knowledgeItems } from '@/lib/db/schemas/knowledge-schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, end } = getDb();
    try {
      const { id } = await params;
      await db.update(knowledgeItems).set({
        downloadCount: sql`${knowledgeItems.downloadCount} + 1`,
      }).where(eq(knowledgeItems.id, id));
      return NextResponse.json({ success: true });
    } finally {
      await end();
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'فشل في تحديث العدّاد' }, { status: 500 });
    }
}
