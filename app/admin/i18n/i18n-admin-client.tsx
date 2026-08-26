"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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

type KeyGroup = {
  namespace: string;
  key: string;
  fullKey: string;
  description: string | null;
  values: Partial<Record<Locale, string>>;
};

const LOCALES: Locale[] = ["ar", "en", "tr"];
const localeLabels: Record<Locale, string> = { ar: "عربي", en: "English", tr: "Türkçe" };
const PAGE_SIZE = 100;
const NAME_PATTERN = /^[a-z0-9._-]+$/i;
const CUSTOM_NAMESPACE = "__custom__";

const emptyAddForm = { namespace: "", customNamespace: "", key: "", description: "", ar: "", en: "", tr: "" };

export default function I18nAdminClient({ initialUser }: { initialUser: { email: string; displayName: string } }) {
  const [identity, setIdentity] = useState<Identity>({
    authenticated: true,
    displayName: initialUser.displayName,
    role: "viewer",
    countryCode: null,
    permissions: [],
  });
  const [data, setData] = useState<I18nData | null>(null);
  const [statics, setStatics] = useState<Record<string, Partial<Record<Locale, boolean>>>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [namespaceFilter, setNamespaceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [versions, setVersions] = useState<I18nVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [addBusy, setAddBusy] = useState(false);

  const can = (permission: string) => identity.permissions.includes(permission) || identity.permissions.includes("*");
  const canEdit = can(PERMISSIONS.I18N_EDIT);
  const canPublish = can(PERMISSIONS.I18N_PUBLISH);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (namespaceFilter) params.set("namespace", namespaceFilter);
      if (search) params.set("q", search);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String((page - 1) * PAGE_SIZE));
      const res = await fetch(`/api/i18n/admin/keys?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setMessage(json.error ?? "Failed to load"); return; }
      setData({ namespaces: json.namespaces ?? [], keys: json.keys ?? [] });
      setStatics(json.statics ?? {});
      setTotal(typeof json.total === "number" ? json.total : (json.keys ?? []).length);
      if (json.identity && Array.isArray(json.identity.permissions)) {
        setIdentity((prev) => ({ ...prev, role: json.identity.role ?? prev.role, permissions: json.identity.permissions }));
      }
    } catch {
      setMessage("Network error loading translations.");
    }
  }, [namespaceFilter, search, page]);

  async function loadVersions() {
    try {
      const res = await fetch("/api/i18n/admin/versions", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && Array.isArray(json.versions)) setVersions(json.versions);
    } catch { /* silent */ }
  }

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void loadData().finally(() => {
        if (!cancelled) setLoading(false);
      });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loadData]);

  useEffect(() => {
    window.queueMicrotask(() => { void loadVersions(); });
  }, []);

  const groupsByNamespace = useMemo(() => {
    const map: Record<string, KeyGroup[]> = {};
    if (!data) return map;
    const groups = new Map<string, KeyGroup>();
    for (const row of data.keys) {
      const fullKey = `${row.namespace}.${row.key}`;
      let group = groups.get(fullKey);
      if (!group) {
        group = { namespace: row.namespace, key: row.key, fullKey, description: row.description, values: {} };
        groups.set(fullKey, group);
        if (!map[row.namespace]) map[row.namespace] = [];
        map[row.namespace].push(group);
      }
      if (row.locale && row.value !== null && LOCALES.includes(row.locale as Locale)) {
        group.values[row.locale as Locale] = row.value;
      }
    }
    return map;
  }, [data]);

  const totalGroups = useMemo(
    () => Object.values(groupsByNamespace).reduce((sum, groups) => sum + groups.length, 0),
    [groupsByNamespace],
  );

  function missingLocales(group: KeyGroup): Locale[] {
    return LOCALES.filter((loc) => {
      const hasDb = Boolean(group.values[loc]?.trim());
      const hasStatic = Boolean(statics[group.fullKey]?.[loc]);
      return !hasDb && !hasStatic;
    });
  }

  async function saveAllLocales(group: KeyGroup) {
    const cacheKey = `${group.fullKey}|all`;
    setSavingKeys((prev) => new Set(prev).add(cacheKey));
    setMessage("");
    const entries: ValueEntry[] = LOCALES.map((loc) => ({
      key: group.fullKey,
      locale: loc,
      value: editing[`${group.fullKey}|${loc}`] ?? group.values[loc] ?? "",
    }));
    try {
      const res = await fetch("/api/i18n/admin/values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage(json.error ?? "Save failed"); return; }
      setMessage(`Saved ${group.fullKey} (${entries.length} locales)`);
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

  function openAddDialog() {
    setAddForm({ ...emptyAddForm, namespace: namespaceFilter || data?.namespaces[0] || CUSTOM_NAMESPACE });
    setAddOpen(true);
  }

  async function submitAddKey(event: FormEvent) {
    event.preventDefault();
    const namespace = (addForm.namespace === CUSTOM_NAMESPACE ? addForm.customNamespace : addForm.namespace).trim();
    const key = addForm.key.trim();
    if (!namespace || namespace.length > 80 || !NAME_PATTERN.test(namespace)) {
      setMessage("الـ namespace غير صالح (أحرف لاتينية وأرقام و . _ - فقط، بحد أقصى 80).");
      return;
    }
    if (!key || key.length > 160 || !NAME_PATTERN.test(key)) {
      setMessage("المفتاح غير صالح (أحرف لاتينية وأرقام و . _ - فقط، بحد أقصى 160).");
      return;
    }
    setAddBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/i18n/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namespace, key, description: addForm.description.trim() || undefined }),
      });
      const json = await res.json();
      if (res.status === 409) { setMessage(`المفتاح ${namespace}.${key} موجود مسبقاً.`); return; }
      if (!res.ok) { setMessage(json.error ?? "تعذر إنشاء المفتاح."); return; }

      const entries: ValueEntry[] = LOCALES
        .map((loc) => ({ key: `${namespace}.${key}`, locale: loc, value: addForm[loc].trim() }))
        .filter((entry) => entry.value);
      if (entries.length > 0) {
        const valuesRes = await fetch("/api/i18n/admin/values", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries }),
        });
        if (!valuesRes.ok) {
          setMessage(`أُنشئ المفتاح ${namespace}.${key} لكن تعذر حفظ القيم الأولية.`);
          setAddOpen(false);
          await loadData();
          return;
        }
      }
      setMessage(`تمت إضافة المفتاح ${namespace}.${key}.`);
      setAddOpen(false);
      setAddForm(emptyAddForm);
      await loadData();
    } catch {
      setMessage("خطأ في الشبكة أثناء إنشاء المفتاح.");
    } finally {
      setAddBusy(false);
    }
  }

  return (
    <main className="i18n-admin" dir="rtl">
      <div className="container" style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">إدارة الترجمات</h1>

        {message && (
          <div className="mb-4 px-4 py-2 bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-soft)]/30 text-[var(--color-primary)] dark:text-[var(--color-primary)] rounded-lg text-sm">
            {message}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <select
            value={namespaceFilter}
            onChange={(e) => { setNamespaceFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[var(--color-surface)] dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[var(--color-surface)] dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm flex-1 min-w-[200px]"
          />
          {canEdit && (
            <button onClick={openAddDialog} className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-semibold transition-colors">
              إضافة مفتاح
            </button>
          )}
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
                  {canEdit && (
                    <button onClick={() => rollbackVersion(v.id)} className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] dark:text-[var(--color-primary)] underline text-xs">تراجع</button>
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
            {Object.entries(groupsByNamespace).map(([ns, groups]) => (
              <div key={ns} className="bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">namespace: {ns}</h2>
                  <p className="text-xs text-gray-500">{groups.length} key(s)</p>
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
                      {groups.map((group) => {
                        const isSaving = savingKeys.has(`${group.fullKey}|all`);
                        const missing = missingLocales(group);
                        return (
                          <tr key={group.fullKey} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                            <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                              <div>{group.key}</div>
                              {missing.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {missing.map((loc) => (
                                    <span key={loc} className="admin-status status-pending">ناقص {loc.toUpperCase()}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">{group.description ?? "-"}</td>
                            {LOCALES.map((loc) => {
                              const editKey = `${group.fullKey}|${loc}`;
                              const currentValue = editing[editKey] ?? group.values[loc] ?? "";
                              return (
                                <td key={loc} className="px-4 py-3">
                                  <textarea
                                    value={currentValue}
                                    onChange={(e) => setEditing((prev) => ({ ...prev, [editKey]: e.target.value }))}
                                    rows={2}
                                    className="w-full px-2 py-1 text-sm bg-[var(--color-surface)] dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-800 dark:text-gray-100 resize-y"
                                    dir="auto"
                                  />
                                </td>
                              );
                            })}
                            <td className="px-4 py-3">
                              <button
                                onClick={() => saveAllLocales(group)}
                                disabled={isSaving || !canEdit}
                                className="px-3 py-1.5 text-xs bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white rounded-lg transition-colors"
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
            {totalGroups === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-12">لا توجد مفاتيح ترجمة.</p>
            )}
            {pageCount > 1 && (
              <div className="admin-subnav" style={{ justifyContent: "center", marginTop: 14 }}>
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>السابق</button>
                <span style={{ alignSelf: "center", fontSize: 10, color: "var(--color-text-muted)" }}>صفحة {page} من {pageCount} ({total} مفتاح)</span>
                <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>التالي</button>
              </div>
            )}
          </div>
        )}

        {addOpen && canEdit && (
          <div className="admin-dialog-backdrop" onClick={() => setAddOpen(false)}>
            <form className="admin-dialog admin-access-form" onSubmit={submitAddKey} onClick={(event) => event.stopPropagation()}>
              <div className="admin-dialog-head"><div><p>ترجمات</p><h2>إضافة مفتاح جديد</h2></div><button type="button" onClick={() => setAddOpen(false)}>×</button></div>
              <label>
                Namespace
                <select value={addForm.namespace} onChange={(event) => setAddForm({ ...addForm, namespace: event.target.value })}>
                  {data?.namespaces.map((ns) => <option value={ns} key={ns}>{ns}</option>)}
                  <option value={CUSTOM_NAMESPACE}>namespace جديد...</option>
                </select>
              </label>
              {addForm.namespace === CUSTOM_NAMESPACE && (
                <label>Namespace جديد<input dir="ltr" required value={addForm.customNamespace} onChange={(event) => setAddForm({ ...addForm, customNamespace: event.target.value })} placeholder="مثال: account" /></label>
              )}
              <label>المفتاح<input dir="ltr" required value={addForm.key} onChange={(event) => setAddForm({ ...addForm, key: event.target.value })} placeholder="مثال: hero.title" /></label>
              <label>الوصف (اختياري)<input value={addForm.description} onChange={(event) => setAddForm({ ...addForm, description: event.target.value })} /></label>
              {LOCALES.map((loc) => (
                <label key={loc}>
                  {localeLabels[loc]}
                  <textarea rows={2} dir="auto" value={addForm[loc]} onChange={(event) => setAddForm({ ...addForm, [loc]: event.target.value })} />
                </label>
              ))}
              <div className="admin-dialog-actions">
                <button type="button" onClick={() => setAddOpen(false)}>إلغاء</button>
                <button className="admin-primary" type="submit" disabled={addBusy}>{addBusy ? "..." : "إضافة المفتاح"}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
