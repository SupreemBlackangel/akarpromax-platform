"use client";

import type { Locale } from "@/src/types/site";

export type ToolsGateState = "loading" | "unauthenticated" | "forbidden" | "granted";

type ToolsGateProps = {
  locale: Locale;
  state: ToolsGateState;
  onRequestLogin: () => void;
  children: React.ReactNode;
};

export function ToolsGate({ locale, state, onRequestLogin, children }: ToolsGateProps) {
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
      <div dir="rtl" className="flex items-center justify-center min-h-[300px]">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4 opacity-40">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">تسجيل الدخول مطلوب</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-5">يجب تسجيل الدخول أولاً للوصول إلى الأدوات الهندسية.</p>
          <button
            onClick={onRequestLogin}
            className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {locale === "ar" ? "تسجيل الدخول" : locale === "tr" ? "Giriş yap" : "Log in"}
          </button>
        </div>
      </div>
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
