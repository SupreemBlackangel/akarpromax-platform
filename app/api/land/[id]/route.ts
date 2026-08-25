import { NextRequest, NextResponse } from 'next/server';
import { getLandParcel } from '@/lib/land/core/land-engine';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parcel = await getLandParcel(id);
  if (!parcel) {
    return NextResponse.json({ error: 'Land parcel not found' }, { status: 404 });
  }
  return NextResponse.json(parcel);
}
