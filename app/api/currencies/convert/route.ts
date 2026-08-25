import { NextResponse } from 'next/server';

import { resolveDisabledCurrencyConversion } from '@/lib/api/currency-conversion-disabled';

/**
 * POST /api/currencies/convert — OWNER-DEFERRED, PUBLIC EXECUTION DISABLED.
 *
 * The route path is preserved for compatibility, but currency conversion is
 * deferred by the product owner: there is no FX, no automatic conversion, no
 * exchange-rate lookup and no display-currency conversion on the canonical
 * pricing path. The publisher-selected `amount + currencyCode` is the source
 * of truth.
 *
 * This handler therefore:
 *   - does NOT import or invoke `CurrencyService` (whose historical
 *     `convert()` / `format()` remain in the repository as inventory only —
 *     see `lib/services/currency/currency.service.ts` and
 *     `docs/refactor/L1A_OWNER_DEFERRED_INVENTORY.md`),
 *   - does NOT open a database connection or read `exchange_rate_to_usd`,
 *   - does NOT read, echo or validate the request body — no input can make it
 *     convert, so no input is inspected,
 *   - exposes no rate data and no converted amount,
 *   - has NO runtime bypass (no `ENABLE_FX`, no environment or query flag).
 *
 * It answers a stable structured 501 consistent with the canonical registry
 * contract `GET /api/currencies` (`conversionSupported: false`).
 */

export const dynamic = 'force-dynamic';

export async function POST() {
  const result = resolveDisabledCurrencyConversion();
  return NextResponse.json(result.body, { status: result.status });
}
