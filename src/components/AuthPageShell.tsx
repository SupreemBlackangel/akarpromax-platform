"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Brand from "@/src/components/Brand";
import { translations, languageOptions } from "@/src/data/translations";
import { authLabels, type AuthLabels } from "@/lib/auth-labels";
import type { Locale } from "@/lib/email/templates";

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  const stored = window.localStorage.getItem("akarpromax-lang");
  if (stored === "ar" || stored === "en" || stored === "tr") return stored;
  return "ar";
}

export type AuthPageContext = {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: AuthLabels;
  onLocaleChange: (locale: Locale) => void;
};

const AuthPageContextReact = createContext<AuthPageContext | undefined>(undefined);

export function useAuthPage(): AuthPageContext {
  const ctx = useContext(AuthPageContextReact);
  if (!ctx) throw new Error("useAuthPage must be used within AuthPageShell");
  return ctx;
}

export default function AuthPageShell({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    const root = window.document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
    window.localStorage.setItem("akarpromax-lang", locale);
  }, [locale]);

  const dir = locale === "ar" ? "rtl" : "ltr";
  const t = authLabels(locale);

  return (
    <AuthPageContextReact.Provider value={{ locale, dir, t, onLocaleChange: setLocale }}>
      <div className={`auth-page min-h-screen w-full bg-[color:var(--color-surface-2)] ${locale === "ar" ? "auth-page-rtl" : "auth-page-ltr"}`}>
        <div className="auth-page-head container mx-auto flex items-center justify-between p-[var(--space-5)] sm:p-[var(--space-8)]">
          <Brand copy={translations[locale]} />
          <div className="auth-lang-switcher flex gap-[var(--space-2)]">
            {languageOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`lang-option ${locale === option.id ? "active" : ""} rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-1)] text-sm`}
                onClick={() => setLocale(option.id as Locale)}
                aria-label={option.label}
              >
                <span className="lang-symbol" aria-hidden="true">{option.symbol}</span><span>{option.short}</span>
              </button>
            ))}
          </div>
        </div>
        <main className="auth-page-body flex min-h-[calc(100vh-120px)] items-center justify-center p-[var(--space-5)] sm:p-[var(--space-8)]">
          <div className="auth-card w-full max-w-[420px] rounded-[var(--radius-lg)] bg-[color:var(--color-surface-1)] p-[var(--space-8)] shadow-[var(--shadow-card)]">
            {children}
          </div>
        </main>
      </div>
    </AuthPageContextReact.Provider>
  );
}
