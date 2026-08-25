import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { ContractService } from '@/lib/services/contracts/contract.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getSession(request.headers.get('cookie') ?? undefined);
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { propertyId, buyerId, offerTypeCode, price, currency, contractType, terms, additionalClauses } = body;

    if (!propertyId || !offerTypeCode || !price || !contractType) {
      return NextResponse.json(
        { error: 'البيانات ناقصة (propertyId, offerTypeCode, price, contractType مطلوبة)' },
        { status: 400 }
      );
    }

    if (!['sale', 'lease', 'auction'].includes(contractType)) {
      return NextResponse.json(
        { error: 'نوع العقد غير مدعوم' },
        { status: 400 }
      );
    }

    const contractService = new ContractService();
    const contract = await contractService.generateContract({
      propertyId,
      buyerId,
      sellerId: session.userId,
      offerTypeCode,
      price: Number(price),
      currency: currency || 'SAR',
      contractType,
      terms,
      additionalClauses,
    });

    return NextResponse.json({
      success: true,
      data: contract,
      message: 'تم توليد العقد بنجاح',
    });
  } catch (error) {
    console.error('[Contracts POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'فشل في توليد العقد' },
      { status: 500 }
    );
  }
}
