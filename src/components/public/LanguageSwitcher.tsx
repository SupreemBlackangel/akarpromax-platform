"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { Locale, Translation } from "@/src/types/site";
import { languageOptions } from "@/src/data/translations";

const STORAGE_KEY = "akarpromax-locale";
export const LOCALE_CHANGE_EVENT = "akarpromax-locale-change";

function readStoredLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "ar" || saved === "en" || saved === "tr" ? saved : "ar";
  } catch {
    return "ar";
  }
}

function subscribeToLocale(callback: () => void): () => void {
  window.addEventListener(LOCALE_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(LOCALE_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * Public-header language control (ar / en / tr). Writes the same
 * `akarpromax-locale` key that useServicesPage reads, and dispatches a
 * locale-change event the hook listens for, so every page section (static
 * bundle + DB translation overlay via /api/i18n/{locale}) switches live.
 */
export default function LanguageSwitcher({ labels }: { labels: Translation }) {
  const locale = useSyncExternalStore(subscribeToLocale, readStoredLocale, () => "ar" as Locale);
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback((next: Locale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable — the event still switches for this session.
    }
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: next }));
    setOpen(false);
  }, []);

  const active = languageOptions.find((option) => option.id === locale) ?? languageOptions[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)]"
        aria-label={labels.languageAria}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={`${labels.languageAria}: ${active.label}`}
      >
        <span aria-hidden="true">{active.symbol}</span>
        <span className="hidden sm:inline">{active.short}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            aria-label={labels.languageAria}
            className="absolute left-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
          >
            {languageOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={locale === option.id}
                onClick={() => handleSelect(option.id)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm transition-colors hover:bg-[var(--color-surface-muted)]"
              >
                <span aria-hidden="true">{option.symbol}</span>
                <span className="flex-1 font-semibold">{option.label}</span>
                <small className="text-xs text-[var(--color-text-muted)]">{option.short}</small>
                {locale === option.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
