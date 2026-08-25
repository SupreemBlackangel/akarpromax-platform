/**
 * OWNER-DEFERRED / NOT ACTIVE PRODUCT PATH — historical capability inventory.
 *
 * Currency conversion is DEFERRED by the product owner. This service is
 * PRESERVED, not deleted, and is NOT part of any active product path:
 *
 *   - The canonical pricing path does not use FX. Publisher-selected
 *     `amount + currencyCode` is the source of truth; prices are never
 *     converted, and numeric prices in different currencies are never
 *     compared as equal units.
 *   - The canonical public registry route `GET /api/currencies` (and its
 *     alias `GET /api/market/currencies`) answer through
 *     `lib/market/currency-api.ts` only. They never reach this file, and every
 *     successful response carries `conversionSupported: false`.
 *   - `POST /api/currencies/convert` no longer executes conversion. It returns
 *     a structured 501 `CURRENCY_CONVERSION_DISABLED` and does not import this
 *     service — see `lib/api/currency-conversion-disabled.ts`.
 *
 * ACCURATE STATEMENT ABOUT `exchange_rate_to_usd`: the column exists on the
 * live `currencies` table and IS read by `convert()` and by `getCurrencies()` /
 * `getCurrency()` / `getDefaultCurrency()` in this file (they select the whole
 * row). What is true is narrower and is the rule that matters:
 *
 *   *** The canonical pricing path does not use FX. ***
 *
 * No active route, page or service calls into this class — zero importers
 * outside this file. Nothing here is reachable from a public request.
 *
 * DO NOT DELETE. DO NOT re-wire into a product path. DO NOT add an environment
 * bypass (`ENABLE_FX` or similar). Reactivation requires a future reviewed FX
 * architecture and an explicit product decision, because re-enabling
 * conversion changes the meaning of a listing price.
 *
 * See `docs/refactor/L1A_OWNER_DEFERRED_INVENTORY.md`.
 */

import { getDb } from '@/lib/db';
import { currencies } from '@/lib/db/schemas/currency-schema';
import { eq } from 'drizzle-orm';

export interface Currency {
  id: string;
  code: string;
  symbol: string;
  nameAr: string;
  nameEn: string;
  nameTr: string | null;
  exchangeRateToUSD: string;
  isActive: boolean | null;
  isDefault: boolean | null;
  displayOrder: number | null;
}

export class CurrencyService {
  async getCurrencies(): Promise<Currency[]> {
    const { db, end } = getDb();
    try {
      return (await db.select().from(currencies).where(eq(currencies.isActive, true))) as unknown as Currency[];
    } finally {
      await end();
    }
  }

  async getDefaultCurrency(): Promise<Currency | undefined> {
    const { db, end } = getDb();
    try {
      const [currency] = await db.select().from(currencies).where(eq(currencies.isDefault, true)).limit(1);
      return currency as unknown as Currency | undefined;
    } finally {
      await end();
    }
  }

  async getCurrency(code: string): Promise<Currency | undefined> {
    const { db, end } = getDb();
    try {
      const [currency] = await db.select().from(currencies).where(eq(currencies.code, code)).limit(1);
      return currency as unknown as Currency | undefined;
    } finally {
      await end();
    }
  }

  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const { db, end } = getDb();
    try {
      const [from] = await db.select().from(currencies).where(eq(currencies.code, fromCurrency)).limit(1);
      const [to] = await db.select().from(currencies).where(eq(currencies.code, toCurrency)).limit(1);
      if (!from || !to) return amount;
      const usdAmount = amount / parseFloat(from.exchangeRateToUSD);
      return usdAmount * parseFloat(to.exchangeRateToUSD);
    } finally {
      await end();
    }
  }

  async format(amount: number, currencyCode: string): Promise<string> {
    const { db, end } = getDb();
    try {
      const [currency] = await db.select().from(currencies).where(eq(currencies.code, currencyCode)).limit(1);
      if (!currency) return `${amount} ${currencyCode}`;
      return `${amount.toLocaleString()} ${currency.symbol}`;
    } finally {
      await end();
    }
  }
}
