import { NextRequest, NextResponse } from 'next/server';
import { resolveCurrencyRequest } from '@/lib/market/currency-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/currencies — ALIAS of the mandatory public route
 * GET /api/currencies. Both are thin adapters over the same resolver
 * (lib/market/currency-api.ts) and serve identical contracts:
 *
 *   GET /api/market/currencies            -> the full active registry
 *   GET /api/market/currencies?code=USD   -> one canonical currency
 *   GET /api/market/currencies?code=XXX   -> 404, structured
 *
 * Intended uses: the publisher's currency picker when a price is entered, and
 * currency-aware search/filter forms. It is NOT a display-currency switcher —
 * `conversionSupported: false` is part of the contract. No FX is performed, no
 * exchange rate is exposed, and no default currency exists.
 *
 * All behaviour lives in lib/market/currency-api.ts so it is testable without
 * Next.js; this handler is only the HTTP adapter.
 */
export async function GET(request: NextRequest) {
  const result = resolveCurrencyRequest({ code: request.nextUrl.searchParams.get('code') });
  return NextResponse.json(result.body, { status: result.status });
}
