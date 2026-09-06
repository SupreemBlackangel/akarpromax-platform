"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { LocateFixed, MapPin, ShieldCheck } from "lucide-react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { apiFetch, nameFor } from "@services-client";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";
import Button from "@/src/components/ui/Button";
import type { CategoryRow } from "@services-ui/ServiceCards";

const ServiceLocationPicker = dynamic(() => import("@services-ui/ServiceLocationPicker"), {
  ssr: false,
  loading: () => <div className="h-[320px] animate-pulse rounded-2xl bg-[var(--color-background)] dark:bg-[var(--color-surface)]" />,
});

type DynamicField = Record<string, unknown> & {
  key: string;
  label?: string | null;
  label_ar?: string | null;
  label_en?: string | null;
  type?: string;
  required?: boolean;
  options?: Array<string | { value?: string; label?: string }>;
};

/**
 * The form's sections, in the order they are read. A validation problem names
 * the one it belongs to, so the page can scroll there — the page shows every
 * section at once, and there is no "current step" to fall back on. Each id is
 * the DOM id of its <section>.
 */
type SectionId = "category" | "details" | "location" | "attachments" | "schedule" | "contact";

const DRAFT_KEY = "service_request_draft_v1";

type DraftData = {
  countryCode: string;
  categoryId: string;
  cityId: string;
  district: string;
  latitude: string;
  longitude: string;
  title: string;
  description: string;
  attachmentUrl: string;
  attachments: Array<{ fileName: string; fileUrl: string }>;
  preferredDate: string;
  preferredPeriod: string;
  needsVisit: boolean;
  accessNotes: string;
  shortAddress: string;
  urgency: string;
  answers: Record<string, string>;
  contactPhone: string;
  contactEmail: string;
  contactPreference: "phone" | "whatsapp" | "email" | "platform";
  publishNow: boolean;
  updatedAt: number;
};

const INITIAL_DRAFT: DraftData = {
  countryCode: "",
  categoryId: "",
  cityId: "",
  district: "",
  latitude: "",
  longitude: "",
  title: "",
  description: "",
  attachmentUrl: "",
  attachments: [],
  preferredDate: "",
  preferredPeriod: "",
  needsVisit: false,
  accessNotes: "",
  shortAddress: "",
  urgency: "normal",
  answers: {},
  contactPhone: "",
  contactEmail: "",
  contactPreference: "platform",
  publishNow: true,
  updatedAt: 0,
};

