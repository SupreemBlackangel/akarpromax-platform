"use client";

import { useEffect, useState } from "react";
import AccountDialog from "@/src/components/AccountDialog";
import type { Locale, ViewerContext } from "@/src/types/site";

type GuardState = "loading" | "unauthenticated" | "forbidden" | "granted";

const DEFAULT_VIEWER: ViewerContext = { authenticated: false, email: null, displayName: "Guest", role: "guest", countryCode: null, permissions: [] };

type ToolsGateProps = {
  locale: Locale;
  children: React.ReactNode;
};

export function ToolsGate({ locale, children }: ToolsGateProps) {
  const [state, setState] = useState<GuardState>("loading");
  const [viewer, setViewer] = useState<ViewerContext>(DEFAULT_VIEWER);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user-context", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: ViewerContext & { permissions: string[] }) => {
        if (cancelled) return;
        if (!data.authenticated) {
          setState("unauthenticated");
          setShowLogin(true);
          return;
        }
        const hasTools = data.permissions.includes("tools.use");
        setState(hasTools ? "granted" : "forbidden");
        setViewer(data);
      })
      .catch(() => {
        if (cancelled) return;
        setState("unauthenticated");
        setShowLogin(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (state === "loading") {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="text-4xl mb-3 opacity-50">⏳</div>
          <p className="text-gray-500 dark:text-gray-400">جارٍ التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (state === "unauthenticated") {
    return (
      <>
        <div dir="rtl" className="flex items-center justify-center min-h-[300px]">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4 opacity-40">🔒</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">تسجيل الدخول مطلوب</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-5">يجب تسجيل الدخول أولاً للوصول إلى الأدوات الهندسية.</p>
            <button
              onClick={() => setShowLogin(true)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {locale === "ar" ? "تسجيل الدخول" : locale === "tr" ? "Giriş yap" : "Log in"}
            </button>
          </div>
        </div>
        {showLogin && (
          <AccountDialog
            locale={locale}
            open={showLogin}
            initialMode="login"
            viewer={viewer}
            onClose={() => setShowLogin(false)}
            onAuthenticated={(v: ViewerContext) => {
              setViewer(v);
              setState("granted");
              setShowLogin(false);
            }}
          />
        )}
      </>
    );
  }

  if (state === "forbidden") {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-[300px]">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4 opacity-40">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">403 — ليس لديك صلاحية</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-3">حسابك مسجل لكن لا يملك صلاحية الوصول إلى الأدوات.</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">اطلب من المدير العام منحك صلاحية tools.use</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
