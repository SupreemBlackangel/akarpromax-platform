"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "@/src/constants/permissions";
import { citiesForCountry, countryOptions } from "@/src/data/locations";
import {
  NEWS_CHANNELS,
  NEWS_SOURCE_TYPES,
  NEWS_TYPES,
  PAGE_TARGET_MODES,
  REVIEW_STATUSES,
  type NewsChannel,
  type NewsPlacement,
} from "@/lib/news/contracts";

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
  summaryAr: string | null;
  summaryEn: string | null;
  summaryTr: string | null;
  bodyAr: string | null;
  bodyEn: string | null;
  bodyTr: string | null;
  category: string;
  tags: string[];
  imageUrl: string | null;
  isBreaking: boolean;
  isPinned: boolean;
  language: string;
  newsType: string;
  sourceName: string | null;
  sourceUrl: string | null;
  sourcePublishedAt: string | null;
  reviewStatus: string;
};

type NewsForm = Omit<NewsItem, "id" | "createdAt" | "updatedAt"> & { id?: string; tagsText: string };

type NewsSource = {
  id: string;
  name: string;
  url: string;
  sourceType: string;
  format: string;
  countryCode: string | null;
  language: string;
  trustLevel: string;
  status: string;
  fetchIntervalMinutes: number;
  lastFetchedAt: string | null;
  lastFetchStatus: string | null;
  lastError: string | null;
};

type SourceForm = {
  id?: string;
  name: string;
  url: string;
  sourceType: string;
  format: string;
  countryCode: string;
  language: string;
  trustLevel: string;
  status: string;
  fetchIntervalMinutes: number;
};

const scopes = ["global", "country", "city"] as const;
const statuses = ["draft", "active", "archived"] as const;

const scopeLabels: Record<string, string> = { global: "عالمي", country: "دولة", city: "مدينة" };
const statusLabels: Record<string, string> = { active: "منشورة", draft: "مسودة", archived: "مؤرشفة" };
const categoryLabels: Record<string, string> = {
  MARKET: "سوق", LEGAL: "قانون", GOVERNMENT: "حكومي", PROJECT: "مشاريع",
  COMPANY: "شركات", REGULATION: "تنظيمات", EVENT: "فعاليات", PRICE_INDEX: "مؤشر أسعار", GENERAL: "عام",
};
const reviewLabels: Record<string, string> = { APPROVED: "معتمد", REVIEW_REQUIRED: "بانتظار المراجعة", REJECTED: "مرفوض" };
const channelLabels: Record<string, string> = {
  WEBSITE_NEWS: "أخبار الموقع", WEBSITE_TICKER: "شريط الموقع", OFFICE_NEWS: "أخبار المكتب",
  OFFICE_TICKER: "شريط المكتب", PUSH_NOTIFICATION: "إشعار فوري", IN_APP_NOTIFICATION: "إشعار داخلي",
};
const pageModeLabels: Record<string, string> = {
  ALL_PAGES: "كل الصفحات", SPECIFIC_PAGES: "صفحات محددة", PAGE_GROUPS: "مجموعات صفحات", EXCLUDE_PAGES: "استثناء صفحات",
};
const trustLabels: Record<string, string> = { TRUSTED: "موثوق", REVIEW_REQUIRED: "يتطلب مراجعة" };
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
  summaryAr: null,
  summaryEn: null,
  summaryTr: null,
  bodyAr: null,
  bodyEn: null,
  bodyTr: null,
  category: "GENERAL",
  tags: [],
  tagsText: "",
  imageUrl: null,
  isBreaking: false,
  isPinned: false,
  language: "ar",
  newsType: "MANUAL",
  sourceName: null,
  sourceUrl: null,
  sourcePublishedAt: null,
  reviewStatus: "APPROVED",
};

const emptySource: SourceForm = {
  name: "",
  url: "",
  sourceType: "RSS",
  format: "rss",
  countryCode: "",
  language: "ar",
  trustLevel: "REVIEW_REQUIRED",
  status: "active",
  fetchIntervalMinutes: 60,
};

const defaultPlacement = (newsId: string): NewsPlacement => ({
  id: "",
  newsId,
  channel: "WEBSITE_TICKER",
  pageMode: "ALL_PAGES",
  pageCodes: [],
  countryCode: null,
  cityId: null,
  language: null,
  audiences: [],
  priority: 100,
  manualOrder: null,
  limits: { maxImpressions: null, maxClicks: null, maxPerUserPerDay: null, maxPerSession: null },
  startAt: null,
  endAt: null,
  status: "active",
});

function parseListText(text: string): string[] {
  return text.split(",").map((item) => item.trim()).filter(Boolean);
}

function PlacementEditor({ newsId, canUpdate }: { newsId: string; canUpdate: boolean }) {
  const [placements, setPlacements] = useState<NewsPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<NewsPlacement | null>(null);
  const [codesText, setCodesText] = useState("");
  const [audiencesText, setAudiencesText] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("om");
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!newsId) return;
    try {
      const res = await fetch(`/api/news/placements?newsId=${encodeURIComponent(newsId)}`, { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.placements)) setPlacements(data.placements);
    } catch {
      setMessage("تعذر تحميل الاستهداف.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/news/placements?newsId=${encodeURIComponent(newsId)}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && Array.isArray(data.placements)) setPlacements(data.placements);
      } catch {
        if (!cancelled) setMessage("تعذر تحميل الاستهداف.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [newsId]);

  function startCreate() {
    const next = defaultPlacement(newsId);
    setDraft(next);
    setCodesText("");
    setAudiencesText("");
    setMessage("");
  }

  function startEdit(placement: NewsPlacement) {
    setDraft({ ...placement, limits: { ...placement.limits } });
    setCodesText(placement.pageCodes.join(", "));
    setAudiencesText(placement.audiences.join(", "));
    setSelectedCountry(placement.countryCode ?? (placement.cityId?.split("-")[0] ?? "om"));
    setMessage("");
  }

  async function savePlacement() {
    if (!draft) return;
    setMessage("");
    const payload = {
      ...(draft.id ? { id: draft.id } : { newsId }),
      channel: draft.channel,
      pageMode: draft.pageMode,
      pageCodes: parseListText(codesText),
      countryCode: draft.countryCode,
      cityId: draft.cityId,
      language: draft.language,
      audiences: parseListText(audiencesText),
      priority: draft.priority,
      manualOrder: draft.manualOrder,
      limits: draft.limits,
      startAt: draft.startAt,
      endAt: draft.endAt,
      status: draft.status,
    };
    try {
      const res = await fetch("/api/news/placements", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "فشل حفظ الاستهداف.");
        return;
      }
      setMessage(draft.id ? "تم تحديث الاستهداف." : "تم إنشاء الاستهداف.");
      setDraft(null);
      await load();
    } catch {
      setMessage("خطأ في الاتصال بالخادم.");
    }
  }

  async function deletePlacement(id: string) {
    if (!confirm("هل تريد حذف هذا الاستهداف؟")) return;
    try {
      const res = await fetch(`/api/news/placements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error ?? "فشل الحذف.");
        return;
      }
      setMessage("تم حذف الاستهداف.");
      await load();
    } catch {
      setMessage("خطأ في الاتصال بالخادم.");
    }
  }

  async function togglePause(placement: NewsPlacement) {
    const nextStatus = placement.status === "paused" ? "active" : "paused";
    try {
      const res = await fetch("/api/news/placements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: placement.id, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "فشل التحديث.");
        return;
      }
      await load();
    } catch {
      setMessage("خطأ في الاتصال بالخادم.");
    }
  }

  const cities = citiesForCountry(selectedCountry);

  return (
    <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">الاستهداف حسب القنوات (Placements)</h3>
        {canUpdate && (
          <button onClick={startCreate} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">+ استهداف جديد</button>
        )}
      </div>
      {message && <div className="mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs">{message}</div>}

      {draft && canUpdate && (
        <div className="mb-4 bg-gray-50 dark:bg-gray-800/40 rounded-lg p-4">
          <div className="grid md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">القناة</span>
              <select
                value={draft.channel}
                onChange={(event) => setDraft({ ...draft, channel: event.target.value as NewsChannel })}
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              >
                {NEWS_CHANNELS.map((channel) => <option key={channel} value={channel}>{channelLabels[channel] ?? channel}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">وضع استهداف الصفحات</span>
              <select
                value={draft.pageMode}
                onChange={(event) => setDraft({ ...draft, pageMode: event.target.value as NewsPlacement["pageMode"] })}
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              >
                {PAGE_TARGET_MODES.map((mode) => <option key={mode} value={mode}>{pageModeLabels[mode] ?? mode}</option>)}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">رموز الصفحات (مفصولة بفواصل) — مثال: /، /properties/*، home</span>
              <input
                value={codesText}
                onChange={(event) => setCodesText(event.target.value)}
                placeholder={draft.pageMode === "PAGE_GROUPS" ? "home, properties, services, tools, office, account, news" : "/, /properties/*, /services/catalog"}
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">الدولة (اختياري)</span>
              <select
                value={draft.countryCode ?? ""}
                onChange={(event) => {
                  const code = event.target.value;
                  setSelectedCountry(code);
                  setDraft({ ...draft, countryCode: code || null, cityId: null });
                }}
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              >
                <option value="">كل الدول</option>
                {countryOptions.map((country) => <option key={country.id} value={country.id}>{country.names.ar}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">المدينة (اختياري)</span>
              <select
                value={draft.cityId ?? ""}
                onChange={(event) => setDraft({ ...draft, cityId: event.target.value || null })}
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              >
                <option value="">كل المدن</option>
                {cities.map((city) => <option key={city.id} value={city.id}>{city.names.ar}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">اللغة (اختياري)</span>
              <select
                value={draft.language ?? ""}
                onChange={(event) => setDraft({ ...draft, language: event.target.value || null })}
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              >
                <option value="">كل اللغات</option>
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">الجماهير (اختياري — مفصولة بفواصل)</span>
              <input
                value={audiencesText}
                onChange={(event) => setAudiencesText(event.target.value)}
                placeholder="investors, expats, landlords"
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">الأولوية (الأصغر أولًا)</span>
              <input
                type="number" min={1} max={999}
                value={draft.priority}
                onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) || 100 })}
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">ترتيب يدوي (اختياري)</span>
              <input
                type="number" min={0}
                value={draft.manualOrder ?? ""}
                onChange={(event) => setDraft({ ...draft, manualOrder: event.target.value === "" ? null : Number(event.target.value) })}
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">الحد الأقصى للظهور</span>
              <input
                type="number" min={0}
                value={draft.limits.maxImpressions ?? ""}
                onChange={(event) => setDraft({ ...draft, limits: { ...draft.limits, maxImpressions: event.target.value === "" ? null : Number(event.target.value) } })}
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">الحد الأقصى للنقرات</span>
              <input
                type="number" min={0}
                value={draft.limits.maxClicks ?? ""}
                onChange={(event) => setDraft({ ...draft, limits: { ...draft.limits, maxClicks: event.target.value === "" ? null : Number(event.target.value) } })}
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">حد يومي لكل مستخدم</span>
              <input
                type="number" min={0}
                value={draft.limits.maxPerUserPerDay ?? ""}
                onChange={(event) => setDraft({ ...draft, limits: { ...draft.limits, maxPerUserPerDay: event.target.value === "" ? null : Number(event.target.value) } })}
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">حد لكل جلسة</span>
              <input
                type="number" min={0}
                value={draft.limits.maxPerSession ?? ""}
                onChange={(event) => setDraft({ ...draft, limits: { ...draft.limits, maxPerSession: event.target.value === "" ? null : Number(event.target.value) } })}
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">البداية (YYYY-MM-DD HH:MM)</span>
              <input
                value={draft.startAt ?? ""}
                onChange={(event) => setDraft({ ...draft, startAt: event.target.value || null })}
                placeholder="2026-01-01 09:00"
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">النهاية (YYYY-MM-DD HH:MM)</span>
              <input
                value={draft.endAt ?? ""}
                onChange={(event) => setDraft({ ...draft, endAt: event.target.value || null })}
                placeholder="2026-12-31 23:59"
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">الحالة</span>
              <select
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value as NewsPlacement["status"] })}
                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              >
                <option value="active">نشط</option>
                <option value="paused">موقوف مؤقتًا</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={savePlacement} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">حفظ الاستهداف</button>
            <button onClick={() => setDraft(null)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm transition-colors">إلغاء</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">جارٍ التحميل...</p>
      ) : placements.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">لا توجد استهدافات مخصصة — سيستخدم الخبر الاستهداف الافتراضي تلقائيًا.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right border-b border-gray-200 dark:border-gray-800">
                <th className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">القناة</th>
                <th className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">الصفحات</th>
                <th className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">الموقع</th>
                <th className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">الحدود</th>
                <th className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">الحالة</th>
                <th className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {placements.map((placement) => (
                <tr key={placement.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{channelLabels[placement.channel] ?? placement.channel}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{pageModeLabels[placement.pageMode] ?? placement.pageMode}</span>
                    {placement.pageCodes.length > 0 && (
                      <div className="text-xs text-gray-400">{placement.pageCodes.slice(0, 3).join(", ")}{placement.pageCodes.length > 3 ? "…" : ""}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                    {placement.countryCode ? countryName(placement.countryCode) : "كل الدول"}
                    {placement.cityId ? ` — ${cityName(selectedCountry, placement.cityId)}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                    {placement.limits.maxImpressions != null || placement.limits.maxClicks != null
                      ? [placement.limits.maxImpressions != null ? `ظهور ${placement.limits.maxImpressions}` : "", placement.limits.maxClicks != null ? `نقرات ${placement.limits.maxClicks}` : ""].filter(Boolean).join(" / ")
                      : "بدون حدود"}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 text-xs rounded-lg ${placement.status === "active" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"}`}>
                      {placement.status === "active" ? "نشط" : "موقوف"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {canUpdate && (
                        <>
                          <button onClick={() => startEdit(placement)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded transition-colors">تعديل</button>
                          <button onClick={() => togglePause(placement)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded transition-colors">{placement.status === "active" ? "إيقاف" : "تشغيل"}</button>
                          <button onClick={() => deletePlacement(placement.id)} className="px-2 py-1 text-xs bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded transition-colors">حذف</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SourcesTab({ can }: { can: (permission: string) => boolean }) {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [editing, setEditing] = useState<SourceForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const canManage = can(PERMISSIONS.NEWS_SOURCES_MANAGE);

  const load = async () => {
    try {
      const res = await fetch("/api/news/sources", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.sources)) setSources(data.sources);
    } catch {
      setMessage("تعذر تحميل المصادر.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/news/sources", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && Array.isArray(data.sources)) setSources(data.sources);
      } catch {
        if (!cancelled) setMessage("تعذر تحميل المصادر.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function startCreate() {
    setEditing({ ...emptySource });
    setMessage("");
  }

  function startEdit(source: NewsSource) {
    setEditing({
      id: source.id,
      name: source.name,
      url: source.url,
      sourceType: source.sourceType,
      format: source.format,
      countryCode: source.countryCode ?? "",
      language: source.language,
      trustLevel: source.trustLevel,
      status: source.status,
      fetchIntervalMinutes: source.fetchIntervalMinutes,
    });
    setMessage("");
  }

  async function saveSource() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.url.trim()) {
      setMessage("الاسم والرابط مطلوبان.");
      return;
    }
    try {
      const res = await fetch("/api/news/sources", {
        method: editing.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editing, countryCode: editing.countryCode || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "فشل حفظ المصدر.");
        return;
      }
      setMessage(editing.id ? "تم تحديث المصدر." : "تم إنشاء المصدر.");
      setEditing(null);
      await load();
    } catch {
      setMessage("خطأ في الاتصال بالخادم.");
    }
  }

  async function deleteSource(id: string) {
    if (!confirm("هل تريد حذف هذا المصدر؟")) return;
    try {
      const res = await fetch(`/api/news/sources?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "فشل الحذف.");
        return;
      }
      setMessage("تم حذف المصدر.");
      await load();
    } catch {
      setMessage("خطأ في الاتصال بالخادم.");
    }
  }

  async function fetchSource(id: string) {
    setFetchingId(id);
    setMessage("");
    try {
      const res = await fetch("/api/news/sources/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "فشل الجلب.");
      } else {
        setMessage(`تم الجلب: ${data.newItems ?? 0} جديد / ${data.duplicates ?? 0} مكرر / ${data.errors?.length ?? 0} أخطاء.`);
      }
      await load();
    } catch {
      setMessage("خطأ في الاتصال بالخادم.");
    } finally {
      setFetchingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">المصادر الخارجية</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">سجل المصادر الموثوقة لاستيراد الأخبار — العناصر المستوردة تصل كمسودات بانتظار المراجعة.</p>
        </div>
        {canManage && (
          <button onClick={startCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">+ مصدر جديد</button>
        )}
      </div>
      {message && <div className="mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">{message}</div>}

      {editing && canManage && (
        <div className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{editing.id ? "تعديل مصدر" : "مصدر جديد"}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">الاسم</span>
              <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">الرابط (http/https عام)</span>
              <input value={editing.url} onChange={(event) => setEditing({ ...editing, url: event.target.value })} placeholder="https://example.com/feed.xml" className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">النوع</span>
              <select value={editing.sourceType} onChange={(event) => setEditing({ ...editing, sourceType: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg">
                {NEWS_SOURCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">الصيغة</span>
              <input value={editing.format} onChange={(event) => setEditing({ ...editing, format: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">الدولة (اختياري)</span>
              <select value={editing.countryCode} onChange={(event) => setEditing({ ...editing, countryCode: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg">
                <option value="">عالمي</option>
                {countryOptions.map((country) => <option key={country.id} value={country.id}>{country.names.ar}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">اللغة</span>
              <select value={editing.language} onChange={(event) => setEditing({ ...editing, language: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg">
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">مستوى الثقة</span>
              <select value={editing.trustLevel} onChange={(event) => setEditing({ ...editing, trustLevel: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg">
                {(["REVIEW_REQUIRED", "TRUSTED"] as const).map((level) => <option key={level} value={level}>{trustLabels[level] ?? level}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">الحالة</span>
              <select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg">
                <option value="active">نشط</option>
                <option value="paused">موقوف مؤقتًا</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">فاصل الجلب (بالدقائق — 15 حتى 10080)</span>
              <input type="number" min={15} max={10080} value={editing.fetchIntervalMinutes} onChange={(event) => setEditing({ ...editing, fetchIntervalMinutes: Number(event.target.value) || 60 })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
            </label>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button onClick={saveSource} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">حفظ</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm transition-colors">إلغاء</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">جارٍ التحميل...</p>
      ) : sources.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">لا توجد مصادر بعد.</p>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">المصدر</th>
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">الدولة</th>
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">الثقة</th>
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">الحالة</th>
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">آخر جلب</th>
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{source.name}</div>
                    <div className="text-xs text-gray-400 truncate max-w-xs">{source.url}</div>
                    <div className="text-xs text-gray-400">{source.sourceType} • كل {source.fetchIntervalMinutes} دقيقة</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{source.countryCode ? countryName(source.countryCode) : "عالمي"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-lg ${source.trustLevel === "TRUSTED" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"}`}>
                      {trustLabels[source.trustLevel] ?? source.trustLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-lg ${source.status === "active" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                      {source.status === "active" ? "نشط" : "موقوف"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {source.lastFetchedAt ? source.lastFetchedAt : "لم يُجلب بعد"}
                    {source.lastError && <div className="text-red-500 dark:text-red-400 truncate max-w-xs">{source.lastError}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canManage && (
                        <>
                          <button onClick={() => fetchSource(source.id)} disabled={fetchingId === source.id || source.status !== "active"} className="px-2.5 py-1 text-xs bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded transition-colors disabled:opacity-50">
                            {fetchingId === source.id ? "جارٍ الجلب..." : "جلب الآن"}
                          </button>
                          <button onClick={() => startEdit(source)} className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded transition-colors">تعديل</button>
                          <button onClick={() => deleteSource(source.id)} className="px-2.5 py-1 text-xs bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded transition-colors">حذف</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type AnalyticsItem = {
  newsId: string;
  impressions: number;
  visibleImpressions: number;
  clicks: number;
  ctr: number;
  events: Record<string, number>;
};

function AnalyticsTab() {
  const [items, setItems] = useState<AnalyticsItem[]>([]);
  const [totals, setTotals] = useState<{ impressions: number; visibleImpressions: number; clicks: number; events: Record<string, { total: number; valid: number; invalid: number }> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/news/analytics", { cache: "no-store", signal: controller.signal });
        const data = await res.json();
        if (!controller.signal.aborted) {
          if (Array.isArray(data.items)) setItems(data.items);
          if (data.totals) setTotals(data.totals);
        }
      } catch {
        if (!controller.signal.aborted) setMessage("تعذر تحميل الإحصائيات.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const totalClicks = totals?.clicks ?? items.reduce((sum, item) => sum + item.clicks, 0);
  const totalVisible = totals?.visibleImpressions ?? items.reduce((sum, item) => sum + item.visibleImpressions, 0);
  const overallCtr = totalVisible > 0 ? (totalClicks / totalVisible).toFixed(4) : "0.0000";

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">الإحصائيات</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">الظهور والنقرات المسجلة عبر القنوات — النقرات تُحتسب فقط للزوار الحقيقيين (تُستبعد الزواحف والجلب المسبق).</p>
      </div>
      {message && <div className="mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">{message}</div>}

      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">جارٍ التحميل...</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">الظهور</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{totals?.impressions ?? items.reduce((sum, item) => sum + item.impressions, 0)}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">ظهور مرئي</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalVisible}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">النقرات</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalClicks}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">معدل النقر (CTR)</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{overallCtr}</div>
            </div>
          </div>

          {totals?.events && Object.keys(totals.events).length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {Object.entries(totals.events).map(([type, counts]) => (
                <span key={type} className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg">
                  {type}: {counts.total} ({counts.valid} صحيح / {counts.invalid} غير صحيح)
                </span>
              ))}
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-12">لا توجد بيانات إحصائيات بعد.</p>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">الخبر</th>
                    <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">ظهور</th>
                    <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">ظهور مرئي</th>
                    <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">نقرات</th>
                    <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.newsId} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.newsId}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.impressions}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.visibleImpressions}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.clicks}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.ctr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

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
  const [tab, setTab] = useState<"news" | "sources" | "analytics">("news");

  const can = (permission: string) => identity.permissions.includes(permission);
  const canPublish = can(PERMISSIONS.NEWS_PUBLISH);
  const canSources = can(PERMISSIONS.NEWS_SOURCES_MANAGE);
  const canAnalytics = can(PERMISSIONS.NEWS_ANALYTICS_VIEW);
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
      summaryAr: item.summaryAr,
      summaryEn: item.summaryEn,
      summaryTr: item.summaryTr,
      bodyAr: item.bodyAr,
      bodyEn: item.bodyEn,
      bodyTr: item.bodyTr,
      category: item.category,
      tags: item.tags,
      tagsText: item.tags.join(", "),
      imageUrl: item.imageUrl,
      isBreaking: item.isBreaking,
      isPinned: item.isPinned,
      language: item.language,
      newsType: item.newsType,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      sourcePublishedAt: item.sourcePublishedAt,
      reviewStatus: item.reviewStatus,
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
        tags: parseListText(editing.tagsText),
        countryCode: editing.scope === "global" ? null : editing.countryCode || restrictedToCountry || selectedCountry,
        cityId: editing.scope === "city" ? editing.cityId || `${editing.countryCode || selectedCountry}-${selectedCountry}` : null,
        linkUrl: editing.linkUrl || null,
      };
      const method = payload.id ? "PATCH" : "POST";
      const res = await fetch("/api/news", {
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">إدارة الأخبار والشريط</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">الشريط الإخباري حسب الدولة والمنطقة — عالميًا أو محليًا</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/ads" className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">مركز الإعلانات</Link>
          <Link href="/" target="_blank" className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">معاينة المنصة ↗</Link>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1 w-fit">
          <button onClick={() => setTab("news")} className={`px-4 py-2 text-sm rounded-lg transition-colors ${tab === "news" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>الأخبار</button>
          {canSources && (
            <button onClick={() => setTab("sources")} className={`px-4 py-2 text-sm rounded-lg transition-colors ${tab === "sources" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>المصادر</button>
          )}
          {canAnalytics && (
            <button onClick={() => setTab("analytics")} className={`px-4 py-2 text-sm rounded-lg transition-colors ${tab === "analytics" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>الإحصائيات</button>
          )}
        </div>

        {message && <div className="mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">{message}</div>}

        {tab === "sources" && canSources && <SourcesTab can={can} />}
        {tab === "analytics" && canAnalytics && <AnalyticsTab />}

        {tab === "news" && (
          <>
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
                    <span className="text-xs text-gray-500 dark:text-gray-400">ملخص (عربي)</span>
                    <textarea value={editing.summaryAr ?? ""} onChange={(event) => setEditing({ ...editing, summaryAr: event.target.value || null })} rows={2} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">ملخص (إنجليزي)</span>
                    <textarea value={editing.summaryEn ?? ""} onChange={(event) => setEditing({ ...editing, summaryEn: event.target.value || null })} rows={2} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">ملخص (تركي)</span>
                    <textarea value={editing.summaryTr ?? ""} onChange={(event) => setEditing({ ...editing, summaryTr: event.target.value || null })} rows={2} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">التصنيف</span>
                    <select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg">
                      {NEWS_TYPES.map((type) => <option key={type} value={type}>{categoryLabels[type] ?? type}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">الوسوم (مفصولة بفواصل)</span>
                    <input value={editing.tagsText} onChange={(event) => setEditing({ ...editing, tagsText: event.target.value })} placeholder="سكني, استثمار" className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">صورة (رابط اختياري)</span>
                    <input value={editing.imageUrl ?? ""} onChange={(event) => setEditing({ ...editing, imageUrl: event.target.value || null })} placeholder="https://…" className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">مصدر الأخبار</span>
                    <select value={editing.newsType} onChange={(event) => setEditing({ ...editing, newsType: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg">
                      {NEWS_SOURCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">حالة المراجعة</span>
                    <select value={editing.reviewStatus} onChange={(event) => setEditing({ ...editing, reviewStatus: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg">
                      {REVIEW_STATUSES.map((status) => <option key={status} value={status}>{reviewLabels[status] ?? status}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">اللغة الأساسية</span>
                    <select value={editing.language} onChange={(event) => setEditing({ ...editing, language: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg">
                      <option value="ar">العربية</option>
                      <option value="en">English</option>
                      <option value="tr">Türkçe</option>
                    </select>
                  </label>
                  <div className="flex items-center gap-6 mt-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input type="checkbox" checked={editing.isBreaking} onChange={(event) => setEditing({ ...editing, isBreaking: event.target.checked })} className="w-4 h-4" />
                      عاجل
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input type="checkbox" checked={editing.isPinned} onChange={(event) => setEditing({ ...editing, isPinned: event.target.checked })} className="w-4 h-4" />
                      مثبت
                    </label>
                  </div>
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
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">البداية (YYYY-MM-DD HH:MM)</span>
                    <input value={editing.startAt ?? ""} onChange={(event) => setEditing({ ...editing, startAt: event.target.value || null })} placeholder="2026-01-01 09:00" className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">النهاية (YYYY-MM-DD HH:MM)</span>
                    <input value={editing.endAt ?? ""} onChange={(event) => setEditing({ ...editing, endAt: event.target.value || null })} placeholder="2026-12-31 23:59" className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg" />
                  </label>
                </div>

                {editing.id && <PlacementEditor newsId={editing.id} canUpdate={can(PERMISSIONS.NEWS_UPDATE)} />}

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
                          <div className="font-medium text-gray-900 dark:text-white">
                            {item.isBreaking && <span className="inline-block px-1.5 py-0.5 text-[10px] bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded mr-1">عاجل</span>}
                            {item.isPinned && <span className="inline-block px-1.5 py-0.5 text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded mr-1">مثبت</span>}
                            {item.titleAr}
                          </div>
                          <div className="text-xs text-gray-400">{item.titleEn}{item.category !== "GENERAL" ? ` • ${categoryLabels[item.category] ?? item.category}` : ""}</div>
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
                          {item.reviewStatus !== "APPROVED" && (
                            <div className={`text-[10px] mt-1 ${item.reviewStatus === "REJECTED" ? "text-red-500 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {reviewLabels[item.reviewStatus] ?? item.reviewStatus}
                            </div>
                          )}
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
          </>
        )}
      </main>
    </div>
  );
}
