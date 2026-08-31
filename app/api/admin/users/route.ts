import { NextRequest, NextResponse } from 'next/server';
import { and, desc, ilike, or, sql, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { canAccessAdminArea } from '@/lib/auth/access-control';

export const dynamic = 'force-dynamic';

/**
 * Admin user directory: search + status listing for the users-management
 * panel. Password hashes and verification tokens are never exposed.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
  }
  if (!canAccessAdminArea({ authenticated: true, role: session.role, permissions: session.permissions })) {
    return NextResponse.json({ success: false, error: 'لا تملك صلاحية إدارة المستخدمين' }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const q = (sp.get('q') || '').trim().slice(0, 120);
  const status = (sp.get('status') || '').trim();
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '50', 10) || 50));
  const offset = Math.max(0, parseInt(sp.get('offset') || '0', 10) || 0);

  const conditions = [];
  if (q) {
    const term = `%${q}%`;
    conditions.push(or(ilike(users.email, term), ilike(users.name, term), ilike(users.phone, term))!);
  }
  if (status && ['pending_verification', 'active', 'disabled', 'suspended', 'deleted'].includes(status)) {
    conditions.push(eq(users.status, status));
  }
  if (sp.get('blocked') === '1') {
    conditions.push(eq(users.isActive, false));
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([
    db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      isActive: users.isActive,
      emailVerifiedAt: users.emailVerifiedAt,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    }).from(users).where(where).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(users).where(where),
  ]);

  return NextResponse.json({ success: true, data: rows, total: totalRows[0]?.count ?? 0 });
}
