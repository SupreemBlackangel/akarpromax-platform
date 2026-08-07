"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { apiFetch } from "@services-client";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";
import Button from "@/src/components/ui/Button";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Locale = "ar" | "en" | "tr";

type Overview = {
  pendingProviders: number;
  approvedProviders: number;
  publishedRequests: number;
  openOffers: number;
  activeJobs: number;
  openReports: number;
  totalRequests: number;
  totalOffers: number;
  totalJobs: number;
};

type ProviderRow = Record<string, unknown> & { id: string; status: string; display_name_ar?: string | null; display_name_en?: string | null; business_name?: string | null; city_id?: string | null; created_at?: string };

type ReportRow = Record<string, unknown> & { id: string; target_type: string; target_id: string; reason?: string | null; description?: string | null; status?: string | null; created_at?: string };

type CategoryRow = Record<string, unknown> & { id: string; code: string; name_ar?: string | null; name_en?: string | null; name_tr?: string | null; icon?: string | null; is_active?: number };

export default function SupervisorDashboardPage() {
  const pathname = usePathname();
  const { locale, viewer, t, dir } = useServicesPage();
  const active = useMemo(() => {
    if (pathname.includes("/providers")) return "providers";
    if (pathname.includes("/reports")) return "reports";
    if (pathname.includes("/categories")) return "categories";
    if (pathname.includes("/requests")) return "requests";
    if (pathname.includes("/offers")) return "offers";
    if (pathname.includes("/disputes")) return "disputes";
    return "overview";
  }, [pathname]);
  const [tab, setTab] = useState<"overview" | "providers" | "reports" | "categories" | "requests" | "offers" | "disputes">("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
        if (!controller.signal.aborted) setMessage(t("services.error"));
      }
    })();
    return () => controller.abort();
  }, [locale]);

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
      setMessage(e instanceof Error ? e.message : t("services.error"));
    } finally {
      setBusy(false);
    }
  };

  const resolveReport = async (id: string) => {
    const resolution = window.prompt(t("services.resolutionRequired") ?? "ملاحظة الحل (إلزامي)");
    if (!resolution) return;
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/api/service-reports/${encodeURIComponent(id)}/resolve`, { method: "POST", body: JSON.stringify({ resolution }) });
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("services.error"));
    } finally {
      setBusy(false);
    }
  };

  const stats = [
    [t("services.pendingProviders") ?? "في انتظار المراجعة", overview?.pendingProviders ?? 0],
    [t("services.approvedProviders") ?? "مقدمو خدمات معتمدون", overview?.approvedProviders ?? 0],
    [t("services.publishedRequests") ?? "طلبات منشورة", overview?.publishedRequests ?? 0],
    [t("services.openOffers") ?? "عروض مفتوحة", overview?.openOffers ?? 0],
    [t("services.activeJobs") ?? "مهام نشطة", overview?.activeJobs ?? 0],
    [t("services.openReports") ?? "بلاغات مفتوحة", overview?.openReports ?? 0],
  ];

  const tabButton = (key: typeof tab, label: string, count?: number) => (
    <button onClick={() => setTab(key)} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === key ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200"}`}>
      {label} {count !== undefined ? `(${count})` : ""}
    </button>
  );

  return (
    <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active={active}>
      <PageContainer dir={dir} className="py-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t("services.supervisorDashboard") ?? "لوحة مشرف الخدمات"}</h1>
        </div>

        {message && <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{message}</div>}

        <div className="mb-5 flex flex-wrap gap-2">
          {tabButton("overview", t("services.overview") ?? "نظرة عامة")}
          {tabButton("requests", t("services.requests") ?? "طلبات الخدمات", overview?.publishedRequests)}
          {tabButton("offers", t("services.offers") ?? "العروض", overview?.openOffers)}
          {tabButton("providers", t("services.providers") ?? "مقدمو الخدمات", overview?.pendingProviders)}
          {tabButton("reports", t("services.reports") ?? "البلاغات", overview?.openReports)}
          {tabButton("categories", t("services.categories") ?? "التصنيفات")}
          {tabButton("disputes", t("services.disputes") ?? "النزاعات")}
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
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">{t("services.noPendingProviders") ?? "لا يوجد مقدمو خدمات بانتظار المراجعة"}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-xs text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3">{t("services.provider") ?? "مقدم الخدمة"}</th>
                    <th className="px-4 py-3">{t("services.city") ?? "المدينة"}</th>
                    <th className="px-4 py-3">{t("services.status") ?? "الحالة"}</th>
                    <th className="px-4 py-3">{t("services.actions") ?? "العمليات"}</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                      <td className="px-4 py-3">
                        <Link className="font-bold text-blue-600 dark:text-blue-400 hover:underline" href={`/providers/${p.id}`}>
                          {p.business_name || p.display_name_ar || p.display_name_en || "مقدم خدمة"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.city_id || "—"}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">{p.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => void setProviderStatus(p.id, "approved")} disabled={busy} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold">{t("services.approve") ?? "اعتماد"}</button>
                          <button onClick={() => void setProviderStatus(p.id, "rejected")} disabled={busy} className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold">{t("services.reject") ?? "رفض"}</button>
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
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">{t("services.noReports") ?? "لا توجد بلاغات"}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-xs text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3">{t("services.type") ?? "النوع"}</th>
                    <th className="px-4 py-3">{t("services.reason") ?? "السبب"}</th>
                    <th className="px-4 py-3">{t("services.status") ?? "الحالة"}</th>
                    <th className="px-4 py-3">{t("services.date") ?? "التاريخ"}</th>
                    <th className="px-4 py-3">{t("services.actions") ?? "العمليات"}</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">{r.target_type}</span></td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{r.reason || r.description || "—"}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-amber-600 dark:text-amber-400">{r.status || "open"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{r.created_at ? new Date(r.created_at).toLocaleString(locale === "ar" ? "ar-SA" : locale === "tr" ? "tr-TR" : "en-US") : "—"}</td>
                      <td className="px-4 py-3">
                        {(r.status === "open" || r.status === "in_review") && (
                          <button onClick={() => void resolveReport(r.id)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold">{t("services.resolve") ?? "حل البلاغ"}</button>
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
              <h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">{t("services.currentCategories") ?? "التصنيفات الحالية"}</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{c.icon || "🛠"} {c.name_ar || c.name_en || c.code}</span>
                    <span className="text-xs text-gray-400">{c.code}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">{t("services.addCategory") ?? "إضافة تصنيف"}</h3>
              <CategoryForm t={t} onSubmit={load} />
            </div>
          </div>
        )}

        {tab === "requests" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">{t("services.allRequests") ?? "جميع طلبات الخدمات"}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("services.requestsComingSoon") ?? "قائمة الطلبات الكاملة مع فلاتر متقدمة — قيد التطوير"}</p>
          </div>
        )}

        {tab === "offers" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">{t("services.allOffers") ?? "جميع العروض"}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("services.offersComingSoon") ?? "قائمة العروض الكاملة مع فلاتر متقدمة — قيد التطوير"}</p>
          </div>
        )}

        {tab === "disputes" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">{t("services.disputes") ?? "النزاعات"}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("services.disputesComingSoon") ?? "إدارة النزاعات وسير العمل — قيد التطوير"}</p>
          </div>
        )}
      </PageContainer>
    </ServiceDashboardShell>
  );
}