export default function NewServiceRequestPage() {
  const {
    locale, viewer, t: rawT, dir, country, city, district, latitude, longitude,
    isGlobal, countryConfig, openLogin, handleLogout, AccountDialog, copy,
  } = useServicesPage();
  const t = (key: string): string | undefined => {
    const value = rawT(key);
    return value && value !== key ? value : undefined;
  };
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [draft, setDraft] = useState<DraftData>(() => {
    if (typeof window === "undefined") return INITIAL_DRAFT;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DraftData;
        if (Date.now() - parsed.updatedAt < 7 * 24 * 60 * 60 * 1000) {
          return { ...INITIAL_DRAFT, ...parsed };
        }
      }
    } catch {
      /* ignore */
    }
    return INITIAL_DRAFT;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const suffix = !isGlobal && country ? `?country=${encodeURIComponent(country)}` : "";
    apiFetch<{ categories: CategoryRow[] }>(`/api/service-categories${suffix}`)
      .then((data) => {
        if (!controller.signal.aborted) {
          const leafCategories = (data.categories ?? []).filter((category) => category.parent_id);
          setCategories(leafCategories);
          const requestedCategory = new URLSearchParams(window.location.search).get("category");
          if (requestedCategory && leafCategories.some((category) => category.id === requestedCategory)) {
            setDraft((current) => ({ ...current, categoryId: current.categoryId || requestedCategory }));
          }
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [country, isGlobal]);

  useEffect(() => {
    if (isGlobal || !country) return;
    // The draft intentionally mirrors the authoritative platform location.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft((current) => {
      const countryChanged = Boolean(current.countryCode) && current.countryCode !== country;
      return {
        ...current,
        countryCode: country,
        cityId: countryChanged ? city : current.cityId || city,
        district: countryChanged ? district : current.district || district,
        latitude: countryChanged ? (latitude == null ? "" : String(latitude)) : current.latitude || (latitude == null ? "" : String(latitude)),
        longitude: countryChanged ? (longitude == null ? "" : String(longitude)) : current.longitude || (longitude == null ? "" : String(longitude)),
        // Suggested from the country, same as location — the requester can
        // still change it (e.g. Syria/Lebanon commonly quote in USD).
      };
    });
  }, [city, country, countryConfig, district, isGlobal, latitude, longitude]);

  const saveDraft = useCallback(() => {
    const updated = { ...draft, updatedAt: Date.now() };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
      setDraftSaved(true);
      window.setTimeout(() => setDraftSaved(false), 1500);
    } catch {
      /* a full or blocked store is not worth an error in the user's face */
    }
  }, [draft]);

  const updateField = useCallback(<K extends keyof DraftData>(field: K, value: DraftData[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value, updatedAt: Date.now() }));
  }, []);

  const category = categories.find((c) => c.id === draft.categoryId) ?? null;
  const dynamicFields = useMemo<DynamicField[]>(() => {
    const fields = category?.dynamic_fields_parsed ?? [];
    return Array.isArray(fields) ? (fields as DynamicField[]) : [];
  }, [category]);

  const addAttachment = () => {
    const url = draft.attachmentUrl.trim();
    if (!url) return;
    const fileName = url.split("/").pop()?.split("?")[0] || "ملف";
    updateField("attachments", [...draft.attachments, { fileName, fileUrl: url }]);
    updateField("attachmentUrl", "");
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع. اختر النقطة يدويًا من الخريطة.");
      return;
    }
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateField("latitude", position.coords.latitude.toFixed(7));
        updateField("longitude", position.coords.longitude.toFixed(7));
      },
      () => setError("تعذر الوصول إلى موقعك. اسمح للموقع باستخدام GPS أو اختر النقطة يدويًا."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  /**
   * Everything the form still needs, in reading order. The page shows all of
   * it at once, so a problem must say which section to look in — there is no
   * "current step" to fall back on.
   */
  const problems = (): { id: SectionId; message: string }[] => {
    const found: { id: SectionId; message: string }[] = [];
    if (!draft.categoryId) found.push({ id: "category", message: t("services.categoryRequired") ?? "يجب اختيار التصنيف" });
    if (draft.title.trim().length < 5) found.push({ id: "details", message: t("services.titleRequired") ?? "العنوان مطلوب (5 أحرف على الأقل)" });
    for (const field of dynamicFields) {
      if (field.required && !draft.answers[field.key]?.trim()) {
        found.push({ id: "details", message: `${field.label || field.key} مطلوب` });
      }
    }
    if (!draft.cityId.trim()) found.push({ id: "location", message: t("services.cityRequired") ?? "المدينة مطلوبة" });
    if (!draft.latitude || !draft.longitude) found.push({ id: "location", message: "حدّد موقع الخدمة على الخريطة أو استخدم موقعك الحالي" });
    if ((draft.contactPreference === "phone" || draft.contactPreference === "whatsapp") && !draft.contactPhone.trim()) {
      found.push({ id: "contact", message: "رقم الهاتف مطلوب" });
    }
    if (draft.contactPreference === "email" && !draft.contactEmail.trim()) {
      found.push({ id: "contact", message: "البريد الإلكتروني مطلوب" });
    }
    return found;
  };

  const submit = async () => {
    const found = problems();
    if (found.length > 0) {
      setError(found[0].message);
      document.getElementById(`section-${found[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!viewer.authenticated) {
      saveDraft();
      setError("طلبك محفوظ. سجّل الدخول أو أنشئ حسابًا لإرساله دون فقدان البيانات.");
      openLogin("register");
      return;
    }
    if (!draft.countryCode || isGlobal) {
      setError("اختر دولة وموقعًا محليًا قبل إرسال طلب الخدمة.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const answerRows = dynamicFields
        .map((field) => ({ key: field.key, label: field.label ?? field.label_ar ?? field.label_en ?? field.key, type: field.type ?? "text", value: draft.answers[field.key]?.trim() || null }))
        .filter((a) => a.value != null);
      const data = await apiFetch<{ ok: boolean; id: string }>("/api/service-requests", {
        method: "POST",
        body: JSON.stringify({
          categoryId: draft.categoryId,
          countryCode: draft.countryCode,
          cityId: draft.cityId.trim(),
          districtId: draft.district.trim() || null,
          latitude: draft.latitude ? Number(draft.latitude) : null,
          longitude: draft.longitude ? Number(draft.longitude) : null,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          // No budget is asked for — a customer naming a figure only bids
          // their own job down. The offers carry the price. The currency is
          // still sent because the server denominates them in it, and the
          // country's own is the only sensible answer.
          currency: countryConfig?.currencyCode || null,
          urgency: draft.urgency,
          preferredPeriod: draft.preferredPeriod.trim() || null,
          preferredDate: draft.preferredDate || null,
          needsVisit: draft.needsVisit,
          accessNotes: draft.accessNotes.trim() || null,
          shortAddress: draft.shortAddress.trim() || null,
          pricingType: category?.booking_mode === "instant" ? "fixed" : "quote",
          contactPhone: draft.contactPhone.trim() || null,
          contactEmail: draft.contactEmail.trim() || null,
          contactPreference: draft.contactPreference,
          answers: answerRows,
          attachments: draft.attachments.slice(0, 20),
        }),
      });
      const id = data.id;
      if (draft.publishNow) {
        await apiFetch(`/api/service-requests/${id}/publish`, { method: "POST" }).catch(() => undefined);
      }
      localStorage.removeItem(DRAFT_KEY);
      window.location.href = `/service-requests/${id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("services.error") ?? "تعذر إرسال الطلب");
      setSubmitting(false);
    }
  };

  const clearDraft = () => {
    if (window.confirm(t("services.clearDraftConfirm") ?? "هل تريد مسح المسودة المحفوظة؟")) {
      localStorage.removeItem(DRAFT_KEY);
      setDraft(INITIAL_DRAFT);
    }
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-gray-400";
  const labelCls = "block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1";

  const openProblems = problems();

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
        <Link href="/services" className="text-sm font-bold text-[var(--color-primary)] dark:text-[var(--color-primary)] hover:underline">← {t("services.back") ?? "العودة للسوق"}</Link>

        <div className="mt-4">
          <h1 className="text-2xl font-black text-gray-900 dark:text-[var(--color-text-primary)]">{t("services.postRequest") ?? "انشر طلباً جديداً"}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">املأ ما ينطبق على طلبك. تُحفظ البيانات على جهازك أولاً بأول.</p>
        </div>

        {!viewer.authenticated && <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-4 py-3 text-sm text-blue-800 dark:border-[var(--color-primary)]/30 dark:bg-[var(--color-primary-soft)]/40 dark:text-blue-200"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">أكمل الطلب الآن دون تسجيل</p><p className="mt-0.5 text-xs leading-5">سنحفظ كل ما تدخله على جهازك، ولن نطلب تسجيل الدخول إلا عند الإرسال النهائي.</p></div></div>}

        {error && <div className="mt-4 px-4 py-3 bg-[var(--color-error-soft)] dark:bg-red-900/30 text-[var(--color-error)] dark:text-[var(--color-error)] rounded-lg text-sm">{error}</div>}
        {draftSaved && <div className="mt-4 px-4 py-3 bg-[var(--color-success-soft)] dark:bg-[var(--color-success-soft)]/30 text-[var(--color-success)] dark:text-[var(--color-success)] rounded-lg text-sm">{t("services.draftSaved") ?? "تم حفظ المسودة تلقائياً"}</div>}

        <div className="mt-6 space-y-6">
          <div className="flex justify-end">
            <Button variant="ghost" onClick={clearDraft} className="text-xs text-gray-500 hover:text-red-500">
              {t("services.clearDraft") ?? "مسح المسودة"}
            </Button>
          </div>

          <section id="section-category" className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-6 dark:border-gray-800 dark:bg-gray-900 md:p-8">
            <h2 className="mb-5 text-base font-black text-gray-900 dark:text-[var(--color-text-primary)]">{"التصنيف"}</h2>
            <div className="space-y-5">
              <div>
                <label className={labelCls}>{t("services.category") ?? "التصنيف"} *</label>
                <select value={draft.categoryId} onChange={(e) => updateField("categoryId", e.target.value)} className={inputCls}>
                  <option value="">{t("services.selectCategory") ?? "اختر التصنيف"}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {nameFor(locale, c.name_ar, c.name_en, c.name_tr, c.code)}
                    </option>
                  ))}
                </select>
              </div>
              {category && (
                <div className="p-4 bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-soft)]/20 rounded-xl border border-blue-100 dark:border-blue-800">
                  <p className="font-semibold text-[var(--color-primary)] dark:text-[var(--color-primary)]">
                    {nameFor(locale, category.name_ar, category.name_en, category.name_tr, category.code)}
                  </p>
                  <p className="text-sm text-[var(--color-primary)] dark:text-[var(--color-primary)] mt-1">
                    {t("services.categorySelectedSub") ?? "يمكنك تغيير الاختيار في أي وقت"}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section id="section-details" className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-6 dark:border-gray-800 dark:bg-gray-900 md:p-8">
            <h2 className="mb-5 text-base font-black text-gray-900 dark:text-[var(--color-text-primary)]">{"تفاصيل الطلب"}</h2>
            <div className="space-y-5">
              <div className="sm:col-span-2">
                <label className={labelCls}>{t("services.title") ?? "عنوان الطلب"} *</label>
                <input value={draft.title} onChange={(e) => updateField("title", e.target.value)} className={inputCls} placeholder="مثال: صيانة مكيف سبليت في مسقط" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{t("services.description") ?? "وصف الطلب"}</label>
                <textarea value={draft.description} onChange={(e) => updateField("description", e.target.value)} rows={4} className={inputCls} placeholder={t("services.descriptionPlaceholder") ?? "اشرح تفاصيل الخدمة المطلوبة..."} />
              </div>
              {dynamicFields.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
                  <h2 className="text-sm font-black text-gray-900 dark:text-[var(--color-text-primary)] mb-3">{t("services.details") ?? "تفاصيل إضافية"}</h2>
                  <Grid columns={2}>
                    {dynamicFields.map((field) => {
                      const label = field.label ?? field.label_ar ?? field.label_en ?? field.key;
                      const type = field.type ?? "text";
                      return (
                        <div key={field.key} className={type === "textarea" ? "sm:col-span-2" : ""}>
                          <label className={labelCls}>
                            {label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {type === "select" ? (
                            <select value={draft.answers[field.key] ?? ""} onChange={(e) => updateField("answers", { ...draft.answers, [field.key]: e.target.value })} className={inputCls}>
                              <option value="">اختر...</option>
                              {(field.options ?? []).map((option, i) => {
                                const value = typeof option === "string" ? option : option.value ?? option.label ?? "";
                                const label = typeof option === "string" ? option : option.label ?? option.value;
                                return <option key={i} value={value}>{label}</option>;
                              })}
                            </select>
                          ) : type === "textarea" ? (
                            <textarea value={draft.answers[field.key] ?? ""} onChange={(e) => updateField("answers", { ...draft.answers, [field.key]: e.target.value })} rows={3} className={inputCls} />
                          ) : (
                            <input
                              type={type === "number" ? "number" : type === "date" ? "date" : "text"}
                              value={draft.answers[field.key] ?? ""}
                              onChange={(e) => updateField("answers", { ...draft.answers, [field.key]: e.target.value })}
                              className={inputCls}
                            />
                          )}
                        </div>
                      );
                    })}
                  </Grid>
                </div>
              )}
            </div>
          </section>

          <section id="section-location" className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-6 dark:border-gray-800 dark:bg-gray-900 md:p-8">
            <h2 className="mb-5 text-base font-black text-gray-900 dark:text-[var(--color-text-primary)]">{"الموقع"}</h2>
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-100 bg-[var(--color-primary-soft)] p-4 dark:border-[var(--color-primary)]/30 dark:bg-[var(--color-primary-soft)]/30">
                <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-white"><MapPin className="h-5 w-5" /></span><div><p className="text-sm font-black text-blue-950 dark:text-[var(--color-primary)]/80">حدّد مكان تنفيذ الخدمة بدقة</p><p className="mt-0.5 text-xs leading-5 text-[var(--color-primary)] dark:text-[var(--color-primary)]">الموقع الدقيق يحسّن مطابقة الطلب مع الحرفيين القريبين. لا يظهر للعامة، بل للمحترفين المطابقين فقط.</p></div></div><button type="button" onClick={locateMe} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-surface)] px-3 py-2 text-xs font-black text-[var(--color-primary)] shadow-sm hover:bg-[var(--color-primary-soft)] dark:bg-blue-950 dark:text-blue-200"><LocateFixed className="h-4 w-4" />استخدم موقعي</button></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={labelCls}>{t("services.city") ?? "الولاية / المدينة"} *</label><input value={draft.cityId} onChange={(e) => updateField("cityId", e.target.value)} className={inputCls} placeholder="مثال: بوشر" /></div>
                <div><label className={labelCls}>{t("services.district") ?? "المنطقة / الحي"}</label><input value={draft.district} onChange={(e) => updateField("district", e.target.value)} className={inputCls} placeholder="الخوير، المعبيلة..." /></div>
                <div className="sm:col-span-2"><label className={labelCls}>{t("services.shortAddress") ?? "عنوان مختصر"}</label><input value={draft.shortAddress} onChange={(e) => updateField("shortAddress", e.target.value)} className={inputCls} placeholder="قرب الجامع، رقم المبنى، الشارع..." /></div>
              </div>
              <ServiceLocationPicker
                latitude={Number(draft.latitude) || countryConfig?.mapCenterLat || 0}
                longitude={Number(draft.longitude) || countryConfig?.mapCenterLng || 0}
                selected={Boolean(draft.latitude && draft.longitude)}
                onChange={(position) => {
                  updateField("latitude", position.latitude.toFixed(7));
                  updateField("longitude", position.longitude.toFixed(7));
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--color-surface-muted)] px-3 py-2 text-xs dark:bg-[var(--color-surface)]">
                <span className={draft.latitude && draft.longitude ? "font-bold text-[var(--color-success)] dark:text-[var(--color-success)]" : "text-[var(--color-text-muted)]"}>{draft.latitude && draft.longitude ? "تم تثبيت نقطة الخدمة — يمكنك سحب العلامة لتصحيحها" : "انقر على الخريطة لتثبيت نقطة الخدمة"}</span>
                {draft.latitude && draft.longitude && <span dir="ltr" className="font-mono text-[var(--color-text-muted)]">{Number(draft.latitude).toFixed(6)}, {Number(draft.longitude).toFixed(6)}</span>}
              </div>
              <div><label className={labelCls}>{t("services.accessNotes") ?? "ملاحظات الوصول"}</label><textarea value={draft.accessNotes} onChange={(e) => updateField("accessNotes", e.target.value)} rows={2} className={inputCls} placeholder="مثال: البوابة الثانية أو تعليمات الوقوف والدخول" /></div>
              <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" checked={draft.needsVisit} onChange={(e) => updateField("needsVisit", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />{t("services.needsVisit") ?? "يتطلب معاينة الموقع قبل التسعير"}</label>
            </div>
          </section>

          <section id="section-attachments" className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-6 dark:border-gray-800 dark:bg-gray-900 md:p-8">
            <h2 className="mb-5 text-base font-black text-gray-900 dark:text-[var(--color-text-primary)]">{"المرفقات"}</h2>
            <div className="space-y-5">
              <div className="flex gap-2">
                <input value={draft.attachmentUrl} onChange={(e) => updateField("attachmentUrl", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAttachment(); } }} className={inputCls} placeholder="https://example.com/photo.jpg" />
                <button type="button" onClick={addAttachment} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                  +
                </button>
              </div>
              {draft.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {draft.attachments.map((att, i) => (
                    <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      📎 {att.fileName}
                      <button type="button" onClick={() => updateField("attachments", draft.attachments.filter((_, j) => j !== i))} className="text-red-500 hover:text-[var(--color-error)]">×</button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("services.attachmentsHint") ?? "أضف روابط للصور أو المستندات المتعلقة بالطلب (حتى 20 مرفق)"}</p>
            </div>
          </section>

          <section id="section-schedule" className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-6 dark:border-gray-800 dark:bg-gray-900 md:p-8">
            <h2 className="mb-5 text-base font-black text-gray-900 dark:text-[var(--color-text-primary)]">{"الموعد"}</h2>
            <Grid columns={2} className="space-y-5">
              <div>
                <label className={labelCls}>{t("services.preferredDate") ?? "التاريخ المفضل"}</label>
                <input type="date" value={draft.preferredDate} onChange={(e) => updateField("preferredDate", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t("services.preferredPeriod") ?? "الفترة المفضلة"}</label>
                <input value={draft.preferredPeriod} onChange={(e) => updateField("preferredPeriod", e.target.value)} className={inputCls} placeholder="مثال: أيام الأسبوع صباحاً" />
              </div>
              {/* Urgency belongs with the timing. The budget fields that used
                  to stand here are gone: a customer naming a figure only bids
                  their own job down, and the offers are where a price belongs. */}
              <div>
                <label className={labelCls}>{t("services.urgency") ?? "درجة الإلحاح"}</label>
                <select value={draft.urgency} onChange={(e) => updateField("urgency", e.target.value as "urgent" | "normal" | "flexible")} className={inputCls}>
                  <option value="urgent">عاجل</option>
                  <option value="normal">عادي</option>
                  <option value="flexible">مرن</option>
                </select>
              </div>
            </Grid>
          </section>

          <section id="section-contact" className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-6 dark:border-gray-800 dark:bg-gray-900 md:p-8">
            <h2 className="mb-5 text-base font-black text-gray-900 dark:text-[var(--color-text-primary)]">{"التواصل"}</h2>
            <div className="space-y-5">
              <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                <input type="radio" name="contactPreference" value="phone" checked={draft.contactPreference === "phone"} onChange={() => updateField("contactPreference", "phone")} className="h-4 w-4 text-[var(--color-primary)]" />
                <span>{t("services.contactPhone") ?? "الهاتف"}</span>
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                <input type="radio" name="contactPreference" value="whatsapp" checked={draft.contactPreference === "whatsapp"} onChange={() => updateField("contactPreference", "whatsapp")} className="h-4 w-4 text-[var(--color-primary)]" />
                <span>واتساب</span>
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                <input type="radio" name="contactPreference" value="email" checked={draft.contactPreference === "email"} onChange={() => updateField("contactPreference", "email")} className="h-4 w-4 text-[var(--color-primary)]" />
                <span>{t("services.contactEmail") ?? "البريد الإلكتروني"}</span>
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                <input type="radio" name="contactPreference" value="platform" checked={draft.contactPreference === "platform"} onChange={() => updateField("contactPreference", "platform")} className="h-4 w-4 text-[var(--color-primary)]" />
                <span>{t("services.contactChat") ?? "الدردشة داخل التطبيق"}</span>
              </label>
              {(draft.contactPreference === "phone" || draft.contactPreference === "whatsapp") && (
                <div>
                  <label className={labelCls}>{t("services.phoneNumber") ?? "رقم الهاتف"}</label>
                  <input type="tel" value={draft.contactPhone} onChange={(e) => updateField("contactPhone", e.target.value)} className={inputCls} placeholder="+968 XXXX XXXX" />
                </div>
              )}
              {draft.contactPreference === "email" && (
                <div>
                  <label className={labelCls}>{t("services.emailAddress") ?? "البريد الإلكتروني"}</label>
                  <input type="email" value={draft.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} className={inputCls} placeholder="example@domain.com" />
                </div>
              )}
            </div>
          </section>

          {/* The whole form is on one page, so there is nothing left to
              review on a page of its own — only the decision to publish, and
              the button. Any problem names its section and scrolls there. */}
          <section className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-6 dark:border-gray-800 dark:bg-gray-900 md:p-8">
            <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={draft.publishNow} onChange={(e) => updateField("publishNow", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
              {t("services.publishNow") ?? "نشر الطلب فوراً (سيتم عرضه لمقدمي الخدمات)"}
            </label>

            {openProblems.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs font-semibold text-[var(--color-error)]" role="status">
                {openProblems.map((problem) => (
                  <li key={`${problem.id}-${problem.message}`}>
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:no-underline"
                      onClick={() => document.getElementById(`section-${problem.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    >
                      • {problem.message}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={() => void submit()} loading={submitting} disabled={submitting}>
                {submitting ? t("services.submitting") ?? "جارٍ الإرسال..." : draft.publishNow ? t("services.publish") ?? "نشر الطلب" : t("services.saveDraft") ?? "حفظ كمسودة"}
              </Button>
            </div>
          </section>
        </div>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
