"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useGeo, type CountryConfig } from "@/src/contexts/GeoContext";

const subscribeNoop = () => () => {};
/** False during SSR/hydration, true after mount — keeps first client render
    identical to the server HTML (see React hydration contract). */
function useMounted(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

function flagEmoji(code: string): string {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export default function CountrySwitcher() {
  const {
    countryCode,
    countries,
    isGlobal,
    resolving,
    setCountry,
    setGlobal,
    countryConfig,
  } = useGeo();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useMounted();

  const handleSelect = useCallback(
    (code: string) => {
      setCountry(code);
      setOpen(false);
    },
    [setCountry],
  );

  const handleGlobal = useCallback(() => {
    setGlobal();
    setOpen(false);
  }, [setGlobal]);

  const handleClose = useCallback(() => setOpen(false), []);

  // Close on outside click
  if (typeof window !== "undefined") {
    // Note: using a mousedown listener below instead for better UX
  }

  const activeLabel = isGlobal
    ? "جميع الدول"
    : countryConfig?.nameAr || countryCode.toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)]"
        aria-label="تغيير الدولة"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {!mounted || isGlobal || !countryCode ? (
          <Globe className="h-4 w-4 text-[var(--color-text-muted)]" />
        ) : (
          <span aria-hidden="true">{flagEmoji(countryCode)}</span>
        )}
        {resolving ? (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <span>{activeLabel}</span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={handleClose} />

          {/* Dropdown */}
          <div
            role="listbox"
            aria-label="اختر الدولة"
            className="absolute start-0 top-full z-50 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
          >
            {/* Global option */}
            <button
              type="button"
              role="option"
              aria-selected={isGlobal}
              onClick={handleGlobal}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm transition-colors hover:bg-[var(--color-surface-muted)]"
            >
              <Globe className="h-4 w-4 text-[var(--color-text-muted)]" />
              <span className="flex-1 font-semibold">جميع الدول</span>
              {isGlobal && <Check className="h-4 w-4 text-primary" />}
            </button>

            <div className="border-t border-[var(--color-border)]" />

            {/* Country list */}
            {countries
              .filter((c) => c.isActive)
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={countryCode === c.code}
                  onClick={() => handleSelect(c.code)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm transition-colors hover:bg-[var(--color-surface-muted)]"
                >
                  <span aria-hidden="true">{flagEmoji(c.code)}</span>
                  <span className="flex-1 font-semibold">{c.nameAr}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{c.code.toUpperCase()}</span>
                  {countryCode === c.code && !isGlobal && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}

            {countries.length === 0 && !resolving && (
              <div className="px-4 py-3 text-center text-sm text-[var(--color-text-muted)]">
                لا توجد دول متاحة
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
