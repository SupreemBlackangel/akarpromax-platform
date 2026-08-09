"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { OrderStatusPill } from "@services-ui/ServiceStatusBadges";
import ThreadMessages from "@services-ui/ThreadMessages";
import { apiFetch, formatDateTime, formatMoney } from "@services-client";

const NEXT_STATUSES: Record<string, string[]> = {
  created: ["accepted", "cancelled"],
  accepted: ["scheduled", "in_progress", "cancelled"],
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["delivered", "waiting_customer_confirmation", "cancelled"],
  waiting_customer_confirmation: ["completed", "disputed"],
  delivered: ["completed", "waiting_customer_confirmation", "disputed"],
  completed: [],
  cancelled: [],
  disputed: ["completed"],
};

type JobDetail = Record<string, unknown> & {
  id: string;
  status: string;
  total_price?: number;
  currency?: string;
  scheduled_date?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  request?: Record<string, unknown> | null;
  offer?: Record<string, unknown> | null;
  timeline?: Array<Record<string, unknown>>;
  reviews?: Array<Record<string, unknown>>;
};

type Props = { id: string };

export default function JobDetailPage({ id }: Props) {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [recommend, setRecommend] = useState(true);

  useEffect(() => {
    if (!viewer.authenticated) return;
    const controller = new AbortController();
    apiFetch<{ job: JobDetail }>(`/api/service-jobs/${encodeURIComponent(id)}`)
      .then((data) => {
        if (!controller.signal.aborted) setJob(data.job);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, viewer.authenticated]);

  const updateStatus = async (status: string) => {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/api/service-jobs/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status, note: note.trim() || null }) });
      setNote("");
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("services.error"));
      setBusy(false);
    }
  };

  const submitReview = async () => {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/api/service-jobs/${encodeURIComponent(id)}/review`, {
        method: "POST",
        body: JSON.stringify({ rating, comment: comment.trim() || null, recommend }),
      });
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("services.error"));
      setBusy(false);
    }
  };

  if (!viewer.authenticated) {
    return (
      <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} currentPath="/dashboard/services/jobs" onLogin={() => openLogin("login")} onLogout={handleLogout}>
        <div dir={dir} className="container py-24 text-center"><div className="text-5xl mb-4">🔒</div></div>
      </PublicPageShell>
    );
  }

  const request = job?.request as Record<string, unknown> | null;
  const offer = job?.offer as Record<string, unknown> | null;
  const nextStatuses = NEXT_STATUSES[job?.status ?? ""] ?? [];
  const reviewed = (job?.reviews ?? []).some((r) => String(r.reviewer_user_id) === viewer.email);
  const canReview = job?.status === "completed" && !reviewed;

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/dashboard/services/jobs"
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="jobs">
        <Link href="/dashboard/services/jobs" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← {t("services.jobs") ?? "المهام"}</Link>

        {loading ? (
          <div className="mt-4 h-72 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ) : !job ? (
          <p className="mt-6 text-gray-500 dark:text-gray-400">{t("services.empty")}</p>
        ) : (
          <div className="mt-4 space-y-4">
            {message && <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{message}</div>}

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-gray-900 dark:text-white">
                    {String(request?.title ?? job.reference_number ?? `مهمة #${String(job.id).slice(0, 8)}`)}
                  </h1>
                  <p className="mt-1 text-xs text-gray-400">أنشئت في {formatDateTime(job.created_at)} • آخر تحديث {formatDateTime(job.updated_at)}</p>
                </div>
                <OrderStatusPill status={job.status} locale={locale} />
              </div>
              <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="block text-xs text-gray-500 dark:text-gray-400">القيمة الإجمالية</span><span className="font-bold text-blue-600 dark:text-blue-400">{formatMoney(job.total_price, job.currency)}</span></div>
                {job.scheduled_date && <div><span className="block text-xs text-gray-500 dark:text-gray-400">الموعد</span><span className="text-gray-800 dark:text-gray-100">{formatDateTime(job.scheduled_date)}</span></div>}
                {job.address && <div><span className="block text-xs text-gray-500 dark:text-gray-400">العنوان</span><span className="text-gray-800 dark:text-gray-100">{job.address}</span></div>}
              </div>
              {offer && Boolean(offer.offer_notes) && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{String(offer.offer_notes)}</p>}
              {job.notes && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{job.notes}</p>}
            </div>

            {nextStatuses.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                <h2 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">{t("services.updateStatus") ?? "تحديث حالة المهمة"}</h2>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("services.statusNote") ?? "ملاحظة (اختياري)"}
                  className="w-full mb-3 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((status) => (
                    <button key={status} onClick={() => void updateStatus(status)} disabled={busy} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition">
                      {status.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">{t("services.timeline") ?? "سجل المهمة"}</h2>
              {(job.timeline ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">{t("services.empty")}</p>
              ) : (
                <div className="space-y-0">
                  {(job.timeline ?? []).map((event) => (
                    <div key={String(event.id)} className="flex gap-3 pb-4 last:pb-0">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-none" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{String(event.event).replace(/_/g, " ")}</p>
                        {Boolean(event.note) && <p className="text-xs text-gray-500 dark:text-gray-400">{String(event.note)}</p>}
                        {Boolean(event.to_status) && (
                          <p className="text-xs text-gray-400">{event.from_status ? `${String(event.from_status)} → ${String(event.to_status)}` : String(event.to_status)}</p>
                        )}
                        <p className="text-xs text-gray-400">{formatDateTime(event.created_at ? String(event.created_at) : undefined)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">{t("services.messages") ?? "الرسائل"}</h2>
              <ThreadMessages threadType="order" threadId={job.id} viewerEmail={viewer.email} t={t} />
            </div>

            {canReview && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                <h2 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">{t("services.leaveReview") ?? "قيم الخدمة"}</h2>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">التقييم:</span>
                  <div className="flex gap-1 text-2xl">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setRating(n)} className={n <= rating ? "text-amber-400" : "text-gray-300 dark:text-gray-600"}>★</button>
                    ))}
                  </div>
                </div>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder={t("services.reviewComment") ?? "شارك تجربتك..."} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <label className="mt-3 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                  <input type="checkbox" checked={recommend} onChange={(e) => setRecommend(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  {t("services.recommend") ?? "أوصي بهذا المقدم"}
                </label>
                <button onClick={() => void submitReview()} disabled={busy} className="mt-4 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition">
                  {t("services.submitReview") ?? "إرسال التقييم"}
                </button>
              </div>
            )}
          </div>
        )}
      </ServiceDashboardShell>
      {AccountDialog}
    </PublicPageShell>
  );
}
