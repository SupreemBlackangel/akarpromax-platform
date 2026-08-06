"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@/src/components/services/useServicesPage";
import { RequestStatusPill, OfferStatusPill } from "@/src/components/services/ServiceStatusBadges";
import Avatar from "@/src/components/services/Avatar";
import { apiFetch, formatDate, formatMoney, nameFor, parseJsonArray } from "@/src/lib/services-client";

type DetailRow = Record<string, unknown> & {
  id: string;
  reference_number?: string | null;
  customer_user_id: string;
  category_id: string;
  title?: string | null;
  description?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  currency?: string;
  status: string;
  city_id?: string | null;
  short_address?: string | null;
  urgency?: string | null;
  preferred_period?: string | null;
  needs_visit?: number;
  access_notes?: string | null;
  answers?: string | null;
  answers_parsed?: Array<Record<string, unknown>>;
  created_at?: string;
  category?: Record<string, unknown> | null;
  attachments?: Array<Record<string, unknown>>;
  offers?: Array<Record<string, unknown>>;
};

type Props = { id: string };

export default function ServiceRequestDetailPage({ id }: Props) {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [request, setRequest] = useState<DetailRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await apiFetch<{ request: DetailRow }>(`/api/service-requests/${encodeURIComponent(id)}`);
        if (controller.signal.aborted) return;
        setRequest(data.request);
      } catch {
        if (!controller.signal.aborted) setError(t("services.error"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id, t]);

  const viewerEmail = viewer?.email ?? null;
  const isCustomer = request ? request.customer_user_id === viewerEmail : false;
  const isPublished = request ? ["published", "receiving_offers", "offer_selected", "scheduled", "in_progress", "waiting_customer_confirmation", "completed"].includes(request.status) : false;

  if (loading) {
    return (
      <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} onLogin={() => openLogin("login")} onLogout={handleLogout}>
        <div dir={dir} className="container py-8"><div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" /></div>
      </PublicPageShell>
    );
  }

  if (!request) {
    return (
      <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} onLogin={() => openLogin("login")} onLogout={handleLogout}>
        <div dir={dir} className="container py-24 text-center text-gray-500 dark:text-gray-400">{error || t("services.empty")}</div>
      </PublicPageShell>
    );
  }

  const category = request.category as Record<string, unknown> | null;
  const categoryName = category
    ? nameFor(locale, category.name_ar, category.name_en, category.name_tr, request.category_id.slice(0, 6))
    : request.category_id.slice(0, 6);
  const answers = parseJsonArray(request.answers ?? (request.answers_parsed as unknown) ?? null);

  const makeOffer = () => {
    if (!viewer) {
      openLogin("login");
      return;
    }
    window.location.href = `/service-requests/${request.id}/offer`;
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
      <div dir={dir} className="container py-8 max-w-4xl">
        <Link href="/service-requests" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← {t("services.requests") ?? "الطلبات"}</Link>

        <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-gray-400">{request.reference_number}</span>
              <RequestStatusPill status={request.status} locale={locale} />
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">{categoryName}</span>
            </div>
            <span className="text-xs text-gray-400">{formatDate(request.created_at)}</span>
          </div>

          <h1 className="mt-3 text-2xl font-black text-gray-900 dark:text-white">{request.title || "طلب خدمة"}</h1>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {request.budget_min != null && (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold">
                {formatMoney(request.budget_min, request.currency)} – {formatMoney(request.budget_max, request.currency)}
              </span>
            )}
            {request.urgency && (
              <span className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold">إلحاح: {request.urgency}</span>
            )}
            {request.preferred_period && (
              <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">{request.preferred_period}</span>
            )}
            {Boolean(request.needs_visit) && (
              <span className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold">يتطلب معاينة</span>
            )}
          </div>

          {request.description && (
            <div className="mt-6">
              <h2 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-2">{t("services.description") ?? "التفاصيل"}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{request.description}</p>
            </div>
          )}

          {answers.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-2">{t("services.details") ?? "تفاصيل إضافية"}</h2>
              <dl className="grid sm:grid-cols-2 gap-3">
                {answers.map((a) => (
                  <div key={String(a.key ?? a.label)} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400">{String(a.label ?? a.key)}</dt>
                    <dd className="text-sm text-gray-800 dark:text-gray-100">{String(a.value ?? "-")}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {request.attachments && request.attachments.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-2">{t("services.attachments") ?? "المرفقات"}</h2>
              <div className="flex flex-wrap gap-2">
                {request.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={String((att as { file_url?: string }).file_url ?? "")}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  >
                    📎 {String((att as { file_name?: string }).file_name ?? "ملف")}
                  </a>
                ))}
              </div>
            </div>
          )}

          {!isCustomer && isPublished && (
            <div className="mt-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-5 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("services.offerCta") ?? "هل يمكنك تقديم هذه الخدمة؟ قدّم عرضك الآن."}</p>
              <button onClick={makeOffer} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition">
                {t("services.makeOffer") ?? "تقديم عرض"}
              </button>
              {!viewer && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("services.loginToOffer") ?? "سجّل دخولك أو أنشئ حساباً للاستمرار."}</p>}
            </div>
          )}

          {isCustomer && request.offers && request.offers.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">{t("services.offers") ?? "العروض المقدمة"} ({request.offers.length})</h2>
              <div className="space-y-3">
                {request.offers.map((offer) => {
                  const o = offer as Record<string, unknown>;
                  return (
                    <div key={String(o.id)} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={String(o.business_name ?? o.display_name_en ?? "مقدم")} src={o.logo_url ? String(o.logo_url) : null} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900 dark:text-white">
                            {String(o.business_name ?? o.display_name_en ?? o.display_name_ar ?? "مقدم خدمة")}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatMoney(typeof o.price === "number" ? o.price : Number(o.price), request.currency)} • {formatDate(o.created_at ? String(o.created_at) : undefined)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <OfferStatusPill status={String(o.status)} locale={locale} />
                        <Link
                          href={`/dashboard/services/offers/${String(o.id)}`}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                        >
                          {t("services.viewOffer") ?? "عرض التفاصيل"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {isCustomer && (
          <div className="mt-4 text-center">
            <Link href="/dashboard/services/my-requests" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
              {t("services.manageRequest") ?? "إدارة طلباتي ←"}
            </Link>
          </div>
        )}
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
