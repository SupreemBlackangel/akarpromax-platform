"use client";

import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import ThreadMessages from "@services-ui/ThreadMessages";
import { apiFetch, formatDateTime } from "@services-client";

type Thread = Record<string, unknown> & {
  thread_type: "request" | "order";
  thread_id: string;
  message_count?: number;
  unread_count?: number;
  last_message_at?: string;
};

export default function InboxPage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewer.authenticated) return;
    const controller = new AbortController();
    apiFetch<{ threads: Thread[] }>("/api/service-messages/threads")
      .then((data) => {
        if (!controller.signal.aborted) {
          const list = data.threads ?? [];
          setThreads(list);
          if (list.length > 0) setActive(list[0]);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [viewer.authenticated]);

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
      <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="inbox">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4">{t("services.inbox") ?? "صندوق الرسائل"}</h2>

        {loading ? (
          <div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ) : threads.length === 0 ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-16">{t("services.empty")}</p>
        ) : (
          <div className="grid lg:grid-cols-[300px_1fr] gap-4 items-start">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              {threads.map((thread) => {
                const isActive = active?.thread_id === thread.thread_id && active?.thread_type === thread.thread_type;
                return (
                  <button
                    key={`${thread.thread_type}-${thread.thread_id}`}
                    onClick={() => setActive(thread)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition ${
                      isActive ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        {thread.thread_type === "order" ? "مهمة" : "طلب"} #{String(thread.thread_id).slice(0, 8)}
                      </span>
                      {Number(thread.unread_count) > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">{thread.unread_count}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{formatDateTime(thread.last_message_at)}</p>
                  </button>
                );
              })}
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
              {active && (
                <ThreadMessages
                  key={`${active.thread_type}-${active.thread_id}`}
                  threadType={active.thread_type}
                  threadId={active.thread_id}
                  viewerEmail={viewer.email}
                  t={t}
                />
              )}
            </div>
          </div>
        )}
      </ServiceDashboardShell>
      {AccountDialog}
    </PublicPageShell>
  );
}
