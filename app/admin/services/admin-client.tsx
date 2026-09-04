"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BarChart3, ClipboardList, ExternalLink, LayoutDashboard, Save, Settings2,
  ShieldAlert, Star, Tags, Users,
} from "lucide-react";

import { useServicesPage } from "@services-ui/useServicesPage";
import { ServiceCategoryIcon, type CategoryRow } from "@services-ui/ServiceCards";
import { apiFetch, formatDate, nameFor } from "@services-client";
import { getCurrency } from "@/lib/market/currency-registry";

type Overview = {
  pendingProviders: number; approvedProviders: number; publishedRequests: number;
  openOffers: number; activeJobs: number; openReports: number;
  totalRequests: number; totalOffers: number; totalJobs: number;
};
type ProviderRow = Record<string, unknown> & {
  id: string; status: string; display_name_ar?: string | null; display_name_en?: string | null;
  business_name?: string | null; governorate?: string | null; city_id?: string | null;
  is_featured?: number; is_accepting_requests?: number; featured_rank?: number; created_at?: string;
};
type ReportRow = Record<string, unknown> & { id: string; target_type: string; target_id: string; reason?: string | null; description?: string | null; status?: string | null; created_at?: string };
type Snapshot = { recentProviders: ProviderRow[]; recentRequests: Array<Record<string, unknown>>; recentOrders: Array<Record<string, unknown>>; recentReports: ReportRow[] };
type MarketSettings = Record<string, string | number | boolean> & {
  countryCode: string; heroKickerAr: string; heroKickerEn: string; heroTitleAr: string; heroTitleEn: string;
  heroDescriptionAr: string; heroDescriptionEn: string; primaryCtaAr: string; primaryCtaEn: string;
  primaryCtaHref: string; secondaryCtaAr: string; secondaryCtaEn: string; secondaryCtaHref: string;
  announcementAr: string; announcementEn: string; showCategories: boolean; showFeaturedProviders: boolean;
  showLatestRequests: boolean; showHowItWorks: boolean; showTrustBar: boolean; featuredCategoryLimit: number;
  featuredProviderLimit: number; latestRequestLimit: number; allowPublicRequests: boolean; allowProviderRegistration: boolean;
};
type CategoryForm = {
  code: string; parentId: string; nameAr: string; nameEn: string; descriptionAr: string; icon: string;
  bookingMode: "instant" | "quotes" | "both"; badgeAr: string; requiresLicense: boolean; requiresVisit: boolean;
  isFeatured: boolean; isActive: boolean; priceMin: string; priceMax: string; sortOrder: string;
};
type Tab = "overview" | "content" | "categories" | "providers" | "operations" | "reports";

const TABS: readonly Tab[] = ["overview", "content", "categories", "providers", "operations", "reports"] as const;

/**
 * Whether a value from the query string names a real tab.
 *
 * Narrowed rather than cast: `?tab=` is written by anyone, and a value that is
 * not a tab must fall back to the overview rather than render nothing.
 */
function isTab(value: string | null): value is Tab {
  return value != null && (TABS as readonly string[]).includes(value);
}

