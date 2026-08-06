"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { apiFetch } from "@services-client";
import type { CategoryRow } from "@services-ui/ServiceCards";
import AdSlot from "@/src/components/AdSlot";

type DynamicField = Record<string, unknown> & {
  key: string;
  label?: string | null;
  label_ar?: string | null;
  label_en?: string | null;
  type?: string;
  required?: boolean;
  options?: Array<{ value?: string; label?: string }>;
};

export default function NewServiceRequestPage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [cityId, setCityId] = useState(city || "");
  const [district, setDistrict] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [preferredPeriod, setPreferredPeriod] = useState("");
  const [needsVisit, setNeedsVisit] = useState(false);
  const [accessNotes, setAccessNotes] = useState("");
  const [shortAddress, setShortAddress] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachments, setAttachments] = useState<Array<{ fileName: string; fileUrl: string }>>([]);
  const [publishNow, setPublishNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ categories: CategoryRow[] }>("/api/service-categories?country=OM")
      .then((data) => {
        if (!controller.signal.aborted) {
          setCategories(data.categories ?? []);
          if ((data.categories ?? []).length > 0) setCategoryId(data.categories[0].id);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const category = categories.find((c) => c.id === categoryId) ?? null;
  const dynamicFields = useMemo<DynamicField[]>(() => {
    const fields = category?.dynamic_fields_parsed ?? [];
    return Array.isArray(fields) ? (fields as DynamicField[]) : [];
  }, [category]);

  if (!viewer.authenticated) {
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
        <div dir={dir} className="container py-24 max-w-md text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t("services.loginToPost") ?? "سجّل الدخول لنشر طلب"}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("services.loginToPostSub") ?? "أنشئ حساباً أو سجّل دخولك لتتمكن من نشر طلبات الخدمات واستقبال العروض."}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => openLogin("login")} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition">
              {t("services.login") ?? "تسجيل الدخول"}
            </button>
            <button onClick={() => openLogin("register")} className="px-6 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold transition">
              {t("services.register") ?? "إنشاء حساب"}
            </button>
          </div>
        </div>
        {AccountDialog}
      </PublicPageShell>
    );
  }

  const addAttachment = () => {
    const url = attachmentUrl.trim();
    if (!url) return;
    const fileName = url.split("/").pop()?.split("?")[0] || "ملف";
    setAttachments((prev) => [...prev, { fileName, fileUrl: url }]);
    setAttachmentUrl("");
  };

  const validate = (): string => {
    if (!categoryId) return t("services.error");
    if (title.trim().length < 5) return t("services.titleRequired") ?? "العنوان مطلوب (5 أحرف على الأقل)";
    if (!cityId.trim()) return t("services.cityRequired") ?? "المدينة مطلوبة";
    if (budgetMin && budgetMax && Number(budgetMax) < Number(budgetMin)) return t("services.budgetInvalid") ?? "الميزانية القصوى أقل من الدنيا";
    for (const field of dynamicFields) {
      if (field.required && !answers[field.key]?.trim()) return `${field.label || field.key} مطلوب`;
    }
    return "";
  };

  const submit = async () => {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const answerRows = dynamicFields
        .map((field) => ({ key: field.key, label: field.label ?? field.label_ar ?? field.label_en ?? field.key, type: field.type ?? "text", value: answers[field.key]?.trim() || null }))
        .filter((a) => a.value != null);
      const data = await apiFetch<{ ok: boolean; id: string }>("/api/service-requests", {
        method: "POST",
        body: JSON.stringify({
          categoryId,
          countryCode: "OM",
          cityId: cityId.trim(),
          districtId: district.trim() || null,
          title: title.trim(),
          description: description.trim() || null,
          budgetMin: budgetMin ? Number(budgetMin) : null,
          budgetMax: budgetMax ? Number(budgetMax) : null,
          currency: "OMR",
          urgency: urgency,
          preferredPeriod: preferredPeriod.trim() || null,
          needsVisit,
          accessNotes: accessNotes.trim() || null,
          shortAddress: shortAddress.trim() || null,
          answers: answerRows,
          attachments: attachments.slice(0, 20),
        }),
      });
      const id = data.id;
      if (publishNow) {
        await apiFetch(`/api/service-requests/${id}/publish`, { method: "POST" }).catch(() => undefined);
      }
      window.location.href = `/service-requests/${id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("services.error"));
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400";
  const labelCls = "block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1";

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
      <div dir={dir} className="container py-8 max-w-3xl">
        <Link href="/services" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← {t("services.back") ?? "العودة للسوق"}</Link>
        <h1 className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{t("services.postRequest") ?? "انشر طلباً جديداً"}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("services.wizardSub") ?? "املأ التفاصيل وسيتولى سوق الخدمات العثور على مقدمي الخدمات المناسبين."}</p>

        {error && <div className="mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}

        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 md:p-8 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>{t("services.category") ?? "التصنيف"} *</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c as { name_en?: string | null }).name_en || (c as { name_ar?: string | null }).name_ar || c.code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("services.city") ?? "المدينة"} *</label>
              <input value={cityId} onChange={(e) => setCityId(e.target.value)} className={inputCls} placeholder={t("services.cityPlaceholder") ?? "مثال: مسقط"} />
            </div>
            <div>
              <label className={labelCls}>{t("services.district") ?? "المنطقة / الحي"}</label>
              <input value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls} placeholder="الخوض، المعبيلة..." />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t("services.title") ?? "عنوان الطلب"} *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="مثال: صيانة مكيف سبليت في مسقط" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t("services.description") ?? "وصف الطلب"}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls} placeholder={t("services.descriptionPlaceholder") ?? "اشرح تفاصيل الخدمة المطلوبة..."} />
            </div>
            <div>
              <label className={labelCls}>{t("services.budgetMin") ?? "الميزانية الدنيا (ر.ع)"}</label>
              <input type="number" min={0} value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("services.budgetMax") ?? "الميزانية القصوى (ر.ع)"}</label>
              <input type="number" min={0} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("services.urgency") ?? "درجة الإلحاح"}</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className={inputCls}>
                <option value="urgent">عاجل</option>
                <option value="normal">عادي</option>
                <option value="flexible">مرن</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("services.preferredPeriod") ?? "الفترة المفضلة"}</label>
              <input value={preferredPeriod} onChange={(e) => setPreferredPeriod(e.target.value)} className={inputCls} placeholder="مثال: أيام الأسبوع صباحاً" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t("services.shortAddress") ?? "عنوان مختصر"}</label>
              <input value={shortAddress} onChange={(e) => setShortAddress(e.target.value)} className={inputCls} placeholder="قرب الجامعة، شارع 18..." />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t("services.accessNotes") ?? "ملاحظات الوصول"}</label>
              <textarea value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} rows={2} className={inputCls} />
            </div>
            <label className="sm:col-span-2 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={needsVisit} onChange={(e) => setNeedsVisit(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              {t("services.needsVisit") ?? "يتطلب معاينة الموقع"}
            </label>
          </div>

          {dynamicFields.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
              <h2 className="text-sm font-black text-gray-900 dark:text-white mb-3">{t("services.details") ?? "تفاصيل إضافية"}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {dynamicFields.map((field) => {
                  const label = field.label ?? field.label_ar ?? field.label_en ?? field.key;
                  const type = field.type ?? "text";
                  return (
                    <div key={field.key} className={type === "textarea" ? "sm:col-span-2" : ""}>
                      <label className={labelCls}>
                        {label} {field.required && "*"}
                      </label>
                      {type === "select" ? (
                        <select value={answers[field.key] ?? ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))} className={inputCls}>
                          <option value="">اختر...</option>
                          {(field.options ?? []).map((option, i) => (
                            <option key={i} value={option.value ?? option.label ?? ""}>{option.label ?? option.value}</option>
                          ))}
                        </select>
                      ) : type === "textarea" ? (
                        <textarea value={answers[field.key] ?? ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))} rows={3} className={inputCls} />
                      ) : (
                        <input
                          type={type === "number" ? "number" : type === "date" ? "date" : "text"}
                          value={answers[field.key] ?? ""}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          className={inputCls}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h2 className="text-sm font-black text-gray-900 dark:text-white mb-3">{t("services.attachments") ?? "مرفقات (روابط)"}</h2>
            <div className="flex gap-2">
              <input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAttachment(); } }} className={inputCls} placeholder="https://example.com/photo.jpg" />
              <button type="button" onClick={addAttachment} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                +
              </button>
            </div>
            {attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {attachments.map((att, i) => (
                  <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    📎 {att.fileName}
                    <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
            <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            {t("services.publishNow") ?? "نشر الطلب فوراً (سيتم عرضه لمقدمي الخدمات)"}
          </label>

          <button
            onClick={() => void submit()}
            disabled={submitting}
            className="w-full px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-black transition"
          >
            {submitting ? t("services.submitting") ?? "جارٍ الإرسال..." : publishNow ? t("services.publish") ?? "نشر الطلب" : t("services.saveDraft") ?? "حفظ كمسودة"}
          </button>
        </div>

        <AdSlot placement="request_wizard_bottom" locale={locale} country={country} city={city} path="/service-requests/new" entityType="services" variant="horizontal" className="mt-6" />
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
