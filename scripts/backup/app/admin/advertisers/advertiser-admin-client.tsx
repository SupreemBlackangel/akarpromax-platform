"use client";
/* eslint-disable @next/next/no-img-element -- Advertiser artwork and logos may be managed runtime URLs. */

import { type DragEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PERMISSIONS } from "@/src/constants/permissions";

type Identity = {
  email: string | null;
  displayName: string;
  role: string;
  countryCode: string | null;
  permissions: string[];
};

type Advertiser = {
  id: string;
  countryCode: string;
  nameAr: string;
  nameEn: string;
  nameTr: string;
  tier: string;
  status: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  bannerUrl: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  placements: string[];
  startAt: string | null;
  endAt: string | null;
  priority: number;
  impressions: number;
  clicks: number;
};

type AccessUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  countryCode: string | null;
  status: string;
};

type CampaignForm = Omit<Advertiser, "id" | "impressions" | "clicks"> & { id?: string };

const countries = [
  ["om", "عُمان"], ["sa", "السعودية"], ["ae", "الإمارات"], ["qa", "قطر"],
  ["kw", "الكويت"], ["bh", "البحرين"], ["eg", "مصر"], ["jo", "الأردن"],
  ["iq", "العراق"], ["lb", "لبنان"], ["ps", "فلسطين"], ["sy", "سوريا"],
  ["ye", "اليمن"], ["ma", "المغرب"], ["dz", "الجزائر"], ["tn", "تونس"],
  ["ly", "ليبيا"], ["sd", "السودان"], ["so", "الصومال"], ["dj", "جيبوتي"],
  ["mr", "موريتانيا"], ["km", "جزر القمر"], ["tr", "تركيا"],
];

const roleLabels: Record<string, string> = {
  viewer: "مستخدم مشاهدة",
  analyst: "محلل التقارير",
  content_editor: "محرر المعلنين",
  service_provider: "مزود خدمات",
  service_supervisor: "مشرف خدمات",
  country_manager: "مدير دولة",
  ad_manager: "مدير الإعلانات",
  sponsor_admin: "مدير المعلنين",
  super_admin: "المدير العام",
};

const bannerPresets = [
  ["/sponsors/oman-gold.webp", "الهوية الذهبية — عُمان"],
  ["/sponsors/saudi-emerald.webp", "الهوية الخضراء — السعودية"],
  ["/sponsors/turkiye-crimson.webp", "الهوية الحمراء — تركيا"],
  ["/sponsors/arab-blue.webp", "الهوية الزرقاء — الأسواق العربية"],
];

const emptyCampaign: CampaignForm = {
  countryCode: "om",
  nameAr: "",
  nameEn: "",
  nameTr: "",
  tier: "exclusive",
  status: "draft",
  websiteUrl: "",
  logoUrl: "",
  bannerUrl: "/sponsors/oman-gold.webp",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  placements: ["header", "content", "footer"],
  startAt: "",
  endAt: "",
  priority: 100,
};

function countryName(code: string) {
  return countries.find(([id]) => id === code.toLowerCase())?.[1] ?? code.toUpperCase();
}

function statusLabel(status: string) {
  return ({ active: "نشط", draft: "مسودة", paused: "متوقف", expired: "منتهي", archived: "مؤرشف" } as Record<string, string>)[status] ?? status;
}

