"use client";

import { useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "@/src/constants/permissions";
import type { Locale } from "@/src/types/site";

type Identity = {
  authenticated: boolean;
  displayName: string;
  role: string;
  countryCode: string | null;
  permissions: string[];
};

type I18nKeyRow = {
  namespace: string;
  key: string;
  description: string | null;
  locale: string | null;
  value: string | null;
  status: string | null;
};

type I18nVersion = {
  id: number;
  label: string;
  createdAt: string;
  userId: string | null;
};

type I18nData = {
  namespaces: string[];
  keys: I18nKeyRow[];
};

type ValueEntry = { key: string; locale: string; value: string };

const LOCALES: Locale[] = ["ar", "en", "tr"];
const localeLabels: Record<Locale, string> = { ar: "عربي", en: "English", tr: "Türkçe" };

export default function I18nAdminClient({ initialUser }: { initialUser: { email: string; displayName: string } }) {
  const [identity, setIdentity] = useState<Identity>({
    authenticated: true,
    displayName: initialUser.displayName,
    role: "viewer",
    countryCode: null,
    permissions: [],
  });
  const [data, setData] = useState<I18nData | null>(null);
  const [namespaceFilter, setNamespaceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [versions, setVersions] = useState<I18nVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const can = (permission: string) => identity.permissions.includes(permission);
  const canEdit = can(PERMISSIONS.I18N_EDIT);
  const canPublish = can(PERMISSIONS.I18N_PUBLISH);

  async function loadData() {
    try {
      const params = new URLSearchParams();
      if (namespaceFilter) params.set("namespace", namespaceFilter);
      if (search) params.set("q", search);
      const res = await fetch(`/api/i18n/admin/keys?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setMessage(json.error ?? "Failed to load"); return; }
      setData(json);
    } catch {
      setMessage("Network error loading translations.");
    }
  }

  async function loadVersions() {
    try {
      const res = await fetch("/api/i18n/admin/versions", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && Array.isArray(json.versions)) setVersions(json.versions);
    } catch { /* silent */ }
  }

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/i18n/admin/keys?namespace=services", { cache: "no-store", signal: controller.signal });
        const json = await res.json();
        if (!controller.signal.aborted) {
          setIdentity((prev) => ({ ...prev, authenticated: true }));
          setData({ namespaces: json.namespaces ?? [], keys: json.keys ?? [] });
        }
      } catch {
        if (!controller.signal.aborted) setMessage("تعذر تحميل الترجمات.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    loadVersions();
    return () => controller.abort();
  }, []);

  const filteredKeys = useMemo(() => {
    if (!data) return [];
    return data.keys.filter((row) => {
      if (namespaceFilter && row.namespace !== namespaceFilter) return false;
      if (search && !row.key.toLowerCase().includes(search.toLowerCase()) && !(row.value ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, namespaceFilter, search]);

  const keysByNamespace = useMemo(() => {
    const map: Record<string, I18nKeyRow[]> = {};
    if (!data) return map;
    for (const row of data.keys) {
      if (!map[row.namespace]) map[row.namespace] = [];
      map[row.namespace].push(row);
    }
    return map;
  }, [data]);

  async function saveAllLocales(key: string) {
    const cacheKey = `${key}|all`;
    setSavingKeys((prev) => new Set(prev).add(cacheKey));
    setMessage("");
    const entries: ValueEntry[] = LOCALES.map((loc) => ({
      key,
      locale: loc,
      value: editing[`${key}|${loc}`] ?? "",
    }));
    try {
      const res = await fetch("/api/i18n/admin/values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage(json.error ?? "Save failed"); return; }
      setMessage(`Saved ${key} (${entries.length} locales)`);
      await loadData();
    } catch {
      setMessage("Network error saving translation.");
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(cacheKey);
        return next;
      });
    }
  }

  async function publishSnapshot() {
    setMessage("");
    try {
      const res = await fetch("/api/i18n/admin/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", label: "Publish from admin" }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage(json.error ?? "Publish failed"); return; }
      setMessage(`Published as version ${json.version}`);
      await loadVersions();
    } catch {
      setMessage("Network error publishing.");
    }
  }

  async function rollbackVersion(version: number) {
    if (!confirm(`Rollback to version ${version}?`)) return;
    setMessage("");
    try {
      const res = await fetch("/api/i18n/admin/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rollback", version }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage(json.error ?? "Rollback failed"); return; }
      setMessage(`Rolled back to version ${version} (${json.restored} entries restored)`);
      await loadData();
      await loadVersions();
    } catch {
      setMessage("Network error rolling back.");
    }
  }

  return (
    <main className="i18n-admin" dir="rtl">
      <div className="container" style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">إدارة الترجمات</h1>

        {message && (
          <div className="mb-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
            {message}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <select
            value={namespaceFilter}
            onChange={(e) => setNamespaceFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
          >
            <option value="">جميع الـ namespaces</option>
            {data?.namespaces.map((ns) => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="بحث بالـ key أو القيمة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm flex-1 min-w-[200px]"
          />
          {canPublish && (
            <button onClick={publishSnapshot} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors">
              نشر نسخة
            </button>
          )}
        </div>

        {versions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">سجل النسخ</h2>
            <div className="flex flex-wrap gap-2">
              {versions.map((v) => (
                <span key={v.id} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs">
                  <span className="font-medium">v{v.id}</span>
                  <span className="text-gray-500">{v.label}</span>
                  <span className="text-gray-400">{new Date(v.createdAt).toLocaleDateString()}</span>
                  {can(PERMISSIONS.I18N_EDIT) && (
                    <button onClick={() => rollbackVersion(v.id)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 underline text-xs">تراجع</button>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">جاري التحميل...</p>
        ) : !data ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">تعذر تحميل البيانات.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(keysByNamespace).map(([ns, rows]) => (
              <div key={ns} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">namespace: {ns}</h2>
                  <p className="text-xs text-gray-500">{rows.length} key(s)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-right border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                        <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Key</th>
                        <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Description</th>
                        {LOCALES.map((loc) => (
                          <th key={loc} className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">{localeLabels[loc]}</th>
                        ))}
                        <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">حفظ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const cacheKey = `${row.key}|${row.locale}`;
                        const isSaving = savingKeys.has(cacheKey);
                        return (
                          <tr key={`${ns}|${row.key}`} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                            <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{row.key}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">{row.description ?? "-"}</td>
                            {LOCALES.map((loc) => {
                              const localeRow = rows.find((r) => r.locale === loc && r.key === row.key);
                              const currentValue = editing[cacheKey] ?? localeRow?.value ?? "";
                              return (
                                <td key={loc} className="px-4 py-3">
                                  <textarea
                                    value={currentValue}
                                    onChange={(e) => setEditing((prev) => ({ ...prev, [cacheKey]: e.target.value }))}
                                    rows={2}
                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-800 dark:text-gray-100 resize-y"
                                    dir="auto"
                                  />
                                </td>
                              );
                            })}
                            <td className="px-4 py-3">
                              <button
                                onClick={() => saveAllLocales(row.key)}
                                disabled={isSaving || !canEdit}
                                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                              >
                                {isSaving ? "..." : "حفظ"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {filteredKeys.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-12">لا توجد مفاتيح ترجمة.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}