import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { canAccessAdminArea } from '@/lib/auth/access-control';
import { createRequestId, recordAuditEvent } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

type AdminUserAction = 'verify' | 'activate' | 'suspend' | 'block' | 'unblock';

const ACTIONS: Record<AdminUserAction, Partial<typeof users.$inferInsert>> = {
  // Manual activation: mark the email verified and open the account.
  verify: { emailVerifiedAt: new Date(), status: 'active', isActive: true },
  activate: { status: 'active', isActive: true },
  suspend: { status: 'suspended' },
  block: { isActive: false },
  unblock: { isActive: true },
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
  }
  if (!canAccessAdminArea({ authenticated: true, role: session.role, permissions: session.permissions })) {
    return NextResponse.json({ success: false, error: 'لا تملك صلاحية إدارة المستخدمين' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { action?: string; name?: string; phone?: string } | null;
  if (!body) return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return NextResponse.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 });

  // Guardrails: no self-lockout, and only a super_admin may touch a super_admin.
  const action = body.action as AdminUserAction | undefined;
  if (action && !(action in ACTIONS)) {
    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  }
  if (target.id === session.userId && (action === 'suspend' || action === 'block')) {
    return NextResponse.json({ success: false, error: 'لا يمكنك إيقاف حسابك الخاص' }, { status: 400 });
  }
  if (target.role === 'super_admin' && session.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'لا يمكن تعديل حساب مدير أعلى' }, { status: 403 });
  }

  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (action) Object.assign(patch, ACTIONS[action]);
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim().slice(0, 190);
  if (typeof body.phone === 'string') patch.phone = body.phone.trim().slice(0, 20) || null;

  const [updated] = await db.update(users).set(patch).where(eq(users.id, id)).returning({
    id: users.id, name: users.name, email: users.email, phone: users.phone,
    role: users.role, status: users.status, isActive: users.isActive,
    emailVerifiedAt: users.emailVerifiedAt,
  });

  void recordAuditEvent({
    eventType: 'ADMIN_USER_UPDATED',
    userId: session.userId,
    detail: { requestId: createRequestId(), targetUserId: id, action: action ?? 'fields' },
  });

  return NextResponse.json({ success: true, data: updated });
}

/** Soft-delete: the account is marked deleted and locked out; no rows are dropped. */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
  }
  if (!canAccessAdminArea({ authenticated: true, role: session.role, permissions: session.permissions })) {
    return NextResponse.json({ success: false, error: 'لا تملك صلاحية إدارة المستخدمين' }, { status: 403 });
  }
  if (id === session.userId) {
    return NextResponse.json({ success: false, error: 'لا يمكنك حذف حسابك الخاص' }, { status: 400 });
  }

  const [target] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (!target) return NextResponse.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 });
  if (target.role === 'super_admin' && session.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'لا يمكن حذف حساب مدير أعلى' }, { status: 403 });
  }

  const [deleted] = await db.update(users)
    .set({ status: 'deleted', isActive: false, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({
      id: users.id, name: users.name, email: users.email, phone: users.phone,
      role: users.role, status: users.status, isActive: users.isActive,
      emailVerifiedAt: users.emailVerifiedAt,
    });

  void recordAuditEvent({
    eventType: 'ADMIN_USER_UPDATED',
    userId: session.userId,
    detail: { requestId: createRequestId(), targetUserId: id, action: 'delete' },
  });

  return NextResponse.json({ success: true, data: deleted });
}
