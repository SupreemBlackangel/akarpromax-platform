"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useServicesPage } from "@services-ui/useServicesPage";

type OfficeWorkspaceShellProps = {
  activeTab: string;
  children: ReactNode;
};

const TABS: Array<{ key: string; label: string; href: string; icon: string }> = [
  { key: "overview", label: "نظرة عامة", href: "/dashboard/office/integration", icon: "📊" },
  { key: "devices", label: "الأجهزة والربط", href: "/dashboard/office/devices", icon: "💻" },
  { key: "radar", label: "الرادار الجغرافي", href: "/dashboard/office/radar", icon: "📡" },
  { key: "sync", label: "المزامنة", href: "/dashboard/office/sync", icon: "🔄" },
  { key: "notifications", label: "التنبيهات", href: "/dashboard/office/notifications", icon: "🔔" },
];

export function OfficeWorkspaceShell({ activeTab, children }: OfficeWorkspaceShellProps) {
  const { locale, viewer } = useServicesPage({ loadI18n: false });

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
            <p className="px-3 pb-2 pt-1 text-xs font-black uppercase tracking-wider text-gray-400">
              AkarPromax Office
            </p>
            <nav className="flex flex-col gap-1">
              {TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-3">
              <Link
                href="/account/security"
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <span>⚙</span>
                <span>الإعدادات</span>
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">منطقة المكاتب المتصلة</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                أجهزة، مزامنة، رادار، وتنبيهات فورية
              </p>
            </div>
            {!viewer.authenticated && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                وضع الضيف — ستظهر بيانات تجريبية
              </span>
            )}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export default OfficeWorkspaceShell;
