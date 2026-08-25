import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminRoleAssignments } from '@/lib/db/schemas/roles-schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    const body = await request.json();
    const [assignment] = await db.insert(adminRoleAssignments).values({
      userId: body.userId,
      roleId: body.roleId,
      assignedBy: session.userId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    }).returning();
    return NextResponse.json({ success: true, data: assignment });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'فشل في تعيين الصلاحية' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const roleId = searchParams.get('roleId');
    if (!userId || !roleId) return NextResponse.json({ success: false, error: 'بيانات ناقصة' }, { status: 400 });
    await db.delete(adminRoleAssignments).where(
      and(eq(adminRoleAssignments.userId, userId), eq(adminRoleAssignments.roleId, roleId))
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'فشل في ازالة الصلاحية' }, { status: 500 });
  }
}