function CategoryForm({ t, onSubmit }: { t: (key: string) => string; onSubmit: () => void }) {
  const [form, setForm] = useState({ code: "", nameAr: "", nameEn: "", icon: "🛠", requiresLicense: false, priceMin: "", priceMax: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return;
    setBusy(true);
    try {
      await apiFetch("/api/service-categories", {
        method: "POST",
        body: JSON.stringify({
          countryCode: "OM",
          code: form.code.trim(),
          nameAr: form.nameAr.trim() || null,
          nameEn: form.nameEn.trim() || null,
          icon: form.icon.trim() || null,
          requiresLicense: form.requiresLicense,
          priceMin: form.priceMin ? Number(form.priceMin) : null,
          priceMax: form.priceMax ? Number(form.priceMax) : null,
        }),
      });
      setForm({ code: "", nameAr: "", nameEn: "", icon: "🛠", requiresLicense: false, priceMin: "", priceMax: "" });
      onSubmit();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={submit} className="space-y-3">
      <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="الرمز (مثال: ac-repair)" className={inputCls} required />
      <input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} placeholder="الاسم (عربي)" className={inputCls} />
      <input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} placeholder="الاسم (إنجليزي)" className={inputCls} />
      <div className="grid grid-cols-2 gap-3">
        <input value={form.priceMin} onChange={(e) => setForm((f) => ({ ...f, priceMin: e.target.value }))} placeholder="سعر من (ر.ع)" className={inputCls} />
        <input value={form.priceMax} onChange={(e) => setForm((f) => ({ ...f, priceMax: e.target.value }))} placeholder="سعر إلى (ر.ع)" className={inputCls} />
      </div>
      <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
        <input type="checkbox" checked={form.requiresLicense} onChange={(e) => setForm((f) => ({ ...f, requiresLicense: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
        {t("services.requiresLicense") ?? "يتطلب ترخيصاً"}
      </label>
      <button type="submit" disabled={busy || !form.code.trim()} className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition">
        {t("services.addCategory") ?? "إضافة التصنيف"}
      </button>
    </form>
  );
}