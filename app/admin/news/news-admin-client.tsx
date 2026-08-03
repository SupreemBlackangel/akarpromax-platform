"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "@/src/constants/permissions";
import { citiesForCountry, countryOptions } from "@/src/data/locations";

type Identity = {
  authenticated: boolean;
  displayName: string;
  role: string;
  countryCode: string | null;
  permissions: string[];
};

type NewsItem = {
  id: string;
  scope: "global" | "country" | "city";
  countryCode: string | null;
  cityId: string | null;
  titleAr: string;
  titleEn: string;
  titleTr: string;
  linkUrl: string | null;
  status: string;
  priority: number;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type NewsForm = Omit<NewsItem, "id" | "createdAt" | "updatedAt"> & { id?: string };

const scopes = ["global", "country", "city"] as const;
const statuses = ["draft", "active", "archived"] as const;

const scopeLabels: Record<string, string> = { global: "عالمي", country: "دولة", city: "مدينة" };
const statusLabels: Record<string, string> = { active: "منشورة", draft: "مسودة", archived: "مؤرشفة" };
const countryName = (code: string) =>
  countryOptions.find((option) => option.id === code)?.names.ar ?? code.toUpperCase();
const cityName = (country: string, city: string) =>
  citiesForCountry(country).find((option) => option.id === city)?.names.ar ?? city;

const emptyForm: NewsForm = {
  scope: "global",
  countryCode: null,
  cityId: null,
  titleAr: "",
  titleEn: "",
  titleTr: "",
  linkUrl: null,
  status: "draft",
  priority: 100,
  startAt: null,
  endAt: null,
};

export default function NewsAdminClient({ initialUser }: { initialUser: { email: string; displayName: string } }) {
  const [identity, setIdentity] = useState<Identity>({
    authenticated: true,
    displayName: initialUser.displayName,
    role: "viewer",
    countryCode: null,
    permissions: [],
  });
  const [news, setNews] = useState<NewsItem[]>([]);
  const [scopeFilter, setScopeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [editing, setEditing] = useState<NewsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("om");

  const can = (permission: string) => identity.permissions.includes(permission);
  const canPublish = can(PERMISSIONS.NEWS_PUBLISH);
  const restrictedToCountry =
    identity.countryCode && !["super_admin", "sponsor_admin", "ad_manager"].includes(identity.role)
      ? identity.countryCode
      : null;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/news?admin=1", { cache: "no-store", signal: controller.signal });
        const data = await res.json();
        if (!controller.signal.aborted) {
          setIdentity((prev) => ({ ...prev, ...(data.identity ?? {}), authenticated: true }));
          setNews(Array.isArray(data.news) ? data.news : []);
        }
      } catch {
        if (!controller.signal.aborted) setMessage("تعذر تحميل الأخبار.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    return news.filter((item) => {
      if (scopeFilter !== "all" && item.scope !== scopeFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (countryFilter !== "all" && (item.countryCode ?? "") !== countryFilter) return false;
      return true;
    });
  }, [news, scopeFilter, statusFilter, countryFilter]);

  const cities = citiesForCountry(selectedCountry);

  function startCreate() {
    const next: NewsForm = { ...emptyForm, scope: restrictedToCountry ? "country" : "global", countryCode: restrictedToCountry };
    setSelectedCountry(restrictedToCountry ?? "om");
    setEditing(next);
    setMessage("");
  }

  function startEdit(item: NewsItem) {
    setSelectedCountry(item.countryCode ?? (item.cityId?.split("-")[0] ?? "om"));
    setEditing({
      id: item.id,
      scope: item.scope,
      countryCode: item.countryCode,
      cityId: item.cityId,
      titleAr: item.titleAr,
      titleEn: item.titleEn,
      titleTr: item.titleTr,
      linkUrl: item.linkUrl,
      status: item.status,
      priority: item.priority,
      startAt: item.startAt,
      endAt: item.endAt,
    });
    setMessage("");
  }

  async function save() {
    if (!editing) return;
    if (!editing.titleAr.trim() || !editing.titleEn.trim() || !editing.titleTr.trim()) {
      setMessage("العنوان مطلوب باللغات الثلاث (عربي/إنجليزي/تركي).");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        ...editing,
        countryCode: editing.scope === "global" ? null : editing.countryCode || restrictedToCountry || selectedCountry,
        cityId: editing.scope === "city" ? editing.cityId || `${editing.countryCode || selectedCountry}-${selectedCountry}` : null,
        linkUrl: editing.linkUrl || null,
      };
      const url = payload.id ? "/api/news" : "/api/news";
      const method = payload.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error === "Publishing permission required" ? "ليست لديك صلاحية النشر — سُجّلت كمسودة." : data.error ?? "فشل الحفظ.");
        if (data.error === "Publishing permission required") {
          await loadNews();
        }
        return;
      }
      setMessage(payload.id ? "تم تحديث الخبر." : "تم إنشاء الخبر.");
      setEditing(null);
      await loadNews();
    } catch {
      setMessage("خطأ في الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  }

  async function loadNews() {
    try {
      const res = await fetch("/api/news?admin=1", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.news)) setNews(data.news);
    } catch {
      setMessage("تعذر تحديث القائمة.");
    }
  }

  async function archive(id: string) {
    if (!confirm("هل تريد أرشفة هذا الخبر؟")) return;
    setMessage("");
    try {
      const res = await fetch(`/api/news?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "فشلت الأرشفة.");
        return;
      }
      setMessage("تمت الأرشفة.");
      await loadNews();
    } catch {
      setMessage("خطأ في الاتصال بالخادم.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">إدارة الأخبار</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">الشريط الإخباري حسب الدولة والمنطقة — عالميًا أو محليًا</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/ads" className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">مركز الإعلانات</Link>
          <Link href="/" target="_blank" className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">معاينة المنصة ↗</Link>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        {message && <div className="mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">{message}</div>}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button onClick={startCreate} disabled={!can(PERMISSIONS.NEWS_CREATE) || Boolean(editing)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors">
            + خبر جديد
          </button>
          <div className="flex-1" />
          <select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value)} className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg">
            <option value="all">كل النطاقات</option>
            {scopes.map((scope) => <option key={scope} value={scope}>{scopeLabels[scope]}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg">
            <option value="all">كل الحالات</option>
            {statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select>
          <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)} className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg">
            <option value="all">كل الدول</option>
            {countryOptions.map((country) => <option key={country.id} value={country.id}>{country.names.ar}</option>)}
          </select>
        </div>

        {editing && (
          <div className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{editing.id ? "تعديل خبر" : "خبر جديد"}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500 dark:text-gray-400">النطاق</span>
                  <select
                    value={editing.scope}
                    disabled={Boolean(restrictedToCountry) && editing.scope !== "country"}
                    onChange={(event) => setEditing({ ...editing, scope: event.target.value as NewsForm["scope"] })}
                    className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
                  >
                    {scopes.map((scope) => <option key={scope} value={scope}>{scopeLabels[scope]}</option>)}
                  </select>
                </label>
                {editing.scope !== "global" && (
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">الدولة</span>
                    <select
                      value={editing.countryCode ?? selectedCountry}
                      disabled={Boolean(restrictedToCountry)}
                      onChange={(event) => {
                        const code = event.target.value;
                        setSelectedCountry(code);
                        setEditing({ ...editing, countryCode: code, cityId: null });
                      }}
                      className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
                    >
                      {countryOptions.map((country) => <option key={country.id} value={country.id}>{country.names.ar}</option>)}
                    </select>
                  </label>
                )}
                {editing.scope === "city" && (
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">المدينة</span>
                    <select
                      value={editing.cityId ?? ""}
                      onChange={(event) => setEditing({ ...editing, cityId: event.target.value || null })}
                      className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
                    >
                      <option value="">— اختر المدينة —</option>
                      {cities.map((city) => <option key={city.id} value={city.id}>{city.names.ar}</option>)}
                    </select>
                  </label>
                )}
                {editing.scope === "city" && !cities.length && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">لا توجد مدن مدرجة لهذه الدولة بعد.</p>
                )}
              </div>
              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400">العنوان (عربي)</span>
                <input value={editing.titleAr} onChange={(event) => setEditing({ ...editing, titleAr: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400">العنوان (إنجليزي)</span>
                <input value={editing.titleEn} onChange={(event) => setEditing({ ...editing, titleEn: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400">العنوان (تركي)</span>
                <input value={editing.titleTr} onChange={(event) => setEditing({ ...editing, titleTr: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400">رابط اختياري</span>
                <input value={editing.linkUrl ?? ""} onChange={(event) => setEditing({ ...editing, linkUrl: event.target.value || null })} placeholder="https://… أو #/مسار" className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400">الحالة</span>
                <select
                  value={editing.status}
                  disabled={!canPublish}
                  onChange={(event) => setEditing({ ...editing, status: event.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
                >
                  <option value="draft">مسودة</option>
                  <option value="active">منشورة</option>
                </select>
                {!canPublish && <span className="text-xs text-amber-600 dark:text-amber-400">تنشر كمسودة — تحتاج صلاحية النشر.</span>}
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400">الأولوية (الأصغر أولًا)</span>
                <input type="number" min={1} max={999} value={editing.priority} onChange={(event) => setEditing({ ...editing, priority: Number(event.target.value) || 100 })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
              </label>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button onClick={save} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors">
                {saving ? "حفظ..." : "حفظ"}
              </button>
              <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">جارٍ التحميل...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">لا توجد أخبار مطابقة.</p>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">الخبر</th>
                  <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">النطاق</th>
                  <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">الحالة</th>
                  <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">الأولوية</th>
                  <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{item.titleAr}</div>
                      <div className="text-xs text-gray-400">{item.titleEn}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {scopeLabels[item.scope] ?? item.scope}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        {item.scope === "country" && item.countryCode ? countryName(item.countryCode) : ""}
                        {item.scope === "city" && item.countryCode && item.cityId ? `${countryName(item.countryCode)} — ${cityName(item.countryCode, item.cityId)}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-lg ${item.status === "active" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" : item.status === "draft" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                        {statusLabels[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.priority}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {can(PERMISSIONS.NEWS_UPDATE) && (
                          <button onClick={() => startEdit(item)} className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded transition-colors">تعديل</button>
                        )}
                        {can(PERMISSIONS.NEWS_DELETE) && item.status !== "archived" && (
                          <button onClick={() => archive(item.id)} className="px-2.5 py-1 text-xs bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded transition-colors">أرشفة</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
