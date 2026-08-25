import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { propertyOfferTypes, propertyOffers, propertyOfferTypesSeed } from '@/lib/db/schemas/offer-types-schema';
import { eq, asc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const country = searchParams.get('country');
    const allowDirect = searchParams.get('allowDirect') === 'true';
    const allowAuction = searchParams.get('allowAuction') === 'true';
    const allowFixed = searchParams.get('allowFixed') === 'true';
    const allowOpen = searchParams.get('allowOpen') === 'true';
    const activeOnly = searchParams.get('active') !== 'false';

    const types = await db.select()
      .from(propertyOfferTypes)
      .orderBy(asc(propertyOfferTypes.displayOrder));

    const filtered = types.filter((type) => {
      if (activeOnly && !type.isActive) return false;
      if (allowDirect && !type.allowDirect) return false;
      if (allowAuction && !type.allowAuction) return false;
      if (allowFixed && !type.allowFixedAuction) return false;
      if (allowOpen && !type.allowOpenAuction) return false;
      const allowedCountries = (type.allowedCountries ?? []) as string[];
      if (country && allowedCountries.length > 0 && !allowedCountries.includes(country)) return false;
      return true;
    });

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    console.error('[OfferTypes GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب أنواع العروض' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (body.seed === true) {
      const inserted = [];
      for (const seed of propertyOfferTypesSeed) {
        const [existing] = await db.select().from(propertyOfferTypes).where(eq(propertyOfferTypes.code, seed.code));
        if (!existing) {
          const [row] = await db.insert(propertyOfferTypes).values({
            code: seed.code,
            nameAr: seed.nameAr,
            nameEn: seed.nameEn,
            displayOrder: 0,
            allowDirect: seed.allowDirect,
            allowAuction: seed.allowAuction,
            allowFixedAuction: seed.allowFixedAuction,
            allowOpenAuction: seed.allowOpenAuction,
            contractTemplateType: seed.contractTemplateType,
          }).returning();
          inserted.push(row);
        }
      }
      return NextResponse.json({ success: true, data: inserted, message: 'تم زرع أنواع العروض الافتراضية' });
    }

    const [result] = await db.insert(propertyOfferTypes).values({
      code: body.code,
      nameAr: body.nameAr,
      nameEn: body.nameEn,
      nameTr: body.nameTr || '',
      descriptionAr: body.descriptionAr || '',
      descriptionEn: body.descriptionEn || '',
      descriptionTr: body.descriptionTr || '',
      displayOrder: body.displayOrder || 0,
      isActive: body.isActive !== undefined ? body.isActive : true,
      allowDirect: body.allowDirect !== undefined ? body.allowDirect : true,
      allowAuction: body.allowAuction !== undefined ? body.allowAuction : true,
      allowFixedAuction: body.allowFixedAuction !== undefined ? body.allowFixedAuction : true,
      allowOpenAuction: body.allowOpenAuction !== undefined ? body.allowOpenAuction : true,
      allowedCountries: body.allowedCountries || [],
      allowedPropertyCategories: body.allowedPropertyCategories || [],
      requiresVerification: body.requiresVerification || false,
      requiresDocuments: body.requiresDocuments || false,
      requiresTerms: body.requiresTerms !== undefined ? body.requiresTerms : true,
      contractTemplateType: body.contractTemplateType || '',
      metadata: body.metadata || {},
    }).returning();

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[OfferTypes POST] Error:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'فشل في إضافة نوع العرض' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'المعرف مطلوب' },
        { status: 400 }
      );
    }

    const [result] = await db.update(propertyOfferTypes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(propertyOfferTypes.id, id))
      .returning();

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[OfferTypes PATCH] Error:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'فشل في تحديث نوع العرض' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'المعرف مطلوب' },
        { status: 400 }
      );
    }

    await db.delete(propertyOfferTypes).where(eq(propertyOfferTypes.id, id));

    return NextResponse.json({ success: true, message: 'تم حذف نوع العرض' });
  } catch (error) {
    console.error('[OfferTypes DELETE] Error:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'فشل في حذف نوع العرض' },
      { status: 500 }
    );
  }
}
