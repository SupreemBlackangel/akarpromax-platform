"use client";

import { useCallback, useEffect, useState } from "react";
import { useServicesPage } from "@services-ui/useServicesPage";
import AdminPropertyModeration from "@/components/properties/AdminPropertyModeration";

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
  const { dir } = useServicesPage();
  const [section, setSection] = useState<"moderation" | "taxonomy">("moderation");
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const load = useCallback(() => {
    const controller = new AbortController();
    (async () => {
      setTaxonomyLoading(true);
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
      } finally {
        if (!controller.signal.aborted) setTaxonomyLoading(false);
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

  const closeForm = () => {
    setShowForm(false);
    setEditing(false);
    setForm(EMPTY_FORM);
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

  return (
      <div dir={dir}>
        <header className="advertiser-admin-header">
          <div><p>إدارة السوق العقاري</p><h1>إدارة العقارات</h1></div>
          <div className="admin-header-actions">
            {section === "taxonomy" && (
              <button type="button" className="admin-primary" onClick={() => openCreate("category")}>+ تصنيف جديد</button>
            )}
          </div>
        </header>

        <nav className="admin-subnav" aria-label="أقسام إدارة العقارات">
          <button className={section === "moderation" ? "active" : ""} type="button" onClick={() => setSection("moderation")}>
            <span aria-hidden="true">◎</span>مراجعة العقارات
          </button>
          <button className={section === "taxonomy" ? "active" : ""} type="button" onClick={() => setSection("taxonomy")}>
            <span aria-hidden="true">▤</span>التصنيفات وأنواع العقارات
          </button>
        </nav>

        {section === "taxonomy" && message && (
          <div className="admin-message" role="status">
            {message}
            <button type="button" onClick={() => setMessage("")}>×</button>
          </div>
        )}

        {section === "moderation" && <AdminPropertyModeration />}

        {section === "taxonomy" && (
          <section className="admin-panel">
            <div className="admin-panel-title">
              <div><p>التصنيفات</p><h2>تصنيفات وأنواع العقارات</h2></div>
              <span>{categories.length} تصنيف</span>
            </div>

            {taxonomyLoading ? (
              <div className="admin-skeleton">
                <div className="admin-skeleton-row" />
                <div className="admin-skeleton-row" />
                <div className="admin-skeleton-row" />
              </div>
            ) : (
              <div className="admin-access-list">
                {categories.map((cat) => (
                  <article key={cat.id}>
                    <span aria-hidden="true">{cat.icon ?? "📂"}</span>
                    <div>
                      <strong>{cat.label_en}</strong>
                      <small>{cat.label_ar} / {cat.label_tr}</small>
                    </div>
                    <b>{cat.types.length} نوع · #{cat.sort_order}</b>
                    <i className={cat.is_active ? "" : "disabled"}>{cat.is_active ? "نشط" : "معطل"}</i>
                    <div className="admin-row-actions">
                      <button type="button" onClick={() => openEdit("category", cat)}>تعديل</button>
                      <button type="button" onClick={() => openCreate("type", cat.id)}>+ نوع</button>
                      <button type="button" className="danger" onClick={() => handleDelete("category", cat.id)}>حذف</button>
                      <button type="button" onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}>
                        {expandedCat === cat.id ? "▲" : "▼"} {cat.types.length}
                      </button>
                    </div>
                    {expandedCat === cat.id && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        {cat.types.length === 0 ? (
                          <div className="admin-empty">
                            <span>◇</span>
                            <strong>لا توجد أنواع في هذا التصنيف</strong>
                            <p>أضف أول نوع لهذا التصنيف.</p>
                            <button type="button" onClick={() => openCreate("type", cat.id)}>+ إضافة نوع</button>
                          </div>
                        ) : (
                          <div className="admin-access-list">
                            {cat.types.map((typ) => (
                              <article key={typ.id}>
                                <span aria-hidden="true">{typ.icon ?? "📌"}</span>
                                <div>
                                  <strong>{typ.label_en}</strong>
                                  <small>{typ.label_ar} / {typ.label_tr}</small>
                                </div>
                                <b>#{typ.sort_order}</b>
                                <i className={typ.is_active ? "" : "disabled"}>{typ.is_active ? "نشط" : "معطل"}</i>
                                <div className="admin-row-actions">
                                  <button type="button" onClick={() => openEdit("type", typ)}>تعديل</button>
                                  <button type="button" className="danger" onClick={() => handleDelete("type", typ.id)}>حذف</button>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                ))}
                {!categories.length && (
                  <div className="admin-empty">
                    <span>◇</span>
                    <strong>لا توجد تصنيفات بعد</strong>
                    <p>أضف أول تصنيف عقاري لتنظيم العقارات.</p>
                    <button type="button" onClick={() => openCreate("category")}>+ إضافة أول تصنيف</button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {section === "taxonomy" && showForm && (
          <div className="admin-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeForm(); }}>
            <div className="admin-dialog">
              <div className="admin-dialog-head">
                <div><p>{editing ? "تعديل" : "إضافة"}</p><h2>{form.kind === "category" ? "تصنيف عقاري" : "نوع عقار"}</h2></div>
                <button type="button" aria-label="إغلاق" onClick={closeForm}>×</button>
              </div>

              <div className="admin-form-grid">
                <label>
                  الاسم بالإنجليزية
                  <input value={form.label_en} onChange={(e) => setForm({ ...form, label_en: e.target.value })} placeholder="Label EN" />
                </label>
                <label>
                  الاسم بالعربية
                  <input value={form.label_ar} onChange={(e) => setForm({ ...form, label_ar: e.target.value })} placeholder="Label AR" dir="rtl" />
                </label>
                <label>
                  الاسم بالتركية
                  <input value={form.label_tr} onChange={(e) => setForm({ ...form, label_tr: e.target.value })} placeholder="Label TR" />
                </label>
                <label>
                  الأيقونة
                  <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🏠" />
                </label>
                <label>
                  الترتيب
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                </label>
                {form.kind === "type" && !editing && (
                  <label>
                    التصنيف الأب
                    <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                      <option value="">— اختر التصنيف —</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.label_en} / {cat.label_ar}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <fieldset>
                <legend>الحالة والظهور</legend>
                <label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />نشط</label>
                {form.kind === "type" && (
                  <>
                    <label><input type="checkbox" checked={form.show_in_search} onChange={(e) => setForm({ ...form, show_in_search: e.target.checked })} />يظهر في البحث</label>
                    <label><input type="checkbox" checked={form.show_in_add_property} onChange={(e) => setForm({ ...form, show_in_add_property: e.target.checked })} />يظهر في إضافة عقار</label>
                  </>
                )}
              </fieldset>

              <div className="admin-dialog-actions">
                <button type="button" onClick={closeForm}>إلغاء</button>
                <button
                  className="admin-primary"
                  type="button"
                  disabled={busy || !form.label_en || !form.label_ar || !form.label_tr}
                  onClick={handleSubmit}
                >
                  {busy ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إنشاء"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
