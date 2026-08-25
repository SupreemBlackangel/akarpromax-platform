import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adAnalytics } from '@/lib/db/schemas/advertising-schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, creativeId, eventType, page, placement, country, governorate, city } = body;
    if (!campaignId || !eventType) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    await db.insert(adAnalytics).values({
      campaignId,
      creativeId,
      eventType,
      page,
      placement,
      country,
      governorate,
      city,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
