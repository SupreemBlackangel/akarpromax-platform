"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Lock } from "lucide-react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@/src/components/services/useServicesPage";
import PageContainer from "@/src/components/layout/PageContainer";

/**
 * The one shell every user-dashboard page renders inside: full site chrome
 * (header, rail, footer) via PublicPageShell, a locale-aware page header with
 * a back-to-dashboard breadcrumb, and a built-in login gate so no dashboard
 * surface ever renders to a logged-out visitor.
 */

type DashboardPageShellProps = {
  currentPath: string;
  title: { ar: string; en: string; tr: string };
  description?: { ar: string; en: string; tr: string };
  /** Extra header actions (e.g. a "new item" button). */
  actions?: ReactNode;
  requireAuth?: boolean;
  /** Page brings its own hero/header: render only site chrome + auth gate. */
  chromeOnly?: boolean;
  children: ReactNode;
};

const COMMON = {
  back: { ar: "لوحة التحكم", en: "Dashboard", tr: "Panel" },
  loginTitle: { ar: "سجّل الدخول للوصول إلى هذه الصفحة", en: "Sign in to access this page", tr: "Bu sayfaya erişmek için giriş yapın" },
  loginBody: { ar: "هذه الصفحة خاصة بحسابك. سجّل الدخول للمتابعة.", en: "This page belongs to your account. Sign in to continue.", tr: "Bu sayfa hesabınıza özeldir. Devam etmek için giriş yapın." },
  loginCta: { ar: "تسجيل الدخول", en: "Sign in", tr: "Giriş yap" },
} as const;

export default function DashboardPageShell({ currentPath, title, description, actions, requireAuth = true, chromeOnly = false, children }: DashboardPageShellProps) {
  const { locale, viewer, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();

  if (chromeOnly) {
    return (
      <PublicPageShell
        locale={locale} copy={copy} viewer={viewer} country={country} city={city}
        currentPath={currentPath} adLayout={{ mode: "safe-no-ads" }}
        onLogin={() => openLogin("login")} onLogout={handleLogout}
      >
        {requireAuth && !viewer.authenticated ? (
          <PageContainer className="py-8" dir={dir}>
            <div className="mx-auto max-w-md py-24 text-center">
              <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <Lock className="h-7 w-7" />
              </span>
              <h1 className="mb-2 text-2xl font-black text-[var(--color-text-primary)]">{COMMON.loginTitle[locale]}</h1>
              <p className="mb-6 text-sm text-[var(--color-text-muted)]">{COMMON.loginBody[locale]}</p>
              <button type="button" onClick={() => openLogin("login")} className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-primary-hover)]">
                {COMMON.loginCta[locale]}
              </button>
            </div>
          </PageContainer>
        ) : (
          <div dir={dir}>{children}</div>
        )}
        {AccountDialog}
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath={currentPath}
      adLayout={{ mode: "safe-no-ads" }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <PageContainer className="py-8" dir={dir}>
        {requireAuth && !viewer.authenticated ? (
          <div className="mx-auto max-w-md py-24 text-center">
            <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Lock className="h-7 w-7" />
            </span>
            <h1 className="mb-2 text-2xl font-black text-[var(--color-text-primary)]">{COMMON.loginTitle[locale]}</h1>
            <p className="mb-6 text-sm text-[var(--color-text-muted)]">{COMMON.loginBody[locale]}</p>
            <button
              type="button"
              onClick={() => openLogin("login")}
              className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-primary-hover)]"
            >
              {COMMON.loginCta[locale]}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              {currentPath !== "/dashboard" && (
                <Link href="/dashboard" className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] hover:underline">
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-0 ltr:rotate-180" />
                  {COMMON.back[locale]}
                </Link>
              )}
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-black text-[var(--color-text-primary)]">{title[locale]}</h1>
                  {description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description[locale]}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
              </div>
            </div>
            {children}
          </>
        )}
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
