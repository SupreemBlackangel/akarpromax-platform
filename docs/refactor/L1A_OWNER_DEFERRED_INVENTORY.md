# L1A — Owner-Deferred Capability Inventory

Status: **DEFERRED BY THE PRODUCT OWNER — NOT CANCELLED, NOT DELETED.**

L1A ships with **no FX and no currency conversion**. The publisher chooses the
ORIGINAL listing currency and the value stays in that currency; a currency
chosen in search only **filters** listings already priced in it. Numeric prices
are never compared across currencies as equal units.

That decision removed FX from the **canonical L1A path**. It did **not** remove
the historical capability from the repository, and this file exists so the
capability is not silently lost from the capability inventory. Nothing listed
below may be deleted as part of L1A closeout; it is preserved pending a later
product review.

## Deferred surface (present in the repository, inactive on the canonical path)

| Item | Path | Note |
| --- | --- | --- |
| Conversion HTTP route (**execution disabled**) | `app/api/currencies/convert/route.ts` | Path preserved for compatibility. `POST` no longer converts: it returns a structured `501` / `CURRENCY_CONVERSION_DISABLED` with `conversionSupported: false`, via the pure resolver `lib/api/currency-conversion-disabled.ts`. It does not import `CurrencyService`, does not open a DB connection, does not read the request body, and exposes no rate and no converted amount. **No environment bypass exists.** |
| Conversion service | `lib/services/currency/currency.service.ts` | `CurrencyService.convert()` / `.format()`. Rate-table backed; **zero importers** — no active route, page or service constructs it. Annotated in-file as OWNER-DEFERRED / NOT ACTIVE PRODUCT PATH. |
| FX columns on the live `currencies` table | `lib/db/schemas/currency-schema.ts` | `exchange_rate_to_usd`, `is_default` (+ `currencies_is_default_idx`). Existing production columns — modelled so the schema stays truthful, deliberately **not** exposed by any L1A response. |

## What L1A guarantees about this surface

- The canonical registry route `GET /api/currencies` and its alias
  `GET /api/market/currencies` both answer through
  `lib/market/currency-api.ts` only, and never reach into the deferred code.
  This is enforced by `tests/market/currency-api.test.mjs` (section 6).
- No L1A response body exposes `exchangeRate`, `exchange_rate`, `rate`,
  `isDefault`, `is_default` or `defaultCurrency`; every successful response
  carries `conversionSupported: false`. Enforced by
  `tests/market/currency-api.test.mjs`.
- `lib/market/*` exports no conversion surface at all.
- `POST /api/currencies/convert` cannot perform a conversion. Public FX
  execution is disabled at the route: the handler is a pure structured refusal
  (`501` / `CURRENCY_CONVERSION_DISABLED`) and never reaches the deferred
  service or the rate columns. Enforced by
  `tests/market/currency-conversion-disabled.test.mjs`.
- There is **no** feature flag, environment variable or query parameter that
  re-enables conversion. Reactivation requires a future reviewed FX
  architecture.

## Accurate statement about `exchange_rate_to_usd`

The column exists on the live `currencies` table and **is** read by the
deferred `CurrencyService` (its selects return the whole row). It is therefore
wrong to claim the column "is never read". The accurate rule is narrower:

> **The canonical pricing path does not use FX.**

No active request path reaches the code that reads the column, no response body
exposes it, and no product behaviour depends on its value.

## Review trigger

Revisit only on an explicit product decision to introduce display-currency
conversion. Any such work must restate the pricing rule first, because
re-enabling conversion changes the meaning of a listing price.
