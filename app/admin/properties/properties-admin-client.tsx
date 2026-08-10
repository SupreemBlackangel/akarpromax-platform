"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPageShell from "@/src/components/AdminPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";

type TaxonomyType = {
  id: string;
  category_id: string;
  label_en: string;
  label_ar: string;
  label_tr: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  show_in_search: boolean;
  show_in_add_property: boolean;
  created_at: string;
  updated_at: string;
};

type TaxonomyCategory = {
  id: string;
  label_en: string;
  label_ar: string;
  label_tr: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  types: TaxonomyType[];
};

type FormKind = "category" | "type";

type FormState = {
  kind: FormKind;
  id: string | null;
  category_id: string;
  label_en: string;
  label_ar: string;
  label_tr: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  show_in_search: boolean;
  show_in_add_property: boolean;
};

const EMPTY_FORM: FormState = {
  kind: "category",
  id: null,
  category_id: "",
  label_en: "",
  label_ar: "",
  label_tr: "",
  icon: "",
  sort_order: 0,
  is_active: true,
  show_in_search: true,
  show_in_add_property: true,
};

export default function PropertiesAdminClient() {
  const { locale, copy, viewer, dir, openLogin, handleLogout } = useServicesPage();
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const load = useCallback(() => {
    const controller = new AbortController();
    (async () => {
      setMessage("");
      try {
        const res = await fetch("/api/admin/properties/taxonomy", { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to load taxonomy");
        const data = await res.json();
        if (!controller.signal.aborted) {
          setCategories(data.categories ?? []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setMessage("Failed to load taxonomy data");
        }
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = (kind: FormKind, categoryId?: string) => {
    setForm({ ...EMPTY_FORM, kind, category_id: categoryId ?? "" });
    setEditing(false);
    setShowForm(true);
  };

  const openEdit = (kind: FormKind, item: TaxonomyCategory | TaxonomyType) => {
    setForm({
      kind,
      id: item.id,
      category_id: "category_id" in item ? item.category_id : "",
      label_en: item.label_en,
      label_ar: item.label_ar,
      label_tr: item.label_tr,
      icon: item.icon ?? "",
      sort_order: item.sort_order,
      is_active: item.is_active,
      show_in_search: "show_in_search" in item ? item.show_in_search : true,
      show_in_add_property: "show_in_add_property" in item ? item.show_in_add_property : true,
    });
    setEditing(true);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (editing && form.id) {
        const body: Record<string, unknown> = {
          label_en: form.label_en,
          label_ar: form.label_ar,
          label_tr: form.label_tr,
          icon: form.icon || null,
          sort_order: form.sort_order,
          is_active: form.is_active,
        };
        if (form.kind === "type") {
          body.show_in_search = form.show_in_search;
          body.show_in_add_property = form.show_in_add_property;
        }
        const res = await fetch(`/api/admin/properties/taxonomy/${encodeURIComponent(form.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Update failed");
        }
      } else {
        const body: Record<string, unknown> = {
          kind: form.kind,
          label_en: form.label_en,
          label_ar: form.label_ar,
          label_tr: form.label_tr,
          icon: form.icon || null,
          sort_order: form.sort_order,
        };
        if (form.kind === "type") {
          body.category_id = form.category_id;
          body.show_in_search = form.show_in_search;
          body.show_in_add_property = form.show_in_add_property;
        }
        const res = await fetch("/api/admin/properties/taxonomy/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Create failed");
        }
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditing(false);
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (kind: "category" | "type", id: string) => {
    const label = kind === "category" ? "هذا التصنيف" : "هذا النوع";
    if (!confirm(`هل أنت متأكد من حذف ${label}؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/properties/taxonomy/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AdminPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      activeSection="properties"
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <div className="max-w-6xl mx-auto px-4 py-8" dir={dir}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white"> إدارة تصنيفات العقارات</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">التصنيفات وأنواع العقارات</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => openCreate("category")} className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition">
              + تصنيف جديد
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            {message}
          </div>
        )}

        {showForm && (
          <div className="mb-6 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editing ? "تعديل" : "إضافة"} {form.kind === "category" ? "تصنيف" : "نوع"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">الاسم بالإنجليزية</label>
                <input value={form.label_en} onChange={(e) => setForm({ ...form, label_en: e.target.value })} className={inputCls} placeholder="Label EN" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">الاسم بالعربية</label>
                <input value={form.label_ar} onChange={(e) => setForm({ ...form, label_ar: e.target.value })} className={inputCls} placeholder="Label AR" dir="rtl" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">الاسم بالتركية</label>
                <input value={form.label_tr} onChange={(e) => setForm({ ...form, label_tr: e.target.value })} className={inputCls} placeholder="Label TR" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">الأيقونة</label>
                <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={inputCls} placeholder="🏠" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">الترتيب</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className={inputCls} />
              </div>
              {form.kind === "type" && !editing && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">التصنيف الأب</label>
                  <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={inputCls}>
                    <option value="">— اختر التصنيف —</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.label_en} / {cat.label_ar}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                نشط
              </label>
              {form.kind === "type" && (
                <>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={form.show_in_search} onChange={(e) => setForm({ ...form, show_in_search: e.target.checked })} className="rounded" />
                    يظهر في البحث
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={form.show_in_add_property} onChange={(e) => setForm({ ...form, show_in_add_property: e.target.checked })} className="rounded" />
                    يظهر في إضافة عقار
                  </label>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} disabled={busy || !form.label_en || !form.label_ar || !form.label_tr} className="px-5 py-2 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition">
                {busy ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إنشاء"}
              </button>
              <button onClick={() => { setShowForm(false); setEditing(false); setForm(EMPTY_FORM); }} className="px-5 py-2 rounded-xl text-sm font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                إلغاء
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {categories.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">لا توجد تصنيفات بعد.</div>
          )}
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon ?? "📂"}</span>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-sm">{cat.label_en}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{cat.label_ar} / {cat.label_tr}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${cat.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {cat.is_active ? "نشط" : "معطل"}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">#{cat.sort_order}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit("category", cat)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">
                    تعديل
                  </button>
                  <button onClick={() => openCreate("type", cat.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition">
                    + نوع
                  </button>
                  <button onClick={() => handleDelete("category", cat.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition">
                    حذف
                  </button>
                  <button onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    {expandedCat === cat.id ? "▲" : "▼"} {cat.types.length}
                  </button>
                </div>
              </div>
              {expandedCat === cat.id && (
                <div className="px-5 py-3">
                  {cat.types.length === 0 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 py-2">لا توجد أنواع في هذا التصنيف.</div>
                  )}
                  <div className="space-y-2">
                    {cat.types.map((typ) => (
                      <div key={typ.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{typ.icon ?? "📌"}</span>
                          <div>
                            <div className="text-sm font-bold text-gray-800 dark:text-gray-100">{typ.label_en}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{typ.label_ar} / {typ.label_tr}</div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${typ.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                            {typ.is_active ? "نشط" : "معطل"}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">#{typ.sort_order}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit("type", typ)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">
                            تعديل
                          </button>
                          <button onClick={() => handleDelete("type", typ.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition">
                            حذف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminPageShell>
  );
}
