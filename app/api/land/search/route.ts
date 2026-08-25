import { NextRequest, NextResponse } from 'next/server';
import { searchLand, type LandSearchFilters } from '@/lib/land/core/land-engine';

const VALID_SORTS: readonly NonNullable<LandSearchFilters['sort']>[] = [
  'price_asc',
  'price_desc',
  'area_asc',
  'area_desc',
  'newest',
  'score',
];

function parseSort(value: string | null): LandSearchFilters['sort'] {
  return VALID_SORTS.includes(value as NonNullable<LandSearchFilters['sort']>)
    ? (value as NonNullable<LandSearchFilters['sort']>)
    : 'newest';
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const filters = {
      country: sp.get('country') ?? undefined,
      governorate: sp.get('governorate') ?? undefined,
      city: sp.get('city') ?? undefined,
      type: sp.get('type') ?? undefined,
      status: sp.get('status') ?? 'available',
      minArea: sp.get('minArea') ? Number(sp.get('minArea')) : undefined,
      maxArea: sp.get('maxArea') ? Number(sp.get('maxArea')) : undefined,
      minPrice: sp.get('minPrice') ? Number(sp.get('minPrice')) : undefined,
      maxPrice: sp.get('maxPrice') ? Number(sp.get('maxPrice')) : undefined,
      zoning: sp.get('zoning') ?? undefined,
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      limit: sp.get('limit') ? Number(sp.get('limit')) : 20,
      sort: parseSort(sp.get('sort')),
    };

    const result = await searchLand(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Land search API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
