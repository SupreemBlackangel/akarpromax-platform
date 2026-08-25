import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, sql, like, or, inArray, asc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { properties, propertyMedia } from '@/lib/db/schemas/properties-schema';
import { getSession } from '@/lib/auth/session';
import { canAccessAdminArea } from '@/lib/auth/access-control';
import { propertyStatusSchema } from '@/lib/validators/property-validators';

export const dynamic = 'force-dynamic';

/**
 * Admin/moderator property listing. This is the ONLY list endpoint that may
 * return non-approved rows for other people's properties, so it is guarded by
 * the same admin gate as the review action.
 *
 * Privacy: owner exposure is limited to id / display name / role. No email,
 * no phone, no identity documents.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
  }
  if (!canAccessAdminArea({ authenticated: true, role: session.role, permissions: session.permissions })) {
    return NextResponse.json({ success: false, error: 'لا تملك صلاحية إدارة العقارات' }, { status: 403 });
  }

  try {
    const sp = request.nextUrl.searchParams;
    const rawStatus = sp.get('status') || 'pending_review';
    if (rawStatus !== 'all') {
      const parsed = propertyStatusSchema.safeParse(rawStatus);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: 'حالة غير صالحة' }, { status: 400 });
      }
    }
    const country = sp.get('country')?.trim() || '';
    const governorate = sp.get('governorate')?.trim() || '';
    const city = sp.get('city')?.trim() || '';
    const propertyType = sp.get('propertyType')?.trim() || '';
    const dealType = sp.get('dealType')?.trim() || '';
    const search = sp.get('search')?.trim() || '';
    const page = Math.max(parseInt(sp.get('page') || '1') || 1, 1);
    const limit = Math.min(Math.max(parseInt(sp.get('limit') || '20') || 20, 1), 100);
    const offset = (page - 1) * limit;

    const conditions = [];
    if (rawStatus !== 'all') conditions.push(eq(properties.status, rawStatus));
    if (country) conditions.push(eq(sql<string>`lower(${properties.country})`, country.toLowerCase()));
    if (governorate) conditions.push(eq(sql<string>`lower(${properties.governorate})`, governorate.toLowerCase()));
    if (city) conditions.push(eq(sql<string>`lower(${properties.city})`, city.toLowerCase()));
    if (propertyType) conditions.push(eq(properties.propertyType, propertyType));
    if (dealType) conditions.push(eq(properties.dealType, dealType));
    if (search) {
      conditions.push(
        or(
          like(properties.titleAr, `%${search}%`),
          like(properties.titleEn, `%${search}%`),
          like(properties.city, `%${search}%`),
          like(properties.district, `%${search}%`),
          like(properties.referenceNumber, `%${search}%`),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows, statusRows] = await Promise.all([
      db
        .select({
          property: properties,
          ownerName: users.name,
          ownerRole: users.role,
        })
        .from(properties)
        .leftJoin(users, eq(properties.userId, users.id))
        .where(where)
        .orderBy(desc(properties.updatedAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(properties).where(where),
      db
        .select({ status: properties.status, count: sql<number>`count(*)` })
        .from(properties)
        .groupBy(properties.status),
    ]);

    const ids = rows.map((row) => row.property.id);
    const mediaRows = ids.length
      ? await db
          .select()
          .from(propertyMedia)
          .where(inArray(propertyMedia.propertyId, ids))
          .orderBy(asc(propertyMedia.order))
      : [];
    const mediaByProperty = new Map<string, typeof mediaRows>();
    for (const media of mediaRows) {
      if (!media.propertyId) continue;
      const bucket = mediaByProperty.get(media.propertyId);
      if (bucket) bucket.push(media);
      else mediaByProperty.set(media.propertyId, [media]);
    }

    const total = Number(totalRows[0]?.count ?? 0);
    const statusCounts: Record<string, number> = {};
    for (const row of statusRows) {
      statusCounts[row.status ?? 'draft'] = Number(row.count);
    }

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        ...row.property,
        media: mediaByProperty.get(row.property.id) ?? [],
        owner: {
          id: row.property.userId,
          name: row.ownerName ?? null,
          role: row.ownerRole ?? null,
        },
      })),
      statusCounts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[Admin Properties GET] Error:', error);
    return NextResponse.json({ success: false, error: 'فشل في جلب العقارات' }, { status: 500 });
  }
}
