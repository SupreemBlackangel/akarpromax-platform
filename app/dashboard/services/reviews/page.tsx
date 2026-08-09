"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { RatingStars } from "@services-ui/ServiceCards";
import { apiFetch, formatDate } from "@services-client";

type ReviewRow = Record<string, unknown> & {
  id: string;
  order_id: string;
  reviewer_user_id: string;
  rating: number;
  comment?: string | null;
  recommend?: number;
  created_at?: string;
};

export default function ReviewsPage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [received, setReceived] = useState<ReviewRow[]>([]);
  const [given, setGiven] = useState<ReviewRow[]>([]);
  const [tab, setTab] = useState<"received" | "given">("received");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewer.authenticated || !viewer.email) return;
    const controller = new AbortController();
    const email = viewer.email;
    (async () => {
      try {
        const [receivedData, givenData] = await Promise.all([
          apiFetch<{ reviews: ReviewRow[] }>(`/api/service-reviews?revieweeUserId=${encodeURIComponent(email)}`),
          apiFetch<{ reviews: ReviewRow[] }>(`/api/service-reviews?reviewerUserId=${encodeURIComponent(email)}`),
        ]);
        if (controller.signal.aborted) return;
        setReceived(receivedData.reviews ?? []);
        setGiven(givenData.reviews ?? []);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [viewer.authenticated, viewer.email]);

  const list = tab === "received" ? received : given;

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/dashboard/services/reviews"
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="reviews">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setTab("received")} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === "received" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200"}`}>
            {t("services.reviewsReceived") ?? "التقييمات المستلمة"} ({received.length})
          </button>
          <button onClick={() => setTab("given")} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === "given" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200"}`}>
            {t("services.reviewsGiven") ?? "التقييمات المرسلة"} ({given.length})
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
        ) : list.length === 0 ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-16">{t("services.empty")}</p>
        ) : (
          <div className="space-y-3">
            {list.map((review) => (
              <div key={review.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <RatingStars value={review.rating} count={null} locale={locale} />
                  <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                </div>
                {review.comment && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>}
                <div className="mt-3 flex items-center justify-between">
                  {Boolean(review.recommend) && <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ يوصي به</span>}
                  <Link href={`/dashboard/services/jobs/${review.order_id}`} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    المهمة #{String(review.order_id).slice(0, 8)} ←
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </ServiceDashboardShell>
      {AccountDialog}
    </PublicPageShell>
  );
}