export default function AdvertiserAdminClient({
  initialUser,
  initialAction,
}: {
  initialUser: { email: string; displayName: string };
  initialAction?: "new" | "edit";
}) {
  const [identity, setIdentity] = useState<Identity>({
    email: initialUser.email,
    displayName: initialUser.displayName,
    role: "viewer",
    countryCode: null,
    permissions: [],
  });
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);
  const [activeView, setActiveView] = useState<"campaigns" | "analytics" | "access">("campaigns");
  const [form, setForm] = useState<CampaignForm>(emptyCampaign);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [accessForm, setAccessForm] = useState({
    email: "",
    displayName: "",
    role: "country_manager",
    countryCode: "om",
    status: "active",
  });

  const canEdit = identity.permissions.includes(PERMISSIONS.ADVERTISERS_CREATE) || identity.permissions.includes(PERMISSIONS.ADVERTISERS_UPDATE);
  const canPublish = identity.permissions.includes(PERMISSIONS.ADVERTISERS_APPROVE);
  const canReadAccess = identity.permissions.includes(PERMISSIONS.USERS_VIEW);
  const canWriteAccess = identity.permissions.includes(PERMISSIONS.USERS_CREATE);

  const loadAdvertisers = useCallback(async () => {
    const response = await fetch("/api/advertisers?admin=1", { cache: "no-store" });
    if (!response.ok) throw new Error("تعذر تحميل بيانات المعلنين");
    const data = await response.json();
    setIdentity(data.identity);
    setAdvertisers(data.advertisers);
  }, []);

  const loadAccess = useCallback(async () => {
    const response = await fetch("/api/advertiser-access", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setAccessUsers(data.users);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([loadAdvertisers(), loadAccess()])
        .then(() => {
          if (initialAction === "new" && canEdit) startCreate();
        })
        .catch((error) => setMessage(error instanceof Error ? error.message : "حدث خطأ غير متوقع"))
        .finally(() => setBusy(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAccess, loadAdvertisers, initialAction]);

  const totals = useMemo(() => ({
    active: advertisers.filter((item) => item.status === "active").length,
    countries: new Set(advertisers.map((item) => item.countryCode)).size,
    impressions: advertisers.reduce((sum, item) => sum + item.impressions, 0),
    clicks: advertisers.reduce((sum, item) => sum + item.clicks, 0),
  }), [advertisers]);

  function startCreate() {
    setForm({
      ...emptyCampaign,
      countryCode: identity.countryCode?.toLowerCase() || "om",
    });
    setEditing(true);
    setMessage("");
  }

  function startEdit(advertiser: Advertiser) {
    setForm({ ...advertiser });
    setEditing(true);
    setMessage("");
  }

  function updatePlacement(placement: string) {
    setForm((current) => ({
      ...current,
      placements: current.placements.includes(placement)
        ? current.placements.filter((item) => item !== placement)
        : [...current.placements, placement],
    }));
  }

  async function saveCampaign(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/advertisers", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الحملة");
      await loadAdvertisers();
      setEditing(false);
      setMessage("تم حفظ حملة المعلن بنجاح.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الحملة");
    } finally {
      setBusy(false);
    }
  }

  async function archiveAdvertiser(id: string) {
    if (!window.confirm("هل تريد أرشفة هذا المعلن؟")) return;
    setBusy(true);
    const response = await fetch(`/api/advertisers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) {
      await loadAdvertisers();
      setMessage("تمت أرشفة المعلن.");
    } else {
      setMessage("تعذر أرشفة المعلن.");
    }
    setBusy(false);
  }

  async function saveAccess(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/advertiser-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accessForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الصلاحية");
      await loadAccess();
      setAccessForm({ email: "", displayName: "", role: "country_manager", countryCode: "om", status: "active" });
      setMessage("تم تحديث صلاحيات المستخدم.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الصلاحية");
    } finally {
      setBusy(false);
    }
  }

  const availableViews = [
    { id: "campaigns" as const, icon: "▣", label: "حملات المعلنين", show: true },
    { id: "analytics" as const, icon: "↗", label: "الأداء والتقارير", show: identity.permissions.includes(PERMISSIONS.REPORTS_VIEW) },
    { id: "access" as const, icon: "♙", label: "المستخدمون والصلاحيات", show: canReadAccess },
  ].filter((item) => item.show);

  if (!busy && !identity.permissions.includes(PERMISSIONS.ADVERTISERS_VIEW)) {
    return (
      <div className="advertiser-admin-denied" dir="rtl">
        <div><span>⚿</span><h1>لا توجد صلاحية للدخول</h1><p>حسابك مسجل، لكن لم يتم منحه دورًا في نظام المعلنين.</p><Link href="/">العودة إلى المنصة</Link></div>
      </div>
    );
  }

  return (
    <>
      <header className="advertiser-admin-header">
        <div><p>إدارة الشراكات التجارية</p><h1>نظام المعلنين حسب الدولة</h1></div>
        <div className="admin-header-actions"><Link href="/" target="_blank">معاينة الموقع ↗</Link>{canEdit && <button type="button" onClick={startCreate}>+ معلن جديد</button>}</div>
      </header>

      <nav className="admin-subnav" aria-label="أقسام نظام المعلنين">
        {availableViews.map((item) => (
          <button className={activeView === item.id ? "active" : ""} type="button" onClick={() => setActiveView(item.id)} key={item.id}>
            <span aria-hidden="true">{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>

        {message && <div className="admin-message" role="status">{message}<button type="button" onClick={() => setMessage("")}>×</button></div>}

        <div className="admin-stat-grid">
          <article><span>المعلنون النشطون</span><strong>{totals.active}</strong><small>حملة منشورة</small></article>
          <article><span>الأسواق المغطاة</span><strong>{totals.countries}</strong><small>دولة</small></article>
          <article><span>مرات الظهور</span><strong>{totals.impressions.toLocaleString("ar")}</strong><small>جميع المواضع</small></article>
          <article><span>النقرات</span><strong>{totals.clicks.toLocaleString("ar")}</strong><small>تفاعل مباشر</small></article>
        </div>

        {activeView === "campaigns" && (
          <section className="admin-panel">
            <div className="admin-panel-title"><div><p>الحملات</p><h2>المعلنون المسجلون</h2></div><span>{advertisers.length} سجل</span></div>
            <div className="advertiser-admin-list">
              {advertisers.map((advertiser) => (
                <article key={advertiser.id}>
                  <div className="admin-campaign-art" style={{ backgroundImage: `url("${advertiser.bannerUrl}")` }}>
                    {advertiser.logoUrl
                      ? <img src={advertiser.logoUrl} alt={`شعار ${advertiser.nameAr}`} />
                      : <span aria-hidden="true">{advertiser.nameAr.slice(0, 1)}</span>}
                  </div>
                  <div className="admin-advertiser-main"><span className={`admin-status status-${advertiser.status}`}>{statusLabel(advertiser.status)}</span><strong>{advertiser.nameAr}</strong><small>{countryName(advertiser.countryCode)} • {advertiser.tier}</small></div>
                  <div><small>المواضع</small><strong>{advertiser.placements.length}</strong></div>
                  <div><small>الظهور / النقر</small><strong>{advertiser.impressions} / {advertiser.clicks}</strong></div>
                  <div className="admin-row-actions">{canEdit && <button type="button" onClick={() => startEdit(advertiser)}>تعديل</button>}{canEdit && <button className="danger" type="button" onClick={() => archiveAdvertiser(advertiser.id)}>أرشفة</button>}</div>
                </article>
              ))}
              {!advertisers.length && <div className="admin-empty"><span>◇</span><strong>لا توجد حملات بعد</strong><p>أضف أول معلن وحدد الدولة وفترة الظهور والمواضع.</p>{canEdit && <button type="button" onClick={startCreate}>إضافة أول معلن</button>}</div>}
            </div>
          </section>
        )}

        {activeView === "analytics" && (
          <section className="admin-panel">
            <div className="admin-panel-title"><div><p>التحليلات</p><h2>أداء الحملات حسب الدولة</h2></div></div>
            <div className="admin-analytics-list">
              {advertisers.map((advertiser) => {
                const rate = advertiser.impressions ? ((advertiser.clicks / advertiser.impressions) * 100).toFixed(1) : "0.0";
                return <article key={advertiser.id}><div><strong>{advertiser.nameAr}</strong><small>{countryName(advertiser.countryCode)}</small></div><span>{advertiser.impressions.toLocaleString("ar")} ظهور</span><span>{advertiser.clicks.toLocaleString("ar")} نقرة</span><b>{rate}% CTR</b></article>;
              })}
            </div>
          </section>
        )}

        {activeView === "access" && canReadAccess && (
          <section className="admin-access-grid">
            <div className="admin-panel">
              <div className="admin-panel-title"><div><p>الوصول</p><h2>المستخدمون والأدوار</h2></div></div>
              <div className="admin-access-list">{accessUsers.map((user) => <article key={user.id}><span>{(user.displayName || user.email).slice(0, 1).toUpperCase()}</span><div><strong>{user.displayName || user.email}</strong><small>{user.email}</small></div><b>{roleLabels[user.role] ?? user.role}{user.countryCode ? ` • ${countryName(user.countryCode)}` : ""}</b><i className={user.status}>{user.status === "active" ? "نشط" : "معطل"}</i></article>)}</div>
            </div>
            {canWriteAccess && (
              <form className="admin-panel admin-access-form" onSubmit={saveAccess}>
                <div className="admin-panel-title"><div><p>تعيين دور</p><h2>صلاحية مستخدم</h2></div></div>
                <label>الاسم<input value={accessForm.displayName} onChange={(event) => setAccessForm({ ...accessForm, displayName: event.target.value })} /></label>
                <label>البريد الإلكتروني<input type="email" required value={accessForm.email} onChange={(event) => setAccessForm({ ...accessForm, email: event.target.value })} /></label>
                <label>الدور<select value={accessForm.role} onChange={(event) => setAccessForm({ ...accessForm, role: event.target.value })}>{Object.entries(roleLabels).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
                {accessForm.role === "country_manager" && <label>الدولة<select value={accessForm.countryCode} onChange={(event) => setAccessForm({ ...accessForm, countryCode: event.target.value })}>{countries.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>}
                <label>الحالة<select value={accessForm.status} onChange={(event) => setAccessForm({ ...accessForm, status: event.target.value })}><option value="active">نشط</option><option value="disabled">معطل</option></select></label>
                <button className="admin-primary" type="submit" disabled={busy}>حفظ الصلاحية</button>
              </form>
            )}
          </section>
        )}

      {editing && (
        <div className="admin-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setEditing(false); }}>
          <form className="admin-dialog" onSubmit={saveCampaign}>
            <div className="admin-dialog-head"><div><p>{form.id ? "تعديل الحملة" : "حملة جديدة"}</p><h2>بيانات المعلن</h2></div><button type="button" aria-label="إغلاق" onClick={() => setEditing(false)}>×</button></div>
            {message && <div className="admin-dialog-message" role="status">{message}</div>}
            <div className="admin-form-grid">
              <label>الدولة<select required value={form.countryCode} disabled={Boolean(identity.countryCode)} onChange={(event) => setForm({ ...form, countryCode: event.target.value })}>{countries.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
              <label>الفئة<select value={form.tier} onChange={(event) => setForm({ ...form, tier: event.target.value })}><option value="exclusive">المعلن الحصري</option><option value="gold">المعلن الذهبي</option><option value="standard">معلن مشارك</option></select></label>
              <label>الاسم بالعربية<input required value={form.nameAr} onChange={(event) => setForm({ ...form, nameAr: event.target.value })} /></label>
              <label>الاسم بالإنجليزية<input required dir="ltr" value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} /></label>
              <label>الاسم بالتركية<input required dir="ltr" value={form.nameTr} onChange={(event) => setForm({ ...form, nameTr: event.target.value })} /></label>
              <label>الموقع الإلكتروني<input type="url" dir="ltr" value={form.websiteUrl || ""} onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })} /></label>
              <label>شعار المعلن (رابط مباشر)<input dir="ltr" placeholder="https://example.com/logo.png" value={form.logoUrl || ""} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} /></label>
              <label>صورة خلفية شريط المعلن<select value={form.bannerUrl} onChange={(event) => setForm({ ...form, bannerUrl: event.target.value })}>{bannerPresets.map(([url, label]) => <option value={url} key={url}>{label}</option>)}</select></label>
              <label>اسم مسؤول التواصل<input value={form.contactName || ""} onChange={(event) => setForm({ ...form, contactName: event.target.value })} /></label>
              <label>بريد التواصل<input type="email" dir="ltr" value={form.contactEmail || ""} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} /></label>
              <label>هاتف التواصل<input dir="ltr" value={form.contactPhone || ""} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} /></label>
              <label>الأولوية<input type="number" min="1" max="999" value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })} /></label>
              <label>بداية الحملة<input type="date" value={(form.startAt || "").slice(0, 10)} onChange={(event) => setForm({ ...form, startAt: event.target.value })} /></label>
              <label>نهاية الحملة<input type="date" value={(form.endAt || "").slice(0, 10)} onChange={(event) => setForm({ ...form, endAt: event.target.value })} /></label>
              <label>الحالة<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">مسودة</option>{canPublish && <option value="active">نشط</option>}<option value="paused">متوقف</option><option value="expired">منتهي</option></select></label>
            </div>
            <fieldset><legend>مواضع الظهور</legend>{[["header", "أسفل شريط الأخبار"], ["content", "داخل المحتوى"], ["footer", "الفوتر"]].map(([id, label]) => <label key={id}><input type="checkbox" checked={form.placements.includes(id)} onChange={() => updatePlacement(id)} />{label}</label>)}</fieldset>
            <div className="admin-banner-preview" style={{ backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.96), rgba(255,255,255,.15)), url("${form.bannerUrl}")` }}>
              <div className="admin-campaign-preview-brand">
                {form.logoUrl
                  ? <img className="admin-campaign-preview-logo" src={form.logoUrl} alt={`شعار ${form.nameAr || "المعلن"}`} />
                  : <span className="admin-campaign-preview-fallback" aria-hidden="true">{(form.nameAr || "م").slice(0, 1)}</span>}
                <div><small>معاينة المعلن</small><strong>{form.nameAr || "اسم المعلن"}</strong><span>{countryName(form.countryCode)}</span></div>
              </div>
            </div>
            <div className="admin-dialog-actions"><button type="button" onClick={() => setEditing(false)}>إلغاء</button><button className="admin-primary" type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ الحملة"}</button></div>
          </form>
        </div>
      )}
    </>
  );
}