const EMPTY_CATEGORY: CategoryForm = { code: "", parentId: "", nameAr: "", nameEn: "", descriptionAr: "", icon: "Wrench", bookingMode: "quotes", badgeAr: "", requiresLicense: false, requiresVisit: false, isFeatured: false, isActive: true, priceMin: "", priceMax: "", sortOrder: "0" };
const STATUS_LABELS: Record<string, string> = { draft: "مسودة", submitted: "مُرسل", under_review: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض", suspended: "موقوف" };


/**
 * CURRENCY POLICY: admin surfaces never substitute a currency. A stored code
 * that is missing or outside the canonical registry is shown as a neutral
 * data-quality marker, so a row with bad data is visibly bad rather than
 * silently displayed as OMR.
 */
function currencyLabel(value: unknown): string {
  return getCurrency(typeof value === "string" ? value : null)?.code ?? "عملة غير محددة";
}
export default function ServicesAdminClient() {
  const { locale, setLocale, dir, AccountDialog } = useServicesPage();
  // The tab is readable from the URL so a link can land on one. It used to be
  // local state only, which is why the sidebar offered eight links to pages
  // that were never built: there was no way to point at a tab.
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    isTab(requestedTab) ? requestedTab : "overview",
  );
  const [overview, setOverview] = useState<Overview | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>({ recentProviders: [], recentRequests: [], recentOrders: [], recentReports: [] });
  const [settings, setSettings] = useState<MarketSettings | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [providerStatus, setProviderStatusFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [hasAccess, setHasAccess] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      apiFetch<{ overview: Overview; snapshot: Snapshot; settings: MarketSettings }>("/api/service-admin"),
      apiFetch<{ profiles: ProviderRow[] }>("/api/service-providers?admin=1&limit=100"),
      apiFetch<{ reports: ReportRow[] }>("/api/service-reports?limit=100"),
      apiFetch<{ categories: CategoryRow[] }>("/api/service-categories?country=OM&admin=1"),
    ]);
    const [adminResult, providersResult, reportsResult, categoriesResult] = results;
    if (adminResult.status === "fulfilled") {
      setOverview(adminResult.value.overview);
      setSnapshot(adminResult.value.snapshot ?? { recentProviders: [], recentRequests: [], recentOrders: [], recentReports: [] });
      setSettings(adminResult.value.settings);
      setHasAccess(true);
    } else setHasAccess(false);
    if (providersResult.status === "fulfilled") setProviders(providersResult.value.profiles ?? []);
    if (reportsResult.status === "fulfilled") setReports(reportsResult.value.reports ?? []);
    if (categoriesResult.status === "fulfilled") setCategories(categoriesResult.value.categories ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true); setMessage(""); setSuccess("");
    try { await action(); setSuccess(done); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "تعذر تنفيذ العملية"); }
    finally { setBusy(false); }
  };

  const saveSettings = () => settings && run(
    () => apiFetch("/api/service-marketplace-settings", { method: "PATCH", body: JSON.stringify(settings) }),
    "تم تحديث واجهة سوق الخدمات وإعداداته.",
  );

  const saveCategory = () => run(async () => {
    const payload = {
      countryCode: "OM", code: categoryForm.code.trim(), parentId: categoryForm.parentId || null,
      nameAr: categoryForm.nameAr.trim() || null, nameEn: categoryForm.nameEn.trim() || null,
      descriptionAr: categoryForm.descriptionAr.trim() || null, icon: categoryForm.icon.trim() || "Wrench",
      bookingMode: categoryForm.bookingMode, badgeAr: categoryForm.badgeAr.trim() || null,
      requiresLicense: categoryForm.requiresLicense, requiresVisit: categoryForm.requiresVisit,
      isFeatured: categoryForm.isFeatured, isActive: categoryForm.isActive,
      priceMin: categoryForm.priceMin ? Number(categoryForm.priceMin) : null,
      priceMax: categoryForm.priceMax ? Number(categoryForm.priceMax) : null,
      sortOrder: Number(categoryForm.sortOrder) || 0,
    };
    if (editingCategoryId) await apiFetch(`/api/service-categories/${encodeURIComponent(editingCategoryId)}`, { method: "PATCH", body: JSON.stringify(payload) });
    else await apiFetch("/api/service-categories", { method: "POST", body: JSON.stringify(payload) });
    setCategoryForm(EMPTY_CATEGORY); setEditingCategoryId(null);
  }, editingCategoryId ? "تم تحديث المهنة." : "تمت إضافة المهنة.");

  const editCategory = (category: CategoryRow) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      code: category.code, parentId: category.parent_id ?? "", nameAr: category.name_ar ?? "", nameEn: category.name_en ?? "",
      descriptionAr: category.description_ar ?? "", icon: category.icon ?? "Wrench",
      bookingMode: category.booking_mode ?? "quotes", badgeAr: category.badge_ar ?? "",
      requiresLicense: Boolean(category.requires_license), requiresVisit: Boolean(category.requires_visit),
      isFeatured: Boolean(category.is_featured), isActive: category.is_active !== 0,
      priceMin: category.price_min == null ? "" : String(category.price_min), priceMax: category.price_max == null ? "" : String(category.price_max),
      sortOrder: String(category.sort_order ?? 0),
    });
    document.getElementById("category-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateCategory = (category: CategoryRow, patch: Record<string, unknown>) => run(
    () => apiFetch(`/api/service-categories/${encodeURIComponent(category.id)}`, { method: "PATCH", body: JSON.stringify(patch) }),
    "تم تحديث التصنيف.",
  );

  const removeCategory = (category: CategoryRow) => {
    if (!window.confirm(`حذف «${category.name_ar || category.code}» نهائيًا؟`)) return;
    void run(() => apiFetch(`/api/service-categories/${encodeURIComponent(category.id)}`, { method: "DELETE" }), "تم حذف التصنيف.");
  };

  const updateProvider = (provider: ProviderRow, patch: Record<string, unknown>) => run(
    () => apiFetch(`/api/service-providers/${encodeURIComponent(provider.id)}/status`, { method: "PATCH", body: JSON.stringify(patch) }),
    "تم تحديث ملف مقدم الخدمة.",
  );

  const resolveReport = (report: ReportRow) => {
    const resolution = window.prompt("اكتب قرار المعالجة والملاحظة الإدارية:");
    if (!resolution?.trim()) return;
    void run(() => apiFetch(`/api/service-reports/${encodeURIComponent(report.id)}/resolve`, { method: "POST", body: JSON.stringify({ resolution }) }), "تم إغلاق البلاغ.");
  };

  const groups = useMemo(() => categories.filter((category) => !category.parent_id), [categories]);
  const filteredProviders = useMemo(() => providerStatus ? providers.filter((provider) => provider.status === providerStatus) : providers, [providerStatus, providers]);
  const stats = [
    ["بانتظار المراجعة", overview?.pendingProviders ?? 0, "text-[var(--accent)]"], ["محترفون معتمدون", overview?.approvedProviders ?? 0, "text-[var(--color-success)]"],
    ["طلبات منشورة", overview?.publishedRequests ?? 0, "text-[var(--color-primary)]"], ["عروض مفتوحة", overview?.openOffers ?? 0, "text-[var(--color-primary)]"],
    ["مهام نشطة", overview?.activeJobs ?? 0, "text-cyan-600"], ["بلاغات مفتوحة", overview?.openReports ?? 0, "text-red-600"],
  ];
  const inputClass = "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)] dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] dark:text-[var(--color-surface-muted)] dark:focus:ring-[var(--color-primary-soft)]";

  return (
    <>
      <main dir={dir} className="p-4 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">مركز التحكم</p><h1 className="mt-1 text-2xl font-black text-[var(--color-text-primary)] dark:text-[var(--color-text-primary)]">إدارة سوق الخدمات</h1><p className="mt-1 text-sm text-[var(--color-text-muted)]">تحكم بالمحتوى والمهن والحرفيين والطلبات والتشغيل من مكان واحد.</p></div><div className="flex gap-2"><Link href="/services" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-black text-[var(--color-text-secondary)] dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] dark:text-[var(--color-surface-muted)]">معاينة السوق<ExternalLink className="h-4 w-4" /></Link><select value={locale} onChange={(event) => setLocale(event.target.value as "ar" | "en" | "tr")} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]"><option value="ar">العربية</option><option value="en">English</option><option value="tr">Türkçe</option></select></div></div>

        {!hasAccess && <Notice tone="error">لا تملك الصلاحية المطلوبة لإدارة سوق الخدمات.</Notice>}
        {message && <Notice tone="error">{message}</Notice>}
        {success && <Notice tone="success">{success}</Notice>}

        <nav className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")} icon={<LayoutDashboard />} label="نظرة عامة" />
          <TabButton active={tab === "content"} onClick={() => setTab("content")} icon={<Settings2 />} label="محتوى الصفحة" />
          <TabButton active={tab === "categories"} onClick={() => setTab("categories")} icon={<Tags />} label="المهن والتصنيفات" />
          <TabButton active={tab === "providers"} onClick={() => setTab("providers")} icon={<Users />} label={`الحرفيون${overview?.pendingProviders ? ` (${overview.pendingProviders})` : ""}`} />
          <TabButton active={tab === "operations"} onClick={() => setTab("operations")} icon={<ClipboardList />} label="الطلبات والتشغيل" />
          <TabButton active={tab === "reports"} onClick={() => setTab("reports")} icon={<ShieldAlert />} label={`البلاغات${overview?.openReports ? ` (${overview.openReports})` : ""}`} />
        </nav>

        {loading && <div className="h-72 animate-pulse rounded-3xl bg-[var(--color-background)] dark:bg-[var(--color-surface)]" />}

        {!loading && tab === "overview" && <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{stats.map(([label, value, color]) => <div key={String(label)} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]"><p className="text-sm font-bold text-[var(--color-text-muted)]">{label}</p><p className={`mt-2 text-3xl font-black ${color}`}>{value}</p></div>)}</section>
          <section className="grid gap-4 lg:grid-cols-2"><AdminPanel title="أحدث طلبات الخدمات" action={<button onClick={() => setTab("operations")} className="text-xs font-black text-[var(--color-primary)]">عرض الكل</button>}><SimpleRows rows={snapshot.recentRequests.slice(0, 6)} empty="لا توجد طلبات" render={(row) => <><div><p className="text-sm font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface-muted)]">{String(row.title || row.reference_number || "طلب خدمة")}</p><p className="text-xs text-[var(--color-text-muted)]">{String(row.category_name_ar || "غير مصنف")} · {formatDate(String(row.created_at || ""))}</p></div><Status value={String(row.status || "")} /></>} /></AdminPanel><AdminPanel title="أحدث ملفات المحترفين" action={<button onClick={() => setTab("providers")} className="text-xs font-black text-[var(--color-primary)]">إدارة الملفات</button>}><SimpleRows rows={snapshot.recentProviders.slice(0, 6)} empty="لا توجد ملفات" render={(row) => <><div><p className="text-sm font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface-muted)]">{row.business_name || row.display_name_ar || "مقدم خدمة"}</p><p className="text-xs text-[var(--color-text-muted)]">{row.governorate || row.city_id || "—"}</p></div><Status value={row.status} /></>} /></AdminPanel></section>
          <section className="grid gap-4 md:grid-cols-3"><QuickLink href="/admin/services" icon={<Settings2 />} title="ضبط واجهة السوق" text="العناوين والأقسام وأزرار التسجيل" onClick={() => setTab("content")} /><QuickLink href="/admin/services" icon={<Tags />} title="إدارة دليل المهن" text={`${categories.length} تصنيفًا وفرعًا`} onClick={() => setTab("categories")} /><QuickLink href="/admin/services" icon={<BarChart3 />} title="متابعة التشغيل" text={`${overview?.totalRequests ?? 0} طلب و${overview?.totalJobs ?? 0} مهمة`} onClick={() => setTab("operations")} /></section>
        </div>}

        {!loading && tab === "content" && settings && <section className="space-y-5"><AdminPanel title="محتوى واجهة السوق" description="كل تعديل هنا ينعكس على الصفحة العامة دون الحاجة لتعديل برمجي."><div className="grid gap-4 md:grid-cols-2"><Field label="الشارة العلوية (عربي)" value={String(settings.heroKickerAr)} onChange={(value) => setSettings({ ...settings, heroKickerAr: value })} /><Field label="Top label (English)" value={String(settings.heroKickerEn)} onChange={(value) => setSettings({ ...settings, heroKickerEn: value })} /><Field label="العنوان الرئيسي (عربي)" value={String(settings.heroTitleAr)} onChange={(value) => setSettings({ ...settings, heroTitleAr: value })} /><Field label="Hero title (English)" value={String(settings.heroTitleEn)} onChange={(value) => setSettings({ ...settings, heroTitleEn: value })} /><Field area label="الوصف (عربي)" value={String(settings.heroDescriptionAr)} onChange={(value) => setSettings({ ...settings, heroDescriptionAr: value })} /><Field area label="Description (English)" value={String(settings.heroDescriptionEn)} onChange={(value) => setSettings({ ...settings, heroDescriptionEn: value })} /><Field label="نص الزر الرئيسي" value={String(settings.primaryCtaAr)} onChange={(value) => setSettings({ ...settings, primaryCtaAr: value })} /><Field label="رابط الزر الرئيسي" value={String(settings.primaryCtaHref)} onChange={(value) => setSettings({ ...settings, primaryCtaHref: value })} /><Field label="نص زر تسجيل الحرفي" value={String(settings.secondaryCtaAr)} onChange={(value) => setSettings({ ...settings, secondaryCtaAr: value })} /><Field label="رابط تسجيل الحرفي" value={String(settings.secondaryCtaHref)} onChange={(value) => setSettings({ ...settings, secondaryCtaHref: value })} /><Field area label="الإعلان النصي أسفل الصفحة" value={String(settings.announcementAr)} onChange={(value) => setSettings({ ...settings, announcementAr: value })} /></div></AdminPanel><AdminPanel title="الأقسام والسياسات"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["showCategories", "إظهار دليل المهن"], ["showFeaturedProviders", "إظهار المحترفين البارزين"], ["showLatestRequests", "إظهار أحدث الطلبات"], ["showHowItWorks", "إظهار كيف يعمل السوق"], ["showTrustBar", "إظهار شريط الثقة"], ["allowPublicRequests", "السماح بطلب خدمة"], ["allowProviderRegistration", "فتح تسجيل الحرفيين"]].map(([key, label]) => <Toggle key={key} label={label} checked={Boolean(settings[key])} onChange={(checked) => setSettings({ ...settings, [key]: checked })} />)}</div><div className="mt-5 grid gap-4 sm:grid-cols-3"><NumberField label="عدد المهن البارزة" value={Number(settings.featuredCategoryLimit)} onChange={(value) => setSettings({ ...settings, featuredCategoryLimit: value })} /><NumberField label="عدد المحترفين" value={Number(settings.featuredProviderLimit)} onChange={(value) => setSettings({ ...settings, featuredProviderLimit: value })} /><NumberField label="عدد الطلبات" value={Number(settings.latestRequestLimit)} onChange={(value) => setSettings({ ...settings, latestRequestLimit: value })} /></div></AdminPanel><button onClick={() => void saveSettings()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-black text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"><Save className="h-4 w-4" />حفظ ونشر التعديلات</button></section>}

        {!loading && tab === "categories" && <section className="grid items-start gap-5 xl:grid-cols-[1fr_380px]"><AdminPanel title="شجرة المهن والتصنيفات" description={`${categories.length} تصنيفًا — يمكن إخفاء أي مهنة أو إبرازها فورًا.`}><div className="space-y-4">{groups.map((group) => <div key={group.id} className="rounded-2xl border border-[var(--color-border)] dark:border-[var(--color-border)]"><div className="flex items-center justify-between bg-[var(--color-surface-muted)] px-4 py-3 dark:bg-[var(--color-surface)]/70"><div className="flex items-center gap-2"><ServiceCategoryIcon name={group.icon} className="h-5 w-5 text-[var(--color-primary)]" /><p className="font-black text-[var(--color-text-primary)] dark:text-[var(--color-text-primary)]">{nameFor(locale, group.name_ar, group.name_en, group.name_tr, group.code)}</p></div><button onClick={() => editCategory(group)} className="text-xs font-black text-[var(--color-primary)]">تعديل القسم</button></div><div className="divide-y divide-[var(--color-border)] dark:divide-[var(--color-border)]">{categories.filter((category) => category.parent_id === group.id).map((category) => <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] dark:bg-[var(--color-primary-soft)]/40 dark:text-[var(--color-primary)]"><ServiceCategoryIcon name={category.icon} className="h-4 w-4" /></span><div><p className="text-sm font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface-muted)]">{nameFor(locale, category.name_ar, category.name_en, category.name_tr, category.code)}</p><p className="text-[11px] text-[var(--color-text-muted)]">{category.booking_mode === "both" ? "حجز مباشر + عروض" : category.booking_mode === "instant" ? "حجز مباشر" : "طلب عروض"} · {Number(category.provider_count ?? 0)} محترف</p></div></div><div className="flex items-center gap-2"><button title="إبراز" onClick={() => void updateCategory(category, { isFeatured: !category.is_featured })} className={`rounded-lg p-2 ${category.is_featured ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--color-background)] text-[var(--color-text-muted)] dark:bg-[var(--color-surface)]"}`}><Star className="h-4 w-4" /></button><button onClick={() => void updateCategory(category, { isActive: category.is_active === 0 })} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black ${category.is_active === 0 ? "bg-[var(--color-error-soft)] text-red-600" : "bg-[var(--color-success-soft)] text-[var(--color-success)]"}`}>{category.is_active === 0 ? "مخفي" : "ظاهر"}</button><button onClick={() => editCategory(category)} className="rounded-lg bg-[var(--color-primary-soft)] px-2.5 py-1.5 text-[11px] font-black text-[var(--color-primary)]">تعديل</button><button onClick={() => removeCategory(category)} className="rounded-lg bg-[var(--color-error-soft)] px-2.5 py-1.5 text-[11px] font-black text-red-600">حذف</button></div></div>)}</div></div>)}</div></AdminPanel><AdminPanel id="category-editor" title={editingCategoryId ? "تعديل التصنيف" : "إضافة مهنة أو قسم"}><div className="space-y-3"><Field label="الرمز البرمجي" value={categoryForm.code} disabled={Boolean(editingCategoryId)} onChange={(value) => setCategoryForm({ ...categoryForm, code: value })} /><Field label="الاسم العربي" value={categoryForm.nameAr} onChange={(value) => setCategoryForm({ ...categoryForm, nameAr: value })} /><Field label="الاسم الإنجليزي" value={categoryForm.nameEn} onChange={(value) => setCategoryForm({ ...categoryForm, nameEn: value })} /><Field area label="وصف مختصر" value={categoryForm.descriptionAr} onChange={(value) => setCategoryForm({ ...categoryForm, descriptionAr: value })} /><label className="block text-xs font-black text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">القسم الأب<select value={categoryForm.parentId} onChange={(event) => setCategoryForm({ ...categoryForm, parentId: event.target.value })} className={`${inputClass} mt-1`}><option value="">قسم رئيسي</option>{groups.filter((group) => group.id !== editingCategoryId).map((group) => <option key={group.id} value={group.id}>{group.name_ar || group.code}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><Field label="اسم الأيقونة" value={categoryForm.icon} onChange={(value) => setCategoryForm({ ...categoryForm, icon: value })} /><Field label="شارة قصيرة" value={categoryForm.badgeAr} onChange={(value) => setCategoryForm({ ...categoryForm, badgeAr: value })} /></div><label className="block text-xs font-black text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">طريقة الطلب<select value={categoryForm.bookingMode} onChange={(event) => setCategoryForm({ ...categoryForm, bookingMode: event.target.value as CategoryForm["bookingMode"] })} className={`${inputClass} mt-1`}><option value="quotes">طلب عروض</option><option value="instant">حجز مباشر</option><option value="both">الطريقتان</option></select></label><div className="grid grid-cols-2 gap-3"><Field label="السعر من" value={categoryForm.priceMin} onChange={(value) => setCategoryForm({ ...categoryForm, priceMin: value })} /><Field label="السعر إلى" value={categoryForm.priceMax} onChange={(value) => setCategoryForm({ ...categoryForm, priceMax: value })} /></div><Field label="ترتيب العرض" value={categoryForm.sortOrder} onChange={(value) => setCategoryForm({ ...categoryForm, sortOrder: value })} /><div className="grid grid-cols-2 gap-2"><Toggle label="يتطلب ترخيصًا" checked={categoryForm.requiresLicense} onChange={(value) => setCategoryForm({ ...categoryForm, requiresLicense: value })} /><Toggle label="يتطلب معاينة" checked={categoryForm.requiresVisit} onChange={(value) => setCategoryForm({ ...categoryForm, requiresVisit: value })} /><Toggle label="مميّز" checked={categoryForm.isFeatured} onChange={(value) => setCategoryForm({ ...categoryForm, isFeatured: value })} /><Toggle label="نشط" checked={categoryForm.isActive} onChange={(value) => setCategoryForm({ ...categoryForm, isActive: value })} /></div><div className="flex gap-2"><button onClick={() => void saveCategory()} disabled={busy || !categoryForm.code.trim()} className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{editingCategoryId ? "حفظ التعديل" : "إضافة التصنيف"}</button>{editingCategoryId && <button onClick={() => { setEditingCategoryId(null); setCategoryForm(EMPTY_CATEGORY); }} className="rounded-xl border border-[var(--color-border)] px-3 text-sm font-black dark:border-[var(--color-border)]">إلغاء</button>}</div></div></AdminPanel></section>}

        {!loading && tab === "providers" && <AdminPanel title="إدارة الحرفيين ومقدمي الخدمات" description="اعتماد الملفات، تعليقها، إبرازها في الواجهة أو إيقاف استقبال الطلبات."><div className="mb-4 flex flex-wrap gap-2">{[["", "الكل"], ["submitted", "مُرسل"], ["under_review", "قيد المراجعة"], ["approved", "معتمد"], ["rejected", "مرفوض"], ["suspended", "موقوف"]].map(([value, label]) => <button key={value} onClick={() => setProviderStatusFilter(value)} className={`rounded-xl px-3 py-2 text-xs font-black ${providerStatus === value ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] dark:text-[var(--color-text-muted)]"}`}>{label}</button>)}</div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead><tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)] dark:border-[var(--color-border)]"><th className="px-3 py-3 text-start">مقدم الخدمة</th><th className="px-3 py-3 text-start">الموقع</th><th className="px-3 py-3 text-start">الحالة</th><th className="px-3 py-3 text-start">الظهور</th><th className="px-3 py-3 text-start">العمليات</th></tr></thead><tbody>{filteredProviders.map((provider) => <tr key={provider.id} className="border-b border-[var(--color-border)] last:border-0 dark:border-[var(--color-border)]"><td className="px-3 py-3"><Link href={`/providers/${provider.id}`} target="_blank" className="font-black text-[var(--color-primary)] hover:underline dark:text-[var(--color-primary)]">{provider.business_name || nameFor(locale, provider.display_name_ar, provider.display_name_en, null, "مقدم خدمة")}</Link><p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{formatDate(provider.created_at)}</p></td><td className="px-3 py-3 text-[var(--color-text-muted)]">{provider.governorate || provider.city_id || "—"}</td><td className="px-3 py-3"><Status value={provider.status} /></td><td className="px-3 py-3"><div className="flex gap-2"><button onClick={() => void updateProvider(provider, { isFeatured: !provider.is_featured })} className={`rounded-lg p-2 ${provider.is_featured ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--color-background)] text-[var(--color-text-muted)] dark:bg-[var(--color-surface)]"}`}><Star className="h-4 w-4" /></button><button onClick={() => void updateProvider(provider, { isAcceptingRequests: !provider.is_accepting_requests })} className={`rounded-lg px-2 py-1 text-[10px] font-black ${provider.is_accepting_requests === 0 ? "bg-[var(--color-error-soft)] text-red-600" : "bg-[var(--color-success-soft)] text-[var(--color-success)]"}`}>{provider.is_accepting_requests === 0 ? "متوقف" : "يستقبل"}</button></div></td><td className="px-3 py-3"><div className="flex flex-wrap gap-1.5">{provider.status !== "approved" && <button onClick={() => void updateProvider(provider, { status: "approved" })} className="rounded-lg bg-[var(--color-success)] px-2.5 py-1.5 text-[11px] font-black text-white">اعتماد</button>}{provider.status === "approved" && <button onClick={() => void updateProvider(provider, { status: "suspended" })} className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-1.5 text-[11px] font-black text-[var(--accent)]">تعليق</button>}{provider.status !== "rejected" && <button onClick={() => void updateProvider(provider, { status: "rejected" })} className="rounded-lg bg-[var(--color-error-soft)] px-2.5 py-1.5 text-[11px] font-black text-red-600">رفض</button>}</div></td></tr>)}</tbody></table>{filteredProviders.length === 0 && <p className="py-12 text-center text-sm font-bold text-[var(--color-text-muted)]">لا توجد ملفات في هذا القسم.</p>}</div></AdminPanel>}

        {!loading && tab === "operations" && <section className="grid gap-5 xl:grid-cols-2"><AdminPanel title="أحدث طلبات الخدمات" description={`${overview?.totalRequests ?? 0} طلب إجمالي`}><SimpleRows rows={snapshot.recentRequests} empty="لا توجد طلبات" render={(row) => <><div><Link href={`/service-requests/${String(row.id)}`} target="_blank" className="text-sm font-black text-[var(--color-primary)] hover:underline dark:text-[var(--color-primary)]">{String(row.title || row.reference_number || "طلب خدمة")}</Link><p className="text-xs text-[var(--color-text-muted)]">{String(row.category_name_ar || "غير مصنف")} · {formatDate(String(row.created_at || ""))}</p></div><div className="text-end"><Status value={String(row.status || "")} /><p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{row.budget_min == null ? "ميزانية مفتوحة" : `${String(row.budget_min)}–${String(row.budget_max || "")} ${currencyLabel(row.currency)}`}</p></div></>} /></AdminPanel><AdminPanel title="المهام والأوامر" description={`${overview?.totalJobs ?? 0} مهمة إجمالية`}><SimpleRows rows={snapshot.recentOrders} empty="لا توجد مهام" render={(row) => <><div><p className="text-sm font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface-muted)]">{String(row.request_title || row.reference_number || "مهمة خدمة")}</p><p className="text-xs text-[var(--color-text-muted)]">{formatDate(String(row.created_at || ""))} · {row.agreed_price == null ? "—" : `${String(row.agreed_price)} ${currencyLabel(row.currency)}`}</p></div><Status value={String(row.status || "")} /></>} /></AdminPanel></section>}

        {!loading && tab === "reports" && <AdminPanel title="البلاغات والمراجعة" description="معالجة بلاغات الطلبات والملفات والمحادثات."><SimpleRows rows={reports} empty="لا توجد بلاغات" render={(report) => <><div><p className="text-sm font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface-muted)]">{report.reason || report.description || "بلاغ"}</p><p className="text-xs text-[var(--color-text-muted)]">{report.target_type} · {formatDate(report.created_at)}</p></div><div className="flex items-center gap-2"><Status value={report.status || "open"} />{(report.status === "open" || report.status === "in_review") && <button onClick={() => resolveReport(report)} disabled={busy} className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-[11px] font-black text-white">معالجة</button>}</div></>} /></AdminPanel>}
      </main>
      {AccountDialog}
    </>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) { return <button onClick={onClick} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-black transition ${active ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20" : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] dark:text-[var(--color-surface-muted)]"}`}><span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>{label}</button>; }
