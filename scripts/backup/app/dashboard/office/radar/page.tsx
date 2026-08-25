"use client";

import { useCallback, useEffect, useState } from "react";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";
import { apiFetch } from "@services-client";

type RadarRow = Record<string, unknown> & { id: string; latitude: number; longitude: number; radius_km: number; kind: string; matched_count: number; created_at: string };

export default function OfficeRadarPage() {
  const [queries, setQueries] = useState<RadarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ queryId: string; targets: Array<Record<string, unknown>> } | null>(null);
  const [lat, setLat] = useState("23.588");
  const [lng, setLng] = useState("58.3829");
  const [radius, setRadius] = useState("10");
  const [kind, setKind] = useState<"properties" | "services" | "both">("properties");
  const [error, setError] = useState("");

  const load = useCallback((controller?: AbortController) => {
    return apiFetch<{ queries: RadarRow[] }>("/api/office/v1/radar", { signal: controller?.signal })
      .then((data) => {
        if (!controller?.signal.aborted) setQueries(data.queries ?? []);
      })
      .catch(() => {
        if (controller?.signal.aborted) return;
      })
      .finally(() => {
        if (!controller?.signal.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller);
    return () => controller.abort();
  }, [load]);

  const scan = async () => {
    setError("");
    try {
      const res = await apiFetch<{ queryId: string; targets: Array<Record<string, unknown>> }>("/api/office/v1/radar", {
        method: "POST",
        body: JSON.stringify({ latitude: Number(lat), longitude: Number(lng), radiusKm: Number(radius), kind }),
      });
      setResult(res);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر تنفيذ المسح");
    }
  };

  return (
    <OfficeWorkspaceShell activeTab="radar">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="font-black text-gray-900 dark:text-white">مسح الرادار الجغرافي</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            يبحث عن العقارات ومزودي الخدمات ضمن نصف قطر (حتى 100 كم) باستخدام مسافة هافرساين.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-xs font-black text-gray-600 dark:text-gray-300">
              خط العرض
              <input value={lat} onChange={(e) => setLat(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </label>
            <label className="block text-xs font-black text-gray-600 dark:text-gray-300">
              خط الطول
              <input value={lng} onChange={(e) => setLng(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </label>
            <label className="block text-xs font-black text-gray-600 dark:text-gray-300">
              نصف القطر (كم)
              <input value={radius} onChange={(e) => setRadius(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </label>
            <label className="block text-xs font-black text-gray-600 dark:text-gray-300">
              النوع
              <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
                <option value="properties">عقارات</option>
                <option value="services">خدمات</option>
                <option value="both">الكل</option>
              </select>
            </label>
          </div>
          <button type="button" onClick={() => void scan()} className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700">
            تنفيذ المسح
          </button>
          {error && <p className="mt-3 text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="font-black text-gray-900 dark:text-white">سجل عمليات المسح</h2>
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500">جارٍ التحميل…</p>
          ) : queries.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">لا توجد عمليات مسح بعد.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {queries.map((q) => (
                <li key={q.id} className="py-3 text-sm">
                  <p className="font-bold text-gray-800 dark:text-gray-200">
                    {q.kind} · {q.matched_count} نتيجة
                  </p>
                  <p className="text-xs text-gray-400">
                    {Number(q.latitude).toFixed(4)}, {Number(q.longitude).toFixed(4)} · {q.radius_km}كم · {q.created_at}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {result && (
        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="font-black text-gray-900 dark:text-white">
            النتائج — {result.targets.length} نتيجة (استعلام {result.queryId.slice(0, 8)})
          </h2>
          {result.targets.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">لم يتم العثور على نتائج ضمن نصف القطر.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
              {result.targets.map((target) => (
                <li key={String(target.id)} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{String(target.title)}</p>
                    <p className="text-xs text-gray-400">
                      {String(target.kind)} · {String(target.cityId || target.countryCode)} · {Number(target.distanceKm).toFixed(1)}كم
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {Number(target.distanceKm).toFixed(1)} كم
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </OfficeWorkspaceShell>
  );
}
