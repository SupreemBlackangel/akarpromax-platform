"use client";

import Link from "next/link";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { PERMISSIONS } from "@/src/constants/permissions";

export default function DashboardHomePage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();

  const isAdmin = viewer.permissions.includes(PERMISSIONS.ADMIN_DASHBOARD_VIEW);
  const isSupervisor =
    viewer.permissions.includes(PERMISSIONS.SERVICE_PROVIDERS_REVIEW) ||
    viewer.permissions.includes(PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL);
  const isProvider =
    viewer.role === "service_provider" ||
    viewer.permissions.includes(PERMISSIONS.SERVICE_OFFERS_MANAGE_OWN) ||
    viewer.permissions.includes(PERMISSIONS.SERVICE_JOBS_MANAGE_OWN);
  const hasOffice = viewer.permissions.includes(PERMISSIONS.OFFICE_INTEGRATION_VIEW);

  const cards = [
    {
      href: isSupervisor ? "/dashboard/services/supervisor" : "/dashboard/services",
      icon: "📊",
      title: isSupervisor ? (t("services.dashboard") ?? "إشراف الخدمات") : (t("services.dashboard") ?? "خدماتي"),
      description: isSupervisor
        ? (t("services.navigation") ?? "إدارة طلبات ومقدمي الخدمات")
        : isProvider
          ? (t("services.nearbyRequests") ?? "طلبات مناسبة، عروض، ومهام")
          : (t("services.myRequests") ?? "طلباتي وعروضي ومهامي"),
    },
    {
      href: "/dashboard/services/inbox",
      icon: "💬",
      title: t("services.messages") ?? "صندوق الرسائل",
      description: t("services.empty") ?? "محادثات الطلبات والمهام",
    },
    {
      href: "/dashboard/services/notifications",
      icon: "🔔",
      title: t("services.notifications") ?? "التنبيهات",
      description: t("services.notifications") ?? "آخر المستجدات على طلباتك",
    },
    {
      href: isProvider ? "/dashboard/services/provider-profile" : "/account/security",
      icon: isProvider ? "👨‍🔧" : "⚙",
      title: isProvider ? (t("services.providerProfile") ?? "ملفي المهني") : (t("services.settings") ?? "الحساب والأمان"),
      description: isProvider ? (t("services.providerProfile") ?? "تحديث بياناتك وخدماتك") : (t("services.settings") ?? "كلمة المرور وإعدادات الدخول"),
    },
  ];

  if (hasOffice) {
    cards.push({
      href: "/dashboard/office/integration",
      icon: "🏢",
      title: t("office.overview") ?? "مكتبي",
      description: t("office.description") ?? "الأجهزة والربط والرادار",
    });
  }

  if (isAdmin) {
    cards.push({
      href: "/admin",
      icon: "▦",
      title: t("admin.dashboard") ?? "لوحة الإدارة",
      description: t("services.navigation") ?? "إدارة المنصة والمحتوى",
    });
  }

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/dashboard"
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <div dir={dir} className="container py-8">
        {!viewer.authenticated ? (
          <div className="max-w-md mx-auto text-center py-24">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
              {t("services.loginRequired") ?? "سجّل الدخول للوصول إلى لوحة التحكم"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t("services.market") ?? "ادخل لتتابع طلباتك وعروضك ورسائلك من مكان واحد"}
            </p>
            <button
              type="button"
              onClick={() => openLogin("login")}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition"
            >
              {t("login") ?? "تسجيل الدخول"}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t("services.dashboard") ?? "لوحة التحكم"}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {viewer.displayName} • {viewer.email}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {cards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 transition hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{card.icon}</span>
                    <span className="text-blue-500 transition-transform group-hover:translate-x-1" dir="ltr">→</span>
                  </div>
                  <p className="mt-3 font-black text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {card.title}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.description}</p>
                </Link>
              ))}

              <Link
                href="/service-requests/new"
                className="group flex flex-col justify-center items-center bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5 transition hover:border-blue-300 hover:shadow-md"
              >
                <span className="text-3xl">➕</span>
                <span className="mt-2 font-black text-blue-700 dark:text-blue-300">
                  {t("services.postRequest") ?? "انشر طلباً"}
                </span>
              </Link>
            </div>
          </>
        )}
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