function AdminPanel({ id, title, description, action, children }: { id?: string; title: string; description?: string; action?: ReactNode; children: ReactNode }) { return <section id={id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]"><div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="font-black text-[var(--color-text-primary)] dark:text-[var(--color-text-primary)]">{title}</h2>{description && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{description}</p>}</div>{action}</div>{children}</section>; }
function Notice({ tone, children }: { tone: "error" | "success"; children: ReactNode }) { return <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-bold ${tone === "error" ? "border-[var(--color-error)]/30 bg-[var(--color-error-soft)] text-[var(--color-error)] dark:border-[var(--color-error)]/30 dark:bg-[var(--color-error-soft)]/30 dark:text-[var(--color-error)]" : "border-[var(--color-success)]/30 bg-[var(--color-success-soft)] text-[var(--color-success)] dark:border-[var(--color-success)]/30 dark:bg-[var(--color-success-soft)]/30 dark:text-[var(--color-success)]"}`}>{children}</div>; }
function Field({ label, value, onChange, area, disabled }: { label: string; value: string; onChange: (value: string) => void; area?: boolean; disabled?: boolean }) { const className = "mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)] disabled:bg-[var(--color-background)] dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] dark:text-[var(--color-surface-muted)] dark:focus:ring-[var(--color-primary-soft)]"; return <label className="block text-xs font-black text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">{label}{area ? <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className={className} disabled={disabled} /> : <input value={value} onChange={(event) => onChange(event.target.value)} className={className} disabled={disabled} />}</label>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block text-xs font-black text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">{label}<input type="number" min={1} value={value} onChange={(event) => onChange(Number(event.target.value) || 1)} className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]" /></label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-xs font-black text-[var(--color-text-secondary)] dark:border-[var(--color-border)] dark:text-[var(--color-surface-muted)]"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]" /></label>; }
function Status({ value }: { value: string }) { const color = value === "approved" || value === "completed" ? "bg-[var(--color-success-soft)] text-[var(--color-success)]" : value === "rejected" || value === "suspended" || value === "open" ? "bg-[var(--color-error-soft)] text-[var(--color-error)]" : value === "published" || value === "in_progress" ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "bg-[var(--accent-soft)] text-[var(--accent)]"; return <span className={`inline-block rounded-lg px-2 py-1 text-[10px] font-black ${color}`}>{STATUS_LABELS[value] || value}</span>; }
function SimpleRows<T extends Record<string, unknown>>({ rows, empty, render }: { rows: T[]; empty: string; render: (row: T) => ReactNode }) { return rows.length ? <div className="divide-y divide-[var(--color-border)] dark:divide-[var(--color-border)]">{rows.map((row, index) => <div key={String(row.id ?? index)} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">{render(row)}</div>)}</div> : <p className="py-10 text-center text-sm font-bold text-[var(--color-text-muted)]">{empty}</p>; }
function QuickLink({ icon, title, text, onClick }: { href: string; icon: ReactNode; title: string; text: string; onClick: () => void }) { return <button onClick={onClick} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-start transition hover:border-[var(--color-primary)]/30 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] dark:bg-[var(--color-primary-soft)]/40 dark:text-[var(--color-primary)] [&>svg]:h-5 [&>svg]:w-5">{icon}</span><span><span className="block text-sm font-black text-[var(--color-text-primary)] dark:text-[var(--color-text-primary)]">{title}</span><span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">{text}</span></span></button>; }
