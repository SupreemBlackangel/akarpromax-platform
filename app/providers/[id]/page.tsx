"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@/src/components/services/useServicesPage";
import Avatar from "@/src/components/services/Avatar";
import { RatingStars } from "@/src/components/services/ServiceCards";
import { apiFetch, formatDate, nameFor } from "@/src/lib/services-client";
import type { ProviderRow } from "@/src/components/services/ServiceCards";

type ReviewRow = Record<string, unknown> & {
  id: string;
  rating: number;
  comment?: string | null;
  recommend?: number;
  quality_rating?: number | null;
  punctuality_rating?: number | null;
  communication_rating?: number | null;
  value_rating?: number | null;
  created_at?: string;
};

type Props = { id: string };

export default function ProviderProfilePage({ id }: Props) {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [profile, setProfile] = useState<ProviderRow | null>(null);
  const [categories, setCategories] = useState<Array<Record<string, unknown>>>([]);
  const [portfolio, setPortfolio] = useState<Array<Record<string, unknown>>>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await apiFetch<{ profile: ProviderRow; categories: Array<Record<string, unknown>>; portfolio: Array<Record<string, unknown>>; rating: { ratingAvg: number; ratingCount: number } }>(`/api/service-providers/${encodeURIComponent(id)}`);
        if (controller.signal.aborted) return;
        setProfile(data.profile);
        setCategories(data.categories ?? []);
        setPortfolio(data.portfolio ?? []);
        if (data.profile) {
          const reviewsData = await apiFetch<{ reviews: ReviewRow[] }>(`/api/service-reviews?revieweeUserId=${encodeURIComponent(String(data.profile.user_id))}`);
          if (!controller.signal.aborted) setReviews(reviewsData.reviews ?? []);
        }
      } catch {
        if (!controller.signal.aborted) setError(t("services.error"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id, t]);

  if (loading) {
    return (
      <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} onLogin={() => openLogin("login")} onLogout={handleLogout}>
        <div dir={dir} className="container py-8"><div className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" /></div>
      </PublicPageShell>
    );
  }

  if (!profile) {
    return (
      <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} onLogin={() => openLogin("login")} onLogout={handleLogout}>
        <div dir={dir} className="container py-24 text-center text-gray-500 dark:text-gray-400">{error || t("services.empty")}</div>
      </PublicPageShell>
    );
  }

  const name = profile.business_name || nameFor(locale, profile.display_name_ar, profile.display_name_en, null, "مقدم خدمة");
  const bio = nameFor(locale, profile.bio_ar, profile.bio_en, null, "");

  const requestOffer = () => {
    if (!viewer) {
      openLogin("login");
      return;
    }
    window.location.href = "/service-requests/new";
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
      <div dir={dir} className="container py-8">
        <Link href="/services/catalog" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← {t("services.back") ?? "دليل الخدمات"}</Link>

        <div className="mt-4 relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
          {profile.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic remote provider cover URL
            <img src={profile.cover_url} alt="" className="h-44 md:h-56 w-full object-cover" />
          ) : (
            <div className="h-44 md:h-56 w-full bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-blue-950 dark:to-emerald-950" />
          )}
          <div className="p-5 md:p-8 bg-white dark:bg-gray-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar name={name} src={profile.logo_url} index={0} size="lg" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">{name}</h1>
                    {Boolean(profile.is_business) && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold">شركة</span>
                    )}
                  </div>
                  <RatingStars value={profile.rating_avg} count={profile.rating_count} locale={locale} />
                </div>
              </div>
              <button
                onClick={requestOffer}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition"
              >
                {t("services.requestService") ?? "اطلب خدمة"}
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">{profile.jobs_completed ?? 0} {t("services.jobsDone") ?? "أعمال منجزة"}</span>
              <span className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">{profile.completion_rate ?? 100}% {t("services.completion") ?? "إنجاز"}</span>
              <span className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">{profile.response_rate ?? 100}% {t("services.response") ?? "استجابة"}</span>
            </div>
          </div>
        </div>

        {bio && (
          <section className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <h2 className="font-black text-gray-900 dark:text-white mb-2">{t("services.about") ?? "نبذة"}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{bio}</p>
          </section>
        )}

        {categories.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">{t("services.categories") ?? "الخدمات المقدمة"}</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const c = cat as Record<string, unknown>;
                return (
                  <span key={String(c.id)} className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                    {nameFor(locale, c.name_ar, c.name_en, c.name_tr, String(c.id).slice(0, 6))}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {portfolio.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">{t("services.portfolio") ?? "أعمال سابقة"}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolio.map((item) => {
                const p = item as Record<string, unknown>;
                return (
                  <div key={String(p.id)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                    {Boolean(p.image_url) && (
                      // eslint-disable-next-line @next/next/no-img-element -- dynamic remote portfolio image URL
                      <img src={String(p.image_url)} alt="" className="h-40 w-full object-cover" />
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 dark:text-white">{p.title ? String(p.title) : "أعمالنا"}</h3>
                      {Boolean(p.description) && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{String(p.description)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">{t("services.reviews") ?? "تقييمات العملاء"}</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("services.empty")}</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between gap-3">
                    <RatingStars value={review.rating} count={null} locale={locale} />
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(review.created_at)}</span>
                  </div>
                  {review.comment && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {review.quality_rating != null && <span>جودة {review.quality_rating}/5</span>}
                    {review.punctuality_rating != null && <span>التزام {review.punctuality_rating}/5</span>}
                    {review.communication_rating != null && <span>تواصل {review.communication_rating}/5</span>}
                    {Boolean(review.recommend) && <span className="text-emerald-600 dark:text-emerald-400">✓ يوصي به</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
