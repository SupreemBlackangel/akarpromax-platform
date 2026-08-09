"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale, ViewerContext } from "@/src/types/site";
import { apiFetch, formatTime } from "@services-client";
import { getSidebarConfig, type SidebarItem } from "@/src/config/sidebar";
import { PERMISSIONS } from "@/src/constants/permissions";

type NotificationRow = {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  created_at: string;
};

function NotificationsBell({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);

  const bellLabel = locale === "ar" ? "التنبيهات" : locale === "tr" ? "Bildirimler" : "Notifications";

  const load = useCallback((controller?: AbortController) => {
    return apiFetch<{ notifications: NotificationRow[]; unread: number }>("/api/service-notifications?limit=10")
      .then((data) => {
        setItems(data.notifications ?? []);
        setUnread(data.unread ?? 0);
      })
      .catch(() => {
        if (controller?.signal.aborted) return;
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller);
    return () => controller.abort();
  }, [load]);

  const markAll = async () => {
    try {
      await apiFetch("/api/service-notifications/read-all", { method: "POST" });
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={bellLabel}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-lg transition hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-50 mt-2 w-80 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
              <span className="text-sm font-black text-gray-900 dark:text-white">التنبيهات</span>
              <button type="button" onClick={() => void markAll()} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                تحديد الكل كمقروء
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">لا توجد تنبيهات</p>
              ) : (
                items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link || "/dashboard/services"}
                    onClick={() => setOpen(false)}
                    className={`block border-b border-gray-100 dark:border-gray-800 px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-800 last:border-b-0 ${
                      n.read ? "opacity-70" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{n.title}</span>
                      <span className="shrink-0 text-[10px] text-gray-400">{formatTime(n.created_at)}</span>
                    </div>
                    {n.body ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.body}</p> : null}
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getUserType(viewer: ViewerContext): "customer" | "provider" | "supervisor" | "admin" {
  const role = viewer.role as import("@/src/constants/roles").SponsorRole;
  if (viewer.permissions.includes(PERMISSIONS.SERVICE_PROVIDERS_REVIEW) || viewer.permissions.includes(PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL)) {
    return "supervisor";
  }
  if (
    role === "service_provider" ||
    viewer.permissions.includes(PERMISSIONS.SERVICE_OFFERS_MANAGE_OWN) ||
    viewer.permissions.includes(PERMISSIONS.SERVICE_JOBS_MANAGE_OWN)
  ) {
    return "provider";
  }
  if (viewer.permissions.includes(PERMISSIONS.ADMIN_DASHBOARD_VIEW)) {
    return "admin";
  }
  return "customer";
}

function renderNavItem(item: SidebarItem, active: string, t: (key: string) => string, badgeCounts: Record<string, number>) {
  const isActive = active === item.key;
  const badgeValue = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <div key={item.key} className="group">
        <button
          type="button"
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
            isActive
              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <span>{item.icon}</span>
          <span>{t(item.labelKey)}</span>
          <span className="transition-transform group-open:rotate-90">▸</span>
        </button>
        <div className="mt-1 ml-4 border-r border-gray-200 dark:border-gray-800 pl-3 space-y-1">
          {item.children!.map((child) => (
            <Link
              key={child.key}
              href={child.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition ${
                active === child.key
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <span>{child.icon}</span>
              <span>{t(child.labelKey)}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Link
      key={item.key}
      href={item.href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
        isActive
          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      }`}
    >
      <span>{item.icon}</span>
      <span>{t(item.labelKey)}</span>
      {badgeValue > 0 && (
        <span className="ml-auto px-2 py-0.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
          {badgeValue > 99 ? "99+" : badgeValue}
        </span>
      )}
    </Link>
  );
}

export default function ServiceDashboardShell({
  viewer,
  locale,
  dir,
  t,
  active,
  children,
}: {
  viewer: ViewerContext;
  locale: Locale;
  dir: string;
  t: (key: string) => string;
  active: string;
  children: ReactNode;
}) {
  const userType = getUserType(viewer);
  const sidebarConfig = getSidebarConfig(userType);
  const visibleItems = useMemo(() => sidebarConfig.getVisibleItems(viewer), [sidebarConfig, viewer]);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!viewer.authenticated) return;
    const controller = new AbortController();
    apiFetch<Record<string, number>>("/api/service-dashboard/counts")
      .then((data) => {
        if (!controller.signal.aborted) {
          setBadgeCounts(data ?? {});
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [viewer.authenticated]);

  if (!viewer.authenticated) {
    return (
      <div dir={dir} className="container py-24 max-w-md text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t("services.loginRequired") ?? "سجّل الدخول للوصول إلى لوحة التحكم"}</h1>
      </div>
    );
  }

  return (
    <div dir={dir} className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t("services.dashboard") ?? "لوحة خدماتي"}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{viewer.displayName} • {viewer.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsBell locale={locale} />
          <Link href="/services" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition">← {t("services.market") ?? "السوق"}</Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6 items-start">
        <aside className="lg:sticky lg:top-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3">
          <nav className="flex flex-col gap-1" aria-label={t("services.navigation") ?? "التنقل"}>
            {visibleItems.map((item) => renderNavItem(item, active, t, badgeCounts))}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
