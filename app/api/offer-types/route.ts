import { NextResponse } from 'next/server';
import { activeOfferTypes } from '@/lib/integration/reference';

export const dynamic = 'force-dynamic';

/**
 * The offer types the property form fills its "how is this marketed" select
 * from. The query lives in lib/integration/reference.ts because the desktop
 * office app's /api/office/v1/reference must answer from the same rows in the
 * same order — two queries would drift, and drift means the desktop offering a
 * marketing method the website will not accept.
 */
export async function GET() {
  return NextResponse.json({ success: true, data: await activeOfferTypes() });
}
