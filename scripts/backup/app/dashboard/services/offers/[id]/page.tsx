"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { OfferStatusPill } from "@services-ui/ServiceStatusBadges";
import { apiFetch, formatMoney, formatDate } from "@services-client";

type OfferDetail = {
  id: string;
  request_id: string;
  provider_user_id: string;
  price?: number | null;
  currency?: string;
  total_price?: number;
  status: string;
  duration_text?: string | null;
  offer_notes?: string | null;
  terms?: string | null;
  nearest_date?: string | null;
  materials_included?: number;
  material_cost?: number | null;
  labor_cost?: number | null;
  visit_fee?: number | null;
  created_at?: string;
  revisions?: Array<Record<string, unknown>>;
};

type Props = { id: string };

export default function OfferDetailPage({ id }: Props) {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [requestRow, setRequestRow] = useState<Record<string, unknown> | null>(null);
  const [revisions, setRevisions] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showRevise, setShowRevise] = useState(false);
  const [revisePrice, setRevisePrice] = useState("");
  const [reviseNotes, setReviseNotes] = useState("");

  useEffect(() => {
    if (!viewer.authenticated) return;
    const controller = new AbortController();
    apiFetch<{ offer: OfferDetail; revisions: Array<Record<string, unknown>>; request: Record<string, unknown> | null }>(`/api/service-offers/${encodeURIComponent(id)}`)
      .then((data) => {
        if (controller.signal.aborted) return;
        setOffer(data.offer);
        setRevisions(data.revisions ?? []);
        setRequestRow(data.request ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, viewer.authenticated]);

  const action = async (path: string, body?: unknown) => {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/api/service-offers/${encodeURIComponent(id)}/${path}`, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      if (path === "accept") {
        window.location.href = "/dashboard/services/jobs";
        return;
      }
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("services.error"));
      setBusy(false);
    }
  };

  const submitRevise = () => {
    const priceNum = revisePrice ? Number(revisePrice) : null;
    if (!priceNum || priceNum <= 0) {
      setMessage(t("services.offerPriceRequired") ?? "أدخل سعراً صحيحاً");
      return;
    }
    void action("revise", { requestId: requestRow?.id, price: priceNum, offerNotes: reviseNotes.trim() || null });
  };

  if (!viewer.authenticated) {
    return (
      <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} currentPath="/dashboard/services/offers" onLogin={() => openLogin("login")} onLogout={handleLogout}>
        <div dir={dir} className="container py-24 text-center"><div className="text-5xl mb-4">🔒</div></div>
      </PublicPageShell>
    );
  }

  const isProvider = offer ? offer.provider_user_id === viewer.email : false;
  const isCustomer = offer && requestRow ? String(requestRow.customer_user_id) === viewer.email : false;
  const status = offer?.status ?? "";

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/dashboard/services/offers"
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="offers">
        <Link href="/dashboard/services/offers" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← {t("services.offers") ?? "العروض"}</Link>

        {loading ? (
          <div className="mt-4 h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ) : !offer ? (
          <p className="mt-6 text-gray-500 dark:text-gray-400">{t("services.empty")}</p>
        ) : (
          <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-black text-gray-900 dark:text-white">
                {String(requestRow?.title ?? requestRow?.reference_number ?? "عرض")}
              </h1>
              <OfferStatusPill status={status} locale={locale} />
            </div>

            {message && <div className="mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{message}</div>}

            <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="block text-xs text-gray-500 dark:text-gray-400">السعر</span><span className="font-bold text-blue-600 dark:text-blue-400">{formatMoney(offer.price, offer.currency)}</span></div>
              <div><span className="block text-xs text-gray-500 dark:text-gray-400">الإجمالي</span><span className="font-bold text-gray-900 dark:text-white">{formatMoney(offer.total_price, offer.currency)}</span></div>
              {offer.duration_text && <div><span className="block text-xs text-gray-500 dark:text-gray-400">المدة</span><span className="text-gray-800 dark:text-gray-100">{offer.duration_text}</span></div>}
              {offer.nearest_date && <div><span className="block text-xs text-gray-500 dark:text-gray-400">أقرب موعد</span><span className="text-gray-800 dark:text-gray-100">{formatDate(offer.nearest_date)}</span></div>}
              {offer.material_cost != null && <div><span className="block text-xs text-gray-500 dark:text-gray-400">تكلفة المواد</span><span className="text-gray-800 dark:text-gray-100">{formatMoney(offer.material_cost, offer.currency)}</span></div>}
              {offer.visit_fee != null && <div><span className="block text-xs text-gray-500 dark:text-gray-400">رسوم المعاينة</span><span className="text-gray-800 dark:text-gray-100">{formatMoney(offer.visit_fee, offer.currency)}</span></div>}
            </div>

            {offer.offer_notes && <div className="mt-5"><h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-1">تفاصيل العرض</h3><p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{offer.offer_notes}</p></div>}
            {offer.terms && <div className="mt-4"><h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-1">الشروط</h3><p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{offer.terms}</p></div>}

            {revisions.length > 0 && (
              <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
                <h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-2">المراجعات ({revisions.length})</h3>
                <div className="space-y-2">
                  {revisions.map((rev) => (
                    <div key={String(rev.id)} className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-700 dark:text-gray-200">مراجعة #{String(rev.revision_number)}</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{formatMoney(rev.price != null ? Number(rev.price) : null, offer.currency)}</span>
                      {Boolean(rev.reason) && <span className="text-xs text-gray-500 dark:text-gray-400 w-full">{String(rev.reason)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {isCustomer && status === "sent" && (
                <button onClick={() => void action("accept")} disabled={busy} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold transition">
                  ✓ {t("services.acceptOffer") ?? "قبول العرض"}
                </button>
              )}
              {isCustomer && status === "sent" && (
                <button onClick={() => void action("decline")} disabled={busy} className="px-5 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition">
                  ✕ {t("services.declineOffer") ?? "رفض العرض"}
                </button>
              )}
              {isProvider && status === "sent" && (
                <>
                  <button onClick={() => setShowRevise((v) => !v)} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition">
                    {t("services.reviseOffer") ?? "مراجعة العرض"}
                  </button>
                  <button onClick={() => void action("withdraw")} disabled={busy} className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                    {t("services.withdrawOffer") ?? "سحب العرض"}
                  </button>
                </>
              )}
              {isProvider && status === "withdrawn" && (
                <Link href={`/service-requests/${requestRow?.id}/offer`} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition">
                  {t("services.makeOffer") ?? "إعادة تقديم عرض"}
                </Link>
              )}
            </div>

            {showRevise && (
              <div className="mt-5 rounded-xl bg-gray-50 dark:bg-gray-800 p-5 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">السعر الجديد (ر.ع) *</label>
                  <input type="number" min={0} value={revisePrice} onChange={(e) => setRevisePrice(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">سبب المراجعة</label>
                  <input value={reviseNotes} onChange={(e) => setReviseNotes(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={submitRevise} disabled={busy} className="sm:col-span-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition">
                  {t("services.submitRevise") ?? "إرسال المراجعة"}
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
