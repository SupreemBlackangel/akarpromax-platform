"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { ThemeMode, Translation } from "@/src/types/site";
import { themeOptions } from "@/src/data/translations";

const STORAGE_KEY = "akarpromax-theme";
const CHANGE_EVENT = "akarpromax-theme-change";

function readStoredMode(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
  } catch {
    return "system";
  }
}

function subscribeToMode(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * Public-header appearance control (system / light / dark). The boot script in
 * app/layout.tsx already applies the stored mode before hydration; this
 * component only reads/writes the same `akarpromax-theme` key and datasets.
 */
export default function ThemeSwitcher({ labels }: { labels: Translation }) {
  const mode = useSyncExternalStore(subscribeToMode, readStoredMode, () => "system" as ThemeMode);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = mode === "system" ? (media.matches ? "dark" : "light") : mode;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.dataset.themeMode = mode;
    };
    apply();
    if (mode === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [mode]);

  const handleSelect = useCallback((next: ThemeMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode) — theme still applies for the session.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    setOpen(false);
  }, []);

  const active = themeOptions.find((option) => option.id === mode) ?? themeOptions[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)]"
        aria-label={labels.themeAria}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={`${labels.themeAria}: ${labels[active.labelKey]}`}
      >
        <span aria-hidden="true">{active.symbol}</span>
        <span className="hidden sm:inline">{labels[active.labelKey]}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            aria-label={labels.themeAria}
            className="absolute start-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
          >
            {themeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={mode === option.id}
                onClick={() => handleSelect(option.id)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm transition-colors hover:bg-[var(--color-surface-muted)]"
              >
                <span aria-hidden="true">{option.symbol}</span>
                <span className="flex-1 font-semibold">{labels[option.labelKey]}</span>
                {mode === option.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
