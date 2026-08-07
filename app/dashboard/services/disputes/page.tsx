"use client";

import { useEffect, useState } from "react";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { apiFetch } from "@services-client";
import { usePathname } from "next/navigation";
import Link from "next/link";

type DisputeRow = Record<string, unknown> & {
  id: string;
  order_id: string;
  status: string;
  reason: string;
  description?: string | null;
  opened_at: string;
  resolved_at?: string | null;
  order?: Record<string, unknown>;
};

export default function CustomerDisputesPage() {
  const pathname = usePathname();
  const { locale, viewer, t, dir } = useServicesPage();
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<DisputeRow | null>(null);

  useEffect(() => {
    if (!viewer.authenticated) return;
    const controller = new AbortController();
    apiFetch<{ disputes: DisputeRow[] }>("/api/service-disputes?mine=1")
      .then((data) => {
        if (!controller.signal.aborted) {
          setDisputes(data.disputes ?? []);
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

  const handleCreateDispute = async (orderId: string) => {
    const reason = window.prompt(t("services.disputeReasonRequired") ?? "سبب النزاع (إلزامي)");
    if (!reason) return;
    const description = window.prompt(t("services.disputeDescription") ?? "وصف إضافي (اختياري)") || "";
    try {
      await apiFetch("/api/service-disputes", {
        method: "POST",
        body: JSON.stringify({ orderId, reason, description }),
      });
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("services.error"));
    }
  };

  return (
    <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="disputes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t("services.disputes") ?? "نزاعاتي"}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("services.disputesSub") ?? "إدارة النزاعات المرتبطة بطلباتك"}</p>
          </div>
        </div>

        {error && <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">⚖</div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">{t("services.noDisputes") ?? "لا توجد نزاعات"}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("services.noDisputesSub") ?? "ستظهر النزاعات هنا عند وجودها"}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            {disputes.map((d) => (
              <div key={d.id} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{t("services.disputeId") ?? "نزاع"} #{d.id.slice(0, 8)}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold
                        {d.status === 'open' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                         d.status === 'in_review' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                         d.status === 'resolved' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                         'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }">
                        {d.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{d.reason}</p>
                    {d.description && <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">{d.description}</p>}
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{t("services.openedAt") ?? "تم الفتح"} {new Date(d.opened_at).toLocaleString(locale === "ar" ? "ar-SA" : locale === "tr" ? "tr-TR" : "en-US")}</p>
                  </div>
                  {d.order && (
                    <Link href={`/service-requests/${d.order.id}`} className="shrink-0 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                      {t("services.viewRequest") ?? "عرض الطلب"}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ServiceDashboardShell>
  );
}