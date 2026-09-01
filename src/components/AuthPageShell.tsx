"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Building2, Wrench } from "lucide-react";
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

const PITCH: Record<Locale, { headline: string; sub: string; points: string[] }> = {
  ar: {
    headline: "منصة العقار والخدمات الهندسية",
    sub: "كل ما تحتاجه للعقارات والهندسة في مكان واحد.",
    points: ["عقارات موثّقة ومراجَعة", "مكاتب وشركات معتمدة", "سوق خدمات هندسية"],
  },
  en: {
    headline: "Real estate & engineering services",
    sub: "Everything you need for property and engineering, in one place.",
    points: ["Verified, reviewed listings", "Accredited offices & companies", "Engineering services marketplace"],
  },
  tr: {
    headline: "Gayrimenkul ve mühendislik hizmetleri",
    sub: "Gayrimenkul ve mühendislik için ihtiyacınız olan her şey tek yerde.",
    points: ["Doğrulanmış ilanlar", "Onaylı ofisler ve şirketler", "Mühendislik hizmetleri pazarı"],
  },
};

/** Decorative brand artwork — skyline + blueprint grid, drawn from tokens so it
 *  follows the theme. Inline SVG (no raster asset, no extra request). */
function AuthArtwork() {
  return (
    <svg viewBox="0 0 400 260" className="h-auto w-full max-w-sm" role="img" aria-hidden="true" fill="none">
      <defs>
        <linearGradient id="authSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.30" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
        <pattern id="authGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" stroke="currentColor" strokeOpacity="0.14" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="400" height="260" fill="url(#authGrid)" className="text-[color:var(--color-primary-foreground)]" />
      <rect y="120" width="400" height="140" fill="url(#authSky)" />
      {/* skyline */}
      <g fill="var(--color-primary-foreground)" fillOpacity="0.9">
        <rect x="40" y="150" width="46" height="92" rx="3" />
        <rect x="96" y="118" width="54" height="124" rx="3" />
        <rect x="160" y="88" width="62" height="154" rx="3" />
        <rect x="232" y="132" width="50" height="110" rx="3" />
        <rect x="292" y="164" width="44" height="78" rx="3" />
      </g>
      {/* windows */}
      <g fill="var(--color-primary)" fillOpacity="0.55">
        {[0, 1, 2].map((c) =>
          [0, 1, 2, 3].map((r) => (
            <rect key={`a${c}${r}`} x={172 + c * 16} y={102 + r * 22} width="8" height="12" rx="1.5" />
          )),
        )}
        {[0, 1].map((c) =>
          [0, 1, 2].map((r) => (
            <rect key={`b${c}${r}`} x={110 + c * 18} y={132 + r * 22} width="8" height="12" rx="1.5" />
          )),
        )}
      </g>
      {/* accent roofline */}
      <path d="M160 88 L191 66 L222 88" stroke="var(--color-accent)" strokeWidth="3" strokeLinejoin="round" />
      <line x1="0" y1="242" x2="400" y2="242" stroke="var(--color-accent)" strokeWidth="2" strokeOpacity="0.7" />
    </svg>
  );
}

export default function AuthPageShell({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    const root = window.document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
    window.localStorage.setItem("akarpromax-lang", locale);
  }, [locale]);

  const t = authLabels(locale);
  const pitch = PITCH[locale];
  const icons = [ShieldCheck, Building2, Wrench];

  return (
    <AuthPageContextReact.Provider value={{ locale, dir: locale === "ar" ? "rtl" : "ltr", t, onLocaleChange: setLocale }}>
      <div className={`auth-page grid min-h-screen w-full bg-[color:var(--color-background)] lg:grid-cols-[1.05fr_1fr] ${locale === "ar" ? "auth-page-rtl" : "auth-page-ltr"}`}>
        {/* Brand panel — hidden on small screens so the form owns the viewport */}
        <aside className="relative hidden overflow-hidden bg-[image:var(--brand-gradient)] p-[var(--space-12)] text-[color:var(--color-primary-foreground)] lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="relative z-10 inline-flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
            <img src="/brand/logo.svg" alt="" aria-hidden="true" width={44} height={44} className="size-11" />
            <span className="flex flex-col leading-tight">
              <strong className="text-lg font-black">{translations[locale].brandTitle}</strong>
              <small className="text-xs opacity-80">{translations[locale].brandSubtitle}</small>
            </span>
          </Link>

          <div className="relative z-10 my-[var(--space-10)]">
            <h2 className="text-3xl font-black leading-snug">{pitch.headline}</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed opacity-85">{pitch.sub}</p>
            <ul className="mt-8 space-y-3">
              {pitch.points.map((point, i) => {
                const PointIcon = icons[i];
                return (
                  <li key={point} className="flex items-center gap-3 text-sm font-semibold">
                    <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-white/15">
                      <PointIcon className="size-[18px]" aria-hidden="true" />
                    </span>
                    {point}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="relative z-10 opacity-90"><AuthArtwork /></div>
        </aside>

        {/* Form panel */}
        <main className="flex flex-col p-[var(--space-5)] sm:p-[var(--space-8)]">
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden"><Brand copy={translations[locale]} /></div>
            <div className="auth-lang-switcher ms-auto flex gap-[var(--space-2)]">
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

          <div className="flex flex-1 items-center justify-center py-[var(--space-8)]">
            <div className="auth-card w-full max-w-[430px] rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-[var(--space-8)] shadow-[var(--shadow-card)]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </AuthPageContextReact.Provider>
  );
}
