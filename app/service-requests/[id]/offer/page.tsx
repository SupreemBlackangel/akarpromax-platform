"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { type RequestRow } from "@services-ui/ServiceCards";
import { RequestStatusPill } from "@services-ui/ServiceStatusBadges";
import { apiFetch, formatMoney, nameFor } from "@services-client";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";
import Button from "@/src/components/ui/Button";
import { CURRENCY_REGISTRY } from "@/lib/market/currency-registry";

type Props = { id: string };

export default function NewOfferPage({ id }: Props) {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [request, setRequest] = useState<RequestRow | null>(null);
  const [price, setPrice] = useState("");
  // CURRENCY POLICY: no preselection and no platform default. The provider
  // chooses from the canonical registry; the amount and its currency travel
  // together. No FX, no country inference.
  const [currency, setCurrency] = useState("");
  const [durationText, setDurationText] = useState("");
  const [materialsIncluded, setMaterialsIncluded] = useState(false);
  const [materialCost, setMaterialCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [visitFee, setVisitFee] = useState("");
  const [nearestDate, setNearestDate] = useState("");
  const [offerNotes, setOfferNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [needsVisit, setNeedsVisit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ request: RequestRow }>(`/api/service-requests/${encodeURIComponent(id)}`)
      .then((data) => {
        if (!controller.signal.aborted) setRequest(data.request);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  const isOpen = request && ["published", "receiving_offers"].includes(request.status);

  if (!viewer.authenticated) {
    return (
      <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} adLayout={{ mode: "safe-no-ads" }} onLogin={() => openLogin("login")} onLogout={handleLogout}>
        <PageContainer dir={dir} className="py-24 max-w-md text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t("services.loginToOffer") ?? "سجّل الدخول لتقديم عرض"}</h1>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="primary" onClick={() => openLogin("login")}>{t("services.login") ?? "تسجيل الدخول"}</Button>
            <Button variant="secondary" onClick={() => openLogin("register")}>{t("services.register") ?? "إنشاء حساب"}</Button>
          </div>
        </PageContainer>
        {AccountDialog}
      </PublicPageShell>
    );
  }

  const submit = async () => {
    const priceNum = price ? Number(price) : null;
    if (!priceNum || priceNum <= 0) {
      setError(t("services.offerPriceRequired") ?? "أدخل سعراً صحيحاً");
      return;
    }
    if (!currency) {
      setError(t("services.offerCurrencyRequired") ?? "اختر العملة");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        requestId: id,
        price: priceNum,
        currency,
        durationText: durationText.trim() || null,
        materialsIncluded,
        materialCost: materialCost ? Number(materialCost) : null,
        laborCost: laborCost ? Number(laborCost) : null,
        visitFee: visitFee ? Number(visitFee) : null,
        nearestDate: nearestDate || null,
        offerNotes: offerNotes.trim() || null,
        terms: terms.trim() || null,
        needsVisit,
      };
      if (materialsIncluded && materialCost && priceNum) {
        body.totalPrice = Math.round((priceNum + Number(materialCost)) * 100) / 100;
      }
      const data = await apiFetch<{ ok: boolean; id: string }>("/api/service-offers", { method: "POST", body: JSON.stringify(body) });
      window.location.href = `/service-requests/${id}?offer=${data.id}&sent=1`;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("services.error"));
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-gray-400";
  const labelCls = "block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1";

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      adLayout={{ mode: "safe-no-ads" }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <PageContainer dir={dir} className="py-8">
        <Link href={`/service-requests/${id}`} className="text-sm font-bold text-[var(--color-primary)] dark:text-blue-400 hover:underline">← {t("services.back") ?? "العودة للطلب"}</Link>
        <h1 className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{t("services.makeOffer") ?? "تقديم عرض"}</h1>

        {loading ? (
          <div className="mt-6 h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ) : !request ? (
          <p className="mt-6 text-gray-500 dark:text-gray-400">{t("services.empty")}</p>
        ) : !isOpen ? (
          <div className="mt-6 rounded-xl bg-[var(--accent-soft)] dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-5 text-sm text-[var(--accent)] dark:text-[var(--accent)]">
            {t("services.requestClosed") ?? "هذا الطلب لم يعد متاحاً لاستقبال العروض."}
          </div>
        ) : (
          <>
            <div className="mt-5 bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold text-gray-900 dark:text-white">{request.title || request.reference_number}</h2>
                <RequestStatusPill status={request.status} locale={locale} />
              </div>
              <p className="mt-1 text-xs text-gray-400">{request.reference_number} • {request.category ? nameFor(locale, (request.category as Record<string, unknown>).name_ar, (request.category as Record<string, unknown>).name_en, (request.category as Record<string, unknown>).name_tr, "") : ""}</p>
              {request.description && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-3">{request.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="px-3 py-1 rounded-lg bg-[var(--color-success-soft)] dark:bg-emerald-900/30 text-[var(--color-success)] dark:text-emerald-300 font-bold">{formatMoney(request.budget_min, request.currency)} – {formatMoney(request.budget_max, request.currency)}</span>
                {request.urgency && <span className="px-3 py-1 rounded-lg bg-[var(--accent-soft)] dark:bg-amber-900/30 text-[var(--accent)] dark:text-[var(--accent)]">إلحاح: {request.urgency}</span>}
              </div>
            </div>

            {error && <div className="mt-4 px-4 py-3 bg-[var(--color-error-soft)] dark:bg-red-900/30 text-[var(--color-error)] dark:text-red-300 rounded-lg text-sm">{error}</div>}

            <div className="mt-5 bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 md:p-8 space-y-5">
              <Grid columns={2}>
                <div>
                  <label className={labelCls}>{t("services.offerPrice") ?? "السعر"} *</label>
                  <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("services.currency") ?? "العملة"} *</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls} required>
                    <option value="" disabled>{t("services.currencySelect") ?? "اختر العملة"}</option>
                    {CURRENCY_REGISTRY.map((entry) => (
                      <option key={entry.code} value={entry.code}>
                        {`${entry.code} — ${locale === "en" ? entry.nameEn : locale === "tr" ? entry.nameTr : entry.nameAr}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t("services.durationText") ?? "مدة التنفيذ"}</label>
                  <input value={durationText} onChange={(e) => setDurationText(e.target.value)} className={inputCls} placeholder="مثال: 3 أيام عمل" />
                </div>
                <div>
                  <label className={labelCls}>{t("services.nearestDate") ?? "أقرب موعد متاح"}</label>
                  <input type="date" value={nearestDate} onChange={(e) => setNearestDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("services.materialCost") ?? "تكلفة المواد"}</label>
                  <input type="number" min={0} value={materialCost} onChange={(e) => setMaterialCost(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("services.laborCost") ?? "تكلفة العمل"}</label>
                  <input type="number" min={0} value={laborCost} onChange={(e) => setLaborCost(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("services.visitFee") ?? "رسوم المعاينة"}</label>
                  <input type="number" min={0} value={visitFee} onChange={(e) => setVisitFee(e.target.value)} className={inputCls} />
                </div>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                    <input type="checkbox" checked={materialsIncluded} onChange={(e) => setMaterialsIncluded(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                    {t("services.materialsIncluded") ?? "المواد متضمنة في السعر"}
                  </label>
                  <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                    <input type="checkbox" checked={needsVisit} onChange={(e) => setNeedsVisit(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                    {t("services.visitRequired") ?? "يتطلب معاينة أولاً"}
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{t("services.offerNotes") ?? "تفاصيل العرض"}</label>
                  <textarea value={offerNotes} onChange={(e) => setOfferNotes(e.target.value)} rows={4} className={inputCls} placeholder="اشرح ما يشمل العرض..." />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{t("services.terms") ?? "الشروط والأحكام"}</label>
                  <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} className={inputCls} />
                </div>
              </Grid>

              <Button
                variant="primary"
                onClick={() => void submit()}
                loading={submitting}
                disabled={submitting}
              >
                {submitting ? t("services.submitting") ?? "جارٍ الإرسال..." : t("services.submitOffer") ?? "إرسال العرض"}
              </Button>
            </div>
          </>
        )}
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
