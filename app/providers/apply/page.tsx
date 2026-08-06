"use client";

import Link from "next/link";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@/src/components/services/useServicesPage";

export default function ProviderApplyPage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();

  const start = () => {
    if (!viewer.authenticated) {
      openLogin("login");
      return;
    }
    window.location.href = "/dashboard/services/provider-profile";
  };

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <div dir={dir} className="container py-12 max-w-2xl">
        <Link href="/services" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← {t("services.back") ?? "العودة للسوق"}</Link>
        <div className="mt-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 md:p-10 text-center">
          <div className="text-5xl mb-4">👨‍🔧</div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">{t("services.becomeProvider") ?? "انضم كمقدم خدمة"}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-gray-500 dark:text-gray-400">
            {t("services.applySub") ?? "أنشئ ملفك الاحترافي، حدد تصنيفاتك وأسعارك، وسيصل إليك الطلبات المناسبة لمنطقتك تلقائياً عبر نظام المطابقة."}
          </p>
          <ul className="mx-auto mt-6 max-w-sm space-y-2 text-sm text-gray-600 dark:text-gray-300 text-left rtl:text-right">
            <li className="flex items-center gap-2"><span>✅</span> ملف احترافي يظهر للعملاء</li>
            <li className="flex items-center gap-2"><span>✅</span> مطابقة ذكية حسب المنطقة والتصنيف</li>
            <li className="flex items-center gap-2"><span>✅</span> تقييمات وثقة من العملاء</li>
            <li className="flex items-center gap-2"><span>✅</span> بدون رسوم اشتراك</li>
          </ul>
          <button onClick={start} className="mt-8 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-lg shadow-blue-600/20 transition">
            {t("services.startApplication") ?? "ابدأ الآن"}
          </button>
          {!viewer.authenticated && <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t("services.loginToOffer") ?? "سجّل دخولك أو أنشئ حساباً للاستمرار."}</p>}
        </div>
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
