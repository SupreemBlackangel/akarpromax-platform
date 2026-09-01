"use client";

import { useEffect, useState } from "react";

type Specialty = {
  id: string;
  name_en: string;
  name_ar: string;
  name_tr: string;
  slug: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
};

type Draft = {
  name_en: string;
  name_ar: string;
  name_tr: string;
  slug: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
};

const EMPTY_DRAFT: Draft = { name_en: "", name_ar: "", name_tr: "", slug: "", icon: "", is_active: true, sort_order: 0 };

export default function CompaniesAdminClient() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  async function loadSpecialties() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/companies/taxonomy", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSpecialties(data.specialties ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/companies/taxonomy", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!active) return;
        setSpecialties(data.specialties ?? []);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  function startEdit(s: Specialty) {
    setEditingId(s.id);
    setDraft({ name_en: s.name_en, name_ar: s.name_ar, name_tr: s.name_tr, slug: s.slug, icon: s.icon ?? "", is_active: s.is_active, sort_order: s.sort_order });
    setShowCreate(false);
  }

  function startCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setShowCreate(true);
  }

  function cancel() {
    setEditingId(null);
    setShowCreate(false);
    setDraft(EMPTY_DRAFT);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/companies/taxonomy/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error ?? `HTTP ${res.status}`);
        }
      } else {
        const res = await fetch("/api/admin/companies/taxonomy/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error ?? `HTTP ${res.status}`);
        }
      }
      cancel();
      await loadSpecialties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this specialty?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/companies/taxonomy/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadSpecialties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 14 };
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block", color: "var(--color-text-secondary)" };
  const btnPrimary: React.CSSProperties = { padding: "8px 16px", background: "var(--color-primary)", color: "var(--color-primary-foreground)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 };
  const btnSecondary: React.CSSProperties = { padding: "8px 16px", background: "var(--color-surface-muted)", color: "var(--color-text-secondary)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 };
  const btnDanger: React.CSSProperties = { padding: "4px 10px", background: "var(--color-danger-soft)", color: "var(--color-danger)", border: "1px solid var(--color-danger)", borderRadius: 4, cursor: "pointer", fontSize: 13 };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }} dir="rtl">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>تصنيفات الشركات</h1>
        <button onClick={startCreate} style={btnPrimary}>+ إضافة تصنيف</button>
      </div>

      {error && <div style={{ padding: "10px 14px", background: "var(--color-danger-soft)", color: "var(--color-danger)", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

      {(editingId || showCreate) && (
        <div style={{ background: "var(--color-surface-muted)", border: "1px solid var(--color-border)", borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{editingId ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>الاسم بالإنجليزية</label>
              <input style={inputStyle} value={draft.name_en} onChange={(e) => setDraft({ ...draft, name_en: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>الاسم بالعربية</label>
              <input style={inputStyle} value={draft.name_ar} onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })} dir="rtl" />
            </div>
            <div>
              <label style={labelStyle}>الاسم بالتركية</label>
              <input style={inputStyle} value={draft.name_tr} onChange={(e) => setDraft({ ...draft, name_tr: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>الأيقونة</label>
              <input style={inputStyle} value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} placeholder="emoji" />
            </div>
            <div>
              <label style={labelStyle}>الترتيب</label>
              <input style={inputStyle} type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} />
            </div>
            <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} style={{ marginLeft: 6 }} />
                مفعّل
              </label>
            </div>
            <div />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={btnPrimary}>{saving ? "..." : "حفظ"}</button>
            <button onClick={cancel} style={btnSecondary}>إلغاء</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>جارٍ التحميل...</div>
      ) : specialties.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>لا توجد تصنيفات</div>
      ) : (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--color-surface-muted)" }}>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>الأيقونة</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>الاسم (EN)</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>الاسم (AR)</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>الاسم (TR)</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>الترتيب</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>الحالة</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {specialties.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "10px 14px", fontSize: 20 }}>{s.icon ?? "—"}</td>
                  <td style={{ padding: "10px 14px" }}>{s.name_en}</td>
                  <td style={{ padding: "10px 14px" }} dir="rtl">{s.name_ar}</td>
                  <td style={{ padding: "10px 14px" }}>{s.name_tr}</td>
                  <td style={{ padding: "10px 14px" }}>{s.sort_order}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: s.is_active ? "var(--color-success-soft)" : "var(--color-danger-soft)", color: s.is_active ? "var(--color-success)" : "var(--color-danger)" }}>
                      {s.is_active ? "مفعّل" : "معطّل"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => startEdit(s)} style={{ padding: "4px 10px", background: "var(--color-primary-soft)", color: "var(--color-primary)", border: "1px solid var(--color-border)", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>تعديل</button>
                      <button onClick={() => handleDelete(s.id)} disabled={saving} style={btnDanger}>حذف</button>
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
