import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { properties, propertyMedia } from '@/lib/db/schemas/properties-schema';
import { eq, and, like, desc, sql, between, or } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { createPropertySchema, propertySearchSchema } from '@/lib/validators/property-validators';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const validated = propertySearchSchema.parse({
      dealType: searchParams.get('dealType') || undefined,
      category: searchParams.get('category') || undefined,
      propertyType: searchParams.get('propertyType') || undefined,
      country: searchParams.get('country') || undefined,
      governorate: searchParams.get('governorate') || undefined,
      city: searchParams.get('city') || undefined,
      district: searchParams.get('district') || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      minArea: searchParams.get('minArea') ? parseFloat(searchParams.get('minArea')!) : undefined,
      maxArea: searchParams.get('maxArea') ? parseFloat(searchParams.get('maxArea')!) : undefined,
      bedrooms: searchParams.get('bedrooms') ? parseInt(searchParams.get('bedrooms')!) : undefined,
      bathrooms: searchParams.get('bathrooms') ? parseInt(searchParams.get('bathrooms')!) : undefined,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || 'approved',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    const offset = (validated.page - 1) * validated.limit;
    const conditions = [];

    if (validated.dealType) conditions.push(eq(properties.dealType, validated.dealType));
    if (validated.category) conditions.push(eq(properties.category, validated.category));
    if (validated.propertyType) conditions.push(eq(properties.propertyType, validated.propertyType));
    if (validated.country) conditions.push(eq(properties.country, validated.country));
    if (validated.governorate) conditions.push(eq(properties.governorate, validated.governorate));
    if (validated.city) conditions.push(eq(properties.city, validated.city));
    if (validated.district) conditions.push(eq(properties.district, validated.district));
    if (validated.status) conditions.push(eq(properties.status, validated.status));
    if (validated.bedrooms !== undefined) conditions.push(eq(properties.bedrooms, validated.bedrooms));
    if (validated.bathrooms !== undefined) conditions.push(eq(properties.bathrooms, validated.bathrooms));
    if (validated.minPrice !== undefined) conditions.push(sql`${properties.price} >= ${validated.minPrice}`);
    if (validated.maxPrice !== undefined) conditions.push(sql`${properties.price} <= ${validated.maxPrice}`);
    if (validated.minArea !== undefined) conditions.push(sql`${properties.area} >= ${validated.minArea}`);
    if (validated.maxArea !== undefined) conditions.push(sql`${properties.area} <= ${validated.maxArea}`);

    if (validated.search) {
      conditions.push(
        or(
          like(properties.titleAr, `%${validated.search}%`),
          like(properties.titleEn, `%${validated.search}%`),
          like(properties.descriptionAr, `%${validated.search}%`),
          like(properties.descriptionEn, `%${validated.search}%`),
          like(properties.address, `%${validated.search}%`),
          like(properties.city, `%${validated.search}%`),
          like(properties.district, `%${validated.search}%`)
        )!
      );
    }

    const sortColumn = validated.sortBy === 'createdAt' ? properties.createdAt :
                       validated.sortBy === 'price' ? properties.price :
                       validated.sortBy === 'area' ? properties.area :
                       properties.views;

    const order = validated.sortOrder === 'asc' ? sql`${sortColumn} ASC` : sql`${sortColumn} DESC`;

    const query = db.select()
      .from(properties)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(validated.limit)
      .offset(offset);

    const results = await query;
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        pages: Math.ceil(total / validated.limit),
      },
    });
  } catch (error) {
    console.error('[Properties GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب العقارات' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح، يرجى تسجيل الدخول' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = createPropertySchema.parse(body);

    const [property] = await db.insert(properties).values({
      userId: session.userId,
      titleAr: validated.titleAr,
      titleEn: validated.titleEn || '',
      descriptionAr: validated.descriptionAr,
      descriptionEn: validated.descriptionEn || '',
      dealType: validated.dealType,
      category: validated.category,
      propertyType: validated.propertyType,
      country: validated.country,
      governorate: validated.governorate,
      city: validated.city,
      district: validated.district || '',
      latitude: validated.latitude ? String(validated.latitude) : null,
      longitude: validated.longitude ? String(validated.longitude) : null,
      address: validated.address || '',
      price: String(validated.price),
      currency: validated.currency || 'SAR',
      area: String(validated.area),
      bedrooms: validated.bedrooms || 0,
      bathrooms: validated.bathrooms || 0,
      floor: validated.floor || 0,
      totalFloors: validated.totalFloors || 0,
      yearBuilt: validated.yearBuilt || null,
      facade: validated.facade || '',
      direction: validated.direction || '',
      referenceNumber: validated.referenceNumber || '',
      advertisingLicense: validated.advertisingLicense || '',
      officeId: validated.officeId || null,
      status: 'draft',
    }).returning();

    if (validated.media && validated.media.length > 0) {
      await db.insert(propertyMedia).values(
        validated.media.map((media, index) => ({
          propertyId: property!.id,
          url: media.url,
          type: media.type,
          order: index,
          isFeatured: index === 0,
          altText: media.altText || '',
        }))
      );
    }

    return NextResponse.json({
      success: true,
      data: property,
      message: 'تم إضافة العقار بنجاح، في انتظار المراجعة',
    });
  } catch (error) {
    console.error('[Properties POST] Error:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'فشل في إضافة العقار' },
      { status: 500 }
    );
  }
}
