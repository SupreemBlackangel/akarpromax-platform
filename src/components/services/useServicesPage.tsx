"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { translations } from "@/src/data/translations";
import type { Locale, ViewerContext } from "@/src/types/site";
import { useGeo } from "@/src/contexts/GeoContext";

const AccountDialog = dynamic(() => import("@/src/components/AccountDialog"), {
  ssr: false,
});

export type Flat = Record<string, string>;

const GUEST_VIEWER: ViewerContext = {
  authenticated: false,
  email: null,
  displayName: "Guest",
  role: "guest",
  countryCode: null,
  permissions: [],
};

export type UseServicesPageOptions = {
  locale?: Locale;
  country?: string;
  city?: string;
  loadI18n?: boolean;
};

export function useServicesPage(options: UseServicesPageOptions = {}) {
  const geo = useGeo();
  const [locale, setLocale] = useState<Locale>(options.locale ?? (() => {
    if (typeof window === "undefined") return "ar";
    const stored = window.localStorage.getItem("akarpromax-locale");
    if (stored === "en" || stored === "tr") return stored;
    const cookie = document.cookie.match(/(?:^|;\s*)akarpromax-locale=(ar|en|tr)(?:;|$)/)?.[1];
    return cookie === "en" || cookie === "tr" ? cookie : "ar";
  }));
  const [viewer, setViewer] = useState<ViewerContext>(GUEST_VIEWER);
  const [flat, setFlat] = useState<Flat>({});
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [accountMode, setAccountMode] = useState<"login" | "register">("login");
  const country = options.country ?? (geo.isGlobal ? "" : geo.countryCode);
  const city = options.city ?? geo.city;
  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    window.localStorage.setItem("akarpromax-locale", locale);
    try {
      document.cookie = `akarpromax-locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch { /* cookie unavailable */ }
  }, [dir, locale]);

  // The header LanguageSwitcher dispatches this event so every page using
  // this hook switches live, without prop-drilling setLocale through the shell.
  useEffect(() => {
    const onLocaleChange = (event: Event) => {
      const next = (event as CustomEvent).detail;
      if (next === "ar" || next === "en" || next === "tr") setLocale(next);
    };
    window.addEventListener("akarpromax-locale-change", onLocaleChange);
    return () => window.removeEventListener("akarpromax-locale-change", onLocaleChange);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/user-context", { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: ViewerContext) => {
        if (!controller.signal.aborted) setViewer(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setViewer(GUEST_VIEWER);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (options.loadI18n === false) {
      void Promise.resolve().then(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
      return () => controller.abort();
    }
    fetch(`/api/i18n/${locale}`, { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { translations?: Flat }) => {
        if (!controller.signal.aborted) setFlat(data.translations ?? {});
      })
      .catch(() => {
        if (!controller.signal.aborted) setFlat({});
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [locale, options.loadI18n]);

  const t = useCallback(
    (key: string): string => {
      const value = flat[key] ?? translations[locale][key as keyof typeof translations["ar"]];
      return typeof value === "string" ? value : key;
    },
    [flat, locale],
  );

  const openLogin = useCallback((mode: "login" | "register" = "login") => {
    setAccountMode(mode);
    setShowLogin(true);
  }, []);

  const handleAuthenticated = useCallback((v: ViewerContext) => {
    setViewer(v);
    setShowLogin(false);
  }, []);

  const handleLogout = useCallback(() => {
    void fetch("/api/auth/logout", { method: "POST", cache: "no-store" })
      .catch(() => undefined)
      .finally(() => {
        setViewer(GUEST_VIEWER);
        setShowLogin(false);
      });
  }, []);

  return {
    locale,
    setLocale,
    viewer,
    flat,
    t,
    dir,
    country,
    city,
    governorate: geo.governorate,
    district: geo.district,
    latitude: geo.latitude,
    longitude: geo.longitude,
    isGlobal: geo.isGlobal,
    locationSource: geo.source,
    countryConfig: geo.countryConfig,
    loading,
    showLogin,
    accountMode,
    openLogin,
    handleAuthenticated,
    handleLogout,
    AccountDialog: showLogin ? (
      <AccountDialog
        locale={locale}
        open={showLogin}
        initialMode={accountMode}
        viewer={viewer}
        onClose={() => setShowLogin(false)}
        onAuthenticated={handleAuthenticated}
      />
    ) : null,
    copy: translations[locale],
  };
}
