"use client";

import { useGeo } from "@/src/contexts/GeoContext";
import { getCurrency } from "@/lib/market/currency-registry";

/**
 * Header chip showing the pricing currency of the selected country
 * (derived from GeoContext; hidden in global mode or when the country
 * has no registered currency). Display-only — currency follows the
 * country selection, it is not independently selectable.
 */
export default function CurrencyChip() {
  const { countryConfig, isGlobal } = useGeo();

  const currency = isGlobal ? undefined : getCurrency(countryConfig?.currencyCode);
  if (!currency) return null;

  return (
    <span
      className="hidden items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] sm:inline-flex"
      title={currency.nameAr}
    >
      <span aria-hidden="true">{currency.symbol}</span>
      <span className="text-xs text-[var(--color-text-muted)]">{currency.code}</span>
    </span>
  );
}
