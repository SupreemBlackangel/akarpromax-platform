"use client";

import { useEffect, useState } from "react";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { apiFetch } from "@services-client";
import Link from "next/link";
import Button from "@/src/components/ui/Button";
import { usePathname } from "next/navigation";

type NotificationRow = {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  created_at: string;
};

export default function ServiceNotificationsPage() {
  const pathname = usePathname();
  const { locale, viewer, t, dir } = useServicesPage();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!viewer.authenticated) return;
    const controller = new AbortController();
    apiFetch<{ notifications: NotificationRow[] }>("/api/service-notifications?limit=100")
      .then((data) => {
        if (!controller.signal.aborted) {
          setNotifications(data.notifications ?? []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t("services.error"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [viewer.authenticated]);

  const handleReadAll = async () => {
    try {
      await apiFetch("/api/service-notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      setError(t("services.error"));
    }
  };

  const handleRead = async (id: string) => {
    try {
      await apiFetch(`/api/service-notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      setError(t("services.error"));
    }
  };

  return (
    <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="notifications">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-[var(--color-surface)]">{t("services.notifications") ?? "التنبيهات"}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("services.notificationsSub") ?? "جميع التنبيهات والإشعارات المتعلقة بخدماتك"}</p>
          </div>
          {notifications.some((n) => !n.read) && (
            <Button variant="secondary" onClick={handleReadAll} size="sm">
              {t("services.markAllRead") ?? "تحديد الكل كمقروء"}
            </Button>
          )}
        </div>

        {error && <div className="px-4 py-3 bg-[var(--color-error-soft)] dark:bg-red-900/30 text-[var(--color-error)] dark:text-[var(--color-error)] rounded-lg text-sm">{error}</div>}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔔</div>
            <h2 className="text-xl font-black text-gray-900 dark:text-[var(--color-surface)]">{t("services.noNotifications") ?? "لا توجد تنبيهات"}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("services.noNotificationsSub") ?? "ستظهر التنبيهات هنا عند وصولها"}</p>
          </div>
        ) : (
          <div className="bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link || "/dashboard/services"}
                onClick={() => !n.read && handleRead(n.id)}
                className={`block border-b border-gray-100 dark:border-gray-800 px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-800 last:border-b-0 flex items-start justify-between gap-4 ${n.read ? "opacity-70" : "bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-soft)]/20"}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-[var(--color-surface)]">{n.title}</span>
                    <span className="shrink-0 text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString(locale === "ar" ? "ar-SA" : locale === "tr" ? "tr-TR" : "en-US")}</span>
                  </div>
                  {n.body && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{n.body}</p>}
                  {!n.read && <span className="mt-2 inline-block px-2 py-0.5 text-[10px] font-bold text-white bg-[var(--color-primary)] rounded-full">{t("services.new") ?? "جديد"}</span>}
                </div>
                <span className="shrink-0 text-gray-400">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ServiceDashboardShell>
  );
}