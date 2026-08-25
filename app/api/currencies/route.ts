import { NextRequest, NextResponse } from 'next/server';
import { resolveCurrencyRequest } from '@/lib/market/currency-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/currencies — the MANDATORY public currency registry route.
 *
 * Capability preserved from the pre-L1A route, now served by the canonical
 * registry (lib/market/currency-api.ts) instead of a database read:
 *
 *   GET /api/currencies            -> the full active registry (25 currencies)
 *   GET /api/currencies?code=USD   -> one canonical currency object
 *   GET /api/currencies?code=XXX   -> 404, { error: "CURRENCY_NOT_FOUND", ... }
 *
 * `conversionSupported: false` is part of the contract: no FX, no exchange
 * rate, no default currency. The publisher chooses the original listing
 * currency; a currency chosen in a search form only filters listings already
 * priced in it.
 *
 * NOTE (owner-deferred, do not delete): the sibling `convert/route.ts` and
 * `lib/services/currency/currency.service.ts` contain historical conversion
 * capability. FX is explicitly deferred by the product owner — that code is
 * inactive in the canonical L1A path but is preserved as historical inventory
 * pending later product review.
 */
export async function GET(request: NextRequest) {
  const result = resolveCurrencyRequest({ code: request.nextUrl.searchParams.get('code') });
  return NextResponse.json(result.body, { status: result.status });
}
