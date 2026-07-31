"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PERMISSIONS } from "@/src/constants/permissions";
import { roleNameAr, type SponsorRole } from "@/src/constants/roles";

type Identity = {
  email: string | null;
  displayName: string;
  role: string;
  countryCode: string | null;
  permissions: string[];
};

type AccessUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  countryCode: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const countries = [
  ["om", "عُمان"], ["sa", "السعودية"], ["ae", "الإمارات"], ["qa", "قطر"],
  ["kw", "الكويت"], ["bh", "البحرين"], ["eg", "مصر"], ["jo", "الأردن"],
  ["iq", "العراق"], ["lb", "لبنان"], ["ps", "فلسطين"], ["sy", "سوريا"],
  ["ye", "اليمن"], ["ma", "المغرب"], ["dz", "الجزائر"], ["tn", "تونس"],
  ["ly", "ليبيا"], ["sd", "السودان"], ["so", "الصومال"], ["dj", "جيبوتي"],
  ["mr", "موريتانيا"], ["km", "جزر القمر"], ["tr", "تركيا"],
];

const assignableRoles: SponsorRole[] = [
  "viewer", "analyst", "content_editor", "country_manager",
  "ad_manager", "sponsor_admin", "sponsor_manager", "super_admin",
];

const emptyForm = {
  email: "",
  displayName: "",
  role: "country_manager" as SponsorRole,
  countryCode: "om",
  status: "active",
};

export default function UsersAdminClient({
  initialUser,
}: {
  initialUser: { email: string; displayName: string };
}) {
  const [identity, setIdentity] = useState<Identity>({
    email: initialUser.email,
    displayName: initialUser.displayName,
    role: "viewer",
    countryCode: null,
    permissions: [],
  });
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  const canWrite = identity.permissions.includes(PERMISSIONS.USERS_CREATE) || identity.permissions.includes(PERMISSIONS.USERS_UPDATE);
  const canDelete = identity.permissions.includes(PERMISSIONS.USERS_DELETE);

  const load = useCallback(async () => {
    const response = await fetch("/api/sponsor-access", { cache: "no-store" });
    if (!response.ok) throw new Error("تعذر تحميل قائمة المستخدمين");
    const data = await response.json();
    setIdentity(data.identity);
    setUsers(data.users);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
        .catch((error) => setMessage(error instanceof Error ? error.message : "حدث خطأ غير متوقع"))
        .finally(() => setBusy(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/sponsor-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حفظ المستخدم");
      await load();
      setForm(emptyForm);
      setMessage("تم حفظ المستخدم بنجاح.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ المستخدم");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: string) {
    if (!window.confirm("هل تريد إزالة هذا المستخدم نهائيًا؟")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/sponsor-access?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "تعذر إزالة المستخدم");
      }
      await load();
      setMessage("تمت إزالة المستخدم.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إزالة المستخدم");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sponsor-admin" dir="rtl">
      <aside className="sponsor-admin-sidebar">
        <Link className="admin-brand" href="/admin"><span>A</span><div><strong>عقار بروماكس</strong><small>Admin Control</small></div></Link>
        <nav aria-label="لوحة التحكم">
          <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 42, padding: "9px 12px", borderRadius: 9, color: "#6b7b93", textDecoration: "none" }}><span style={{ width: 20, color: "#1769ff", fontSize: 16, textAlign: "center" }}>≡</span>لوحة الإحصاءات</Link>
        </nav>
        <div className="admin-user-card">
          <span>{identity.displayName.slice(0, 1).toUpperCase()}</span>
          <div><strong>{identity.displayName}</strong><small>{roleNameAr(identity.role)}</small></div>
        </div>
      </aside>

      <section className="sponsor-admin-canvas">
        <header className="sponsor-admin-header">
          <div><p>الوصول والصلاحيات</p><h1>إدارة المستخدمين</h1></div>
          <div className="admin-header-actions"><Link href="/" target="_blank">معاينة الموقع ↗</Link></div>
        </header>

        {message && <div className="admin-message" role="status">{message}<button type="button" onClick={() => setMessage("")}>×</button></div>}

        <div className="admin-stat-grid">
          <article><span>إجمالي المستخدمين</span><strong>{users.length.toLocaleString("ar-EG")}</strong><small>حساب مسجل</small></article>
          <article><span>نشطون</span><strong>{users.filter((user) => user.status === "active").length.toLocaleString("ar-EG")}</strong><small>حساب مفعّل</small></article>
          <article><span>مديرو الدول</span><strong>{users.filter((user) => user.role === "country_manager").length.toLocaleString("ar-EG")}</strong><small>دور إقليمي</small></article>
          <article><span>مدراء عامون</span><strong>{users.filter((user) => user.role === "super_admin").length.toLocaleString("ar-EG")}</strong><small>صلاحية شاملة</small></article>
        </div>

        <div className="admin-access-grid">
          <div className="admin-panel">
            <div className="admin-panel-title"><div><p>الحسابات</p><h2>مستخدمو نظام الرعاة</h2></div><span>{users.length} سجل</span></div>
            <div className="admin-access-list">
              {users.map((user) => {
                const countryCode = user.countryCode;
                const country = countryCode ? countries.find(([id]) => id === countryCode.toLowerCase())?.[1] ?? countryCode.toUpperCase() : null;
                return (
                <article key={user.id}>
                  <span>{(user.displayName || user.email).slice(0, 1).toUpperCase()}</span>
                  <div><strong>{user.displayName || user.email}</strong><small>{user.email}</small></div>
                  <b>{roleNameAr(user.role)}{country ? ` • ${country}` : ""}</b>
                  <i className={user.status}>{user.status === "active" ? "نشط" : "معطل"}</i>
                  <div className="admin-row-actions">
                    {canWrite && <button type="button" onClick={() => { setForm({ email: user.email, displayName: user.displayName || "", role: user.role as SponsorRole, countryCode: user.countryCode?.toLowerCase() || "om", status: user.status }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>تعديل</button>}
                    {canDelete && <button className="danger" type="button" onClick={() => deleteUser(user.id)}>إزالة</button>}
                  </div>
                </article>
                );
              })}
              {!users.length && <div className="admin-empty"><span>◇</span><strong>لا يوجد مستخدمون بعد</strong></div>}
            </div>
          </div>

          {canWrite && (
            <form className="admin-panel admin-access-form" onSubmit={saveUser}>
              <div className="admin-panel-title"><div><p>إضافة / تعديل</p><h2>بيانات المستخدم</h2></div></div>
              <label>الاسم<input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label>
              <label>البريد الإلكتروني<input type="email" required dir="ltr" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
              <label>الدور<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as SponsorRole })}>{assignableRoles.map((id) => <option value={id} key={id}>{roleNameAr(id)}</option>)}</select></label>
              {form.role === "country_manager" && (
                <label>الدولة<select value={form.countryCode} onChange={(event) => setForm({ ...form, countryCode: event.target.value })}>{countries.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
              )}
              <label>الحالة<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">نشط</option><option value="disabled">معطل</option></select></label>
              <button className="admin-primary" type="submit" disabled={busy}>حفظ المستخدم</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
