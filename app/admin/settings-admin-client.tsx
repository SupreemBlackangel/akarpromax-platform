"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { roleNameAr } from "@/src/constants/roles";

type Identity = {
  email: string | null;
  displayName: string;
  role: string;
  countryCode: string | null;
  permissions: string[];
};

type Plan = {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxBranches: number;
  maxUsers: number;
  maxProperties: number;
  maxAds: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
};

const emptyPlan = {
  nameAr: "",
  nameEn: "",
  code: "",
  priceMonthly: 0,
  priceYearly: 0,
  currency: "OMR",
  maxBranches: 0,
  maxUsers: 0,
  maxProperties: 0,
  maxAds: 0,
  features: "",
  isActive: true,
  sortOrder: 0,
};

export default function SettingsAdminClient({
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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState(emptyPlan);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [contextResponse, plansResponse] = await Promise.all([
      fetch("/api/user-context", { cache: "no-store" }),
      fetch("/api/sponsor-plans", { cache: "no-store" }),
    ]);
    if (!plansResponse.ok) throw new Error("تعذر تحميل الخطط");
    const context = await contextResponse.json();
    const data = await plansResponse.json();
    setIdentity(context);
    setPlans(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
        .catch((error) => setMessage(error instanceof Error ? error.message : "حدث خطأ غير متوقع"))
        .finally(() => setBusy(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function startCreate() {
    setForm(emptyPlan);
    setEditingId(null);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(plan: Plan) {
    setForm({
      nameAr: plan.nameAr,
      nameEn: plan.nameEn,
      code: plan.code,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      currency: plan.currency,
      maxBranches: plan.maxBranches,
      maxUsers: plan.maxUsers,
      maxProperties: plan.maxProperties,
      maxAds: plan.maxAds,
      features: plan.features.join("\n"),
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    });
    setEditingId(plan.id);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function savePlan(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const payload = {
        ...form,
        features: form.features.split("\n").map((item) => item.trim()).filter(Boolean),
      };
      const response = await fetch("/api/sponsor-plans", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الخطة");
      await load();
      setForm(emptyPlan);
      setEditingId(null);
      setMessage("تم حفظ الخطة بنجاح.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الخطة");
    } finally {
      setBusy(false);
    }
  }

  async function togglePlan(plan: Plan) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/sponsor-plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: plan.id, isActive: !plan.isActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحديث الخطة");
      await load();
      setMessage(plan.isActive ? "تم تعطيل الخطة." : "تم تفعيل الخطة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحديث الخطة");
    } finally {
      setBusy(false);
    }
  }

  async function deletePlan(plan: Plan) {
    if (!window.confirm(`هل تريد حذف خطة «${plan.nameAr}»؟`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/sponsor-plans?id=${encodeURIComponent(plan.id)}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "تعذر حذف الخطة");
      }
      await load();
      setMessage("تم حذف الخطة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حذف الخطة");
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
          <div><p>إعدادات النظام</p><h1>خطط الاشتراك</h1></div>
          <div className="admin-header-actions"><button type="button" onClick={startCreate}>+ خطة جديدة</button><Link href="/" target="_blank">معاينة الموقع ↗</Link></div>
        </header>

        {message && <div className="admin-message" role="status">{message}<button type="button" onClick={() => setMessage("")}>×</button></div>}

        <div className="admin-stat-grid">
          <article><span>الخطط المتاحة</span><strong>{plans.length.toLocaleString("ar-EG")}</strong><small>مخطط اشتراك</small></article>
          <article><span>خطط مفعّلة</span><strong>{plans.filter((plan) => plan.isActive).length.toLocaleString("ar-EG")}</strong><small>قابلة للبيع</small></article>
          <article><span>أعلى سعر شهري</span><strong>{Math.max(0, ...plans.map((plan) => plan.priceMonthly)).toLocaleString("ar-EG")}</strong><small>بالريال العماني</small></article>
          <article><span>أدنى سعر شهري</span><strong>{Math.min(0, ...plans.map((plan) => plan.priceMonthly)).toLocaleString("ar-EG")}</strong><small>بالريال العماني</small></article>
        </div>

        <div className="admin-settings-grid">
          <section className="admin-panel">
            <div className="admin-panel-title"><div><p>الخطط</p><h2>خطط اشتراك الرعاة</h2></div><span>{plans.length} خطة</span></div>
            <div className="admin-plans-list">
              {plans.map((plan) => (
                <article key={plan.id}>
                  <div className="admin-plan-head">
                    <div><strong>{plan.nameAr}</strong><small>{plan.nameEn} • {plan.code}</small></div>
                    <b>{plan.priceMonthly.toLocaleString("ar-EG")} <i>{plan.currency}/شهريًا</i></b>
                  </div>
                  <div className="admin-plan-limits">
                    <span><b>{plan.maxBranches}</b> فروع</span>
                    <span><b>{plan.maxUsers}</b> مستخدمون</span>
                    <span><b>{plan.maxProperties}</b> عقارات</span>
                    <span><b>{plan.maxAds}</b> إعلانات</span>
                  </div>
                  <div className="admin-plan-features">
                    {plan.features.map((feature) => <span key={feature}>✓ {feature}</span>)}
                  </div>
                  <div className="admin-plan-foot">
                    <i className={plan.isActive ? "active" : "disabled"}>{plan.isActive ? "مفعّلة" : "معطّلة"}</i>
                    <div className="admin-row-actions">
                      <button type="button" onClick={() => togglePlan(plan)}>{plan.isActive ? "تعطيل" : "تفعيل"}</button>
                      <button type="button" onClick={() => startEdit(plan)}>تعديل</button>
                      <button className="danger" type="button" onClick={() => deletePlan(plan)}>حذف</button>
                    </div>
                  </div>
                </article>
              ))}
              {!plans.length && <div className="admin-empty"><span>◇</span><strong>لا توجد خطط</strong><p>أضف أول خطة اشتراك.</p></div>}
            </div>
          </section>

          <form className="admin-panel admin-plan-form" onSubmit={savePlan}>
            <div className="admin-panel-title"><div><p>{editingId ? "تعديل خطة" : "خطة جديدة"}</p><h2>بيانات الخطة</h2></div></div>
            <label>الاسم بالعربية<input required value={form.nameAr} onChange={(event) => setForm({ ...form, nameAr: event.target.value })} /></label>
            <label>الاسم بالإنجليزية<input required dir="ltr" value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} /></label>
            <label>الكود<input required dir="ltr" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
            <div className="admin-form-grid">
              <label>السعر الشهري<input type="number" min="0" value={form.priceMonthly} onChange={(event) => setForm({ ...form, priceMonthly: Number(event.target.value) })} /></label>
              <label>السعر السنوي<input type="number" min="0" value={form.priceYearly} onChange={(event) => setForm({ ...form, priceYearly: Number(event.target.value) })} /></label>
              <label>عدد الفروع<input type="number" min="0" value={form.maxBranches} onChange={(event) => setForm({ ...form, maxBranches: Number(event.target.value) })} /></label>
              <label>عدد المستخدمين<input type="number" min="0" value={form.maxUsers} onChange={(event) => setForm({ ...form, maxUsers: Number(event.target.value) })} /></label>
              <label>عدد العقارات<input type="number" min="0" value={form.maxProperties} onChange={(event) => setForm({ ...form, maxProperties: Number(event.target.value) })} /></label>
              <label>عدد الإعلانات<input type="number" min="0" value={form.maxAds} onChange={(event) => setForm({ ...form, maxAds: Number(event.target.value) })} /></label>
            </div>
            <label>المميزات (سطر لكل ميزة)<textarea rows={4} value={form.features} onChange={(event) => setForm({ ...form, features: event.target.value })} /></label>
            <label className="admin-check-line"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />خطة مفعّلة</label>
            <button className="admin-primary" type="submit" disabled={busy}>{editingId ? "حفظ التعديلات" : "إنشاء الخطة"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
