"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminPageShell from "@/src/components/AdminPageShell";
import { useServicesPage } from "@/src/components/services/useServicesPage";
import { apiFetch, formatDate, nameFor } from "@/src/lib/services-client";
import type { CategoryRow } from "@/src/components/services/ServiceCards";

type Overview = {
  pendingProviders: number; approvedProviders: number; publishedRequests: number;
  openOffers: number; activeJobs: number; openReports: number;
  totalRequests: number; totalOffers: number; totalJobs: number;
};
type ProviderRow = Record<string, unknown> & { id: string; status: string; display_name_ar?: string | null; display_name_en?: string | null; business_name?: string | null; city_id?: string | null; created_at?: string };
type ReportRow = Record<string, unknown> & { id: string; target_type: string; target_id: string; reason?: string | null; description?: string | null; reporter_user_id?: string | null; status?: string | null; created_at?: string };
type CategoryForm = { code: string; nameAr: string; nameEn: string; icon: string; requiresLicense: boolean; priceMin: string; priceMax: string };

const EMPTY_CATEGORY: CategoryForm = { code: "", nameAr: "", nameEn: "", icon: "🛠", requiresLicense: false, priceMin: "", priceMax: "" };

export default function ServicesAdminClient() {
  const { locale, setLocale, viewer, dir, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [tab, setTab] = useState<"overview" | "providers" | "reports" | "categories">("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hasAccess, setHasAccess] = useState(true);

  const load = useCallback(() => {
    const controller = new AbortController();
    (async () => {
      setMessage("");
      try {
        const [overviewData, providersData, reportsData, categoriesData] = await Promise.all([
          apiFetch<{ overview: Overview }>("/api/service-admin"),
          apiFetch<{ profiles: ProviderRow[] }>("/api/service-providers?status=under_review&limit=100").catch(() => ({ profiles: [] })),
          apiFetch<{ reports: ReportRow[] }>("/api/service-reports?limit=100").catch(() => ({ reports: [] })),
          apiFetch<{ categories: CategoryRow[] }>("/api/service-categories?country=OM").catch(() => ({ categories: [] })),
        ]);
        if (controller.signal.aborted) return;
        setOverview(overviewData.overview);
        setProviders(providersData.profiles ?? []);
        setReports(reportsData.reports ?? []);
        setCategories(categoriesData.categories ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setHasAccess(false);
        }
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setProviderStatus = async (id: string, status: string) => {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/api/service-providers/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const resolveReport = async (id: string) => {
    const resolution = window.prompt("ملاحظة الحل (إلزامي)");
    if (!resolution) return;
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/api/service-reports/${encodeURIComponent(id)}/resolve`, { method: "POST", body: JSON.stringify({ resolution }) });
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const createCategory = async () => {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch("/api/service-categories", {
        method: "POST",
        body: JSON.stringify({
          countryCode: "OM",
          code: categoryForm.code.trim(),
          nameAr: categoryForm.nameAr.trim() || null,
          nameEn: categoryForm.nameEn.trim() || null,
          icon: categoryForm.icon.trim() || null,
          requiresLicense: categoryForm.requiresLicense,
          priceMin: categoryForm.priceMin ? Number(categoryForm.priceMin) : null,
          priceMax: categoryForm.priceMax ? Number(categoryForm.priceMax) : null,
        }),
      });
      setCategoryForm(EMPTY_CATEGORY);
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const stats = [
    ["في انتظار المراجعة", overview?.pendingProviders ?? 0],
    ["مقدمو خدمات معتمدون", overview?.approvedProviders ?? 0],
    ["طلبات منشورة", overview?.publishedRequests ?? 0],
    ["عروض مفتوحة", overview?.openOffers ?? 0],
    ["مهام نشطة", overview?.activeJobs ?? 0],
    ["بلاغات مفتوحة", overview?.openReports ?? 0],
  ];

  const tabButton = (key: typeof tab, label: string) => (
    <button onClick={() => setTab(key)} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === key ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200"}`}>
      {label}
    </button>
  );

  const inputCls = "w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AdminPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      activeSection="services"
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <div dir={dir} className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">إدارة سوق الخدمات</h1>
          <select value={locale} onChange={(e) => setLocale(e.target.value as "ar" | "en" | "tr")} className="px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm">
            <option value="ar">العربية</option>
            <option value="en">English</option>
            <option value="tr">Türkçe</option>
          </select>
        </div>

        {!hasAccess && (
          <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
            لا تملك صلاحية الوصول لإدارة سوق الخدمات.
          </div>
        )}
        {message && <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{message}</div>}

        <div className="mb-5 flex flex-wrap gap-2">
          {tabButton("overview", "نظرة عامة")}
          {tabButton("providers", `مقدمو الخدمات${overview?.pendingProviders ? ` (${overview.pendingProviders})` : ""}`)}
          {tabButton("reports", `البلاغات${overview?.openReports ? ` (${overview.openReports})` : ""}`)}
          {tabButton("categories", "التصنيفات")}
        </div>

        {tab === "overview" && (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {stats.map(([label, value]) => (
              <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <p className="mt-1 text-3xl font-black text-blue-600 dark:text-blue-400">{value}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "providers" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            {providers.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">لا يوجد مقدمو خدمات بانتظار المراجعة</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-xs text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3">مقدم الخدمة</th>
                    <th className="px-4 py-3">المدينة</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3">العمليات</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                      <td className="px-4 py-3">
                        <Link className="font-bold text-blue-600 dark:text-blue-400 hover:underline" href={`/providers/${p.id}`}>
                          {p.business_name || nameFor(locale, p.display_name_ar, p.display_name_en, null, "مقدم خدمة")}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.city_id || "—"}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">{p.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => void setProviderStatus(p.id, "approved")} disabled={busy} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold">اعتماد</button>
                          <button onClick={() => void setProviderStatus(p.id, "rejected")} disabled={busy} className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold">رفض</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "reports" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            {reports.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">لا توجد بلاغات</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-xs text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3">النوع</th>
                    <th className="px-4 py-3">السبب</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3">التاريخ</th>
                    <th className="px-4 py-3">العمليات</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">{r.target_type}</span></td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{r.reason || r.description || "—"}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-amber-600 dark:text-amber-400">{r.status || "open"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-3">
                        {(r.status === "open" || r.status === "in_review") && (
                          <button onClick={() => void resolveReport(r.id)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold">حل البلاغ</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "categories" && (
          <div className="grid lg:grid-cols-2 gap-4 items-start">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">التصنيفات الحالية</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{c.icon} {nameFor(locale, c.name_ar, c.name_en, c.name_tr, c.code)}</span>
                    <span className="text-xs text-gray-400">{c.code}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">إضافة تصنيف</h3>
              <input value={categoryForm.code} onChange={(e) => setCategoryForm((f) => ({ ...f, code: e.target.value }))} placeholder="الرمز (مثال: ac-repair)" className={inputCls} />
              <input value={categoryForm.nameAr} onChange={(e) => setCategoryForm((f) => ({ ...f, nameAr: e.target.value }))} placeholder="الاسم (عربي)" className={inputCls} />
              <input value={categoryForm.nameEn} onChange={(e) => setCategoryForm((f) => ({ ...f, nameEn: e.target.value }))} placeholder="الاسم (إنجليزي)" className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <input value={categoryForm.priceMin} onChange={(e) => setCategoryForm((f) => ({ ...f, priceMin: e.target.value }))} placeholder="سعر من (ر.ع)" className={inputCls} />
                <input value={categoryForm.priceMax} onChange={(e) => setCategoryForm((f) => ({ ...f, priceMax: e.target.value }))} placeholder="سعر إلى (ر.ع)" className={inputCls} />
              </div>
              <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={categoryForm.requiresLicense} onChange={(e) => setCategoryForm((f) => ({ ...f, requiresLicense: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                يتطلب ترخيصاً
              </label>
              <button onClick={() => void createCategory()} disabled={busy || !categoryForm.code.trim()} className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition">
                إضافة التصنيف
              </button>
            </div>
          </div>
        )}
      </div>
      {AccountDialog}
    </AdminPageShell>
  );
}
