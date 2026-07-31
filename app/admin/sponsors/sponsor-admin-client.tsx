"use client";
/* eslint-disable @next/next/no-img-element -- Sponsor artwork and logos may be managed runtime URLs. */

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

type Sponsor = {
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

type CampaignForm = Omit<Sponsor, "id" | "impressions" | "clicks"> & { id?: string };

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
  content_editor: "محرر الرعاة",
  country_manager: "مدير دولة",
  ad_manager: "مدير الإعلانات",
  sponsor_admin: "مدير الرعاة",
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

export default function SponsorAdminClient({
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
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);
  const [activeView, setActiveView] = useState<"campaigns" | "analytics" | "access">("campaigns");
  const [form, setForm] = useState<CampaignForm>(emptyCampaign);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [message, setMessage] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [accessForm, setAccessForm] = useState({
    email: "",
    displayName: "",
    role: "country_manager",
    countryCode: "om",
    status: "active",
  });

  const canEdit = identity.permissions.includes(PERMISSIONS.SPONSORS_CREATE) || identity.permissions.includes(PERMISSIONS.SPONSORS_UPDATE);
  const canPublish = identity.permissions.includes(PERMISSIONS.SPONSORS_APPROVE);
  const canReadAccess = identity.permissions.includes(PERMISSIONS.USERS_VIEW);
  const canWriteAccess = identity.permissions.includes(PERMISSIONS.USERS_CREATE);

  const loadSponsors = useCallback(async () => {
    const response = await fetch("/api/sponsors?admin=1", { cache: "no-store" });
    if (!response.ok) throw new Error("تعذر تحميل بيانات الرعاة");
    const data = await response.json();
    setIdentity(data.identity);
    setSponsors(data.sponsors);
  }, []);

  const loadAccess = useCallback(async () => {
    const response = await fetch("/api/sponsor-access", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setAccessUsers(data.users);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([loadSponsors(), loadAccess()])
        .then(() => {
          if (initialAction === "new" && canEdit) startCreate();
        })
        .catch((error) => setMessage(error instanceof Error ? error.message : "حدث خطأ غير متوقع"))
        .finally(() => setBusy(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAccess, loadSponsors, initialAction]);

  const totals = useMemo(() => ({
    active: sponsors.filter((item) => item.status === "active").length,
    countries: new Set(sponsors.map((item) => item.countryCode)).size,
    impressions: sponsors.reduce((sum, item) => sum + item.impressions, 0),
    clicks: sponsors.reduce((sum, item) => sum + item.clicks, 0),
  }), [sponsors]);

  function startCreate() {
    setForm({
      ...emptyCampaign,
      countryCode: identity.countryCode?.toLowerCase() || "om",
    });
    setEditing(true);
    setMessage("");
  }

  function startEdit(sponsor: Sponsor) {
    setForm({ ...sponsor });
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

  async function uploadSponsorLogo(file: File | undefined) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    const validFileType = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type) ||
      ["png", "jpg", "jpeg", "webp"].includes(extension || "");
    if (!validFileType) {
      setMessage("صيغة الشعار غير مدعومة. استخدم PNG أو JPG أو WebP.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setMessage("حجم الشعار يجب ألا يتجاوز 4 ميغابايت.");
      return;
    }

    setLogoUploading(true);
    setMessage("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      if (form.id) payload.append("sponsorId", form.id);
      const response = await fetch("/api/sponsor-assets", { method: "POST", body: payload });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر رفع الشعار");
      const assetResponse = await fetch(data.url, { cache: "no-store" });
      if (!assetResponse.ok || !assetResponse.headers.get("content-type")?.startsWith("image/")) {
        throw new Error("تم رفع الملف لكن تعذر التحقق من الصورة. حاول مرة أخرى.");
      }
      setForm((current) => ({ ...current, logoUrl: data.url }));
      if (data.attached) await loadSponsors();
      setMessage(data.attached
        ? `تم رفع الشعار «${data.name}» وربطه بالحملة تلقائيًا.`
        : `تم رفع الشعار «${data.name}» بنجاح. احفظ الحملة لإكمال الربط.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر رفع الشعار");
    } finally {
      setLogoUploading(false);
    }
  }

  function handleLogoDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setLogoDragActive(false);
    void uploadSponsorLogo(event.dataTransfer.files[0]);
  }

  async function saveCampaign(event: FormEvent) {
    event.preventDefault();
    if (logoUploading) {
      setMessage("انتظر حتى يكتمل رفع شعار الراعي قبل حفظ الحملة.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/sponsors", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الحملة");
      await loadSponsors();
      setEditing(false);
      setMessage("تم حفظ حملة الراعي بنجاح.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الحملة");
    } finally {
      setBusy(false);
    }
  }

  async function archiveSponsor(id: string) {
    if (!window.confirm("هل تريد أرشفة هذا الراعي؟")) return;
    setBusy(true);
    const response = await fetch(`/api/sponsors?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) {
      await loadSponsors();
      setMessage("تمت أرشفة الراعي.");
    } else {
      setMessage("تعذر أرشفة الراعي.");
    }
    setBusy(false);
  }

  async function saveAccess(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/sponsor-access", {
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
    { id: "campaigns" as const, icon: "▣", label: "حملات الرعاة", show: true },
    { id: "analytics" as const, icon: "↗", label: "الأداء والتقارير", show: identity.permissions.includes(PERMISSIONS.REPORTS_VIEW) },
    { id: "access" as const, icon: "♙", label: "المستخدمون والصلاحيات", show: canReadAccess },
  ].filter((item) => item.show);

  if (!busy && !identity.permissions.includes(PERMISSIONS.SPONSORS_VIEW)) {
    return (
      <main className="sponsor-admin-denied" dir="rtl">
        <div><span>⚿</span><h1>لا توجد صلاحية للدخول</h1><p>حسابك مسجل، لكن لم يتم منحه دورًا في نظام الرعاة.</p><Link href="/">العودة إلى المنصة</Link></div>
      </main>
    );
  }

  return (
    <main className="sponsor-admin" dir="rtl">
      <aside className="sponsor-admin-sidebar">
        <Link className="admin-brand" href="/"><span>A</span><div><strong>عقار بروماكس</strong><small>Sponsor Control</small></div></Link>
        <nav aria-label="إدارة الرعاة">
          {availableViews.map((item) => (
            <button className={activeView === item.id ? "active" : ""} type="button" onClick={() => setActiveView(item.id)} key={item.id}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="admin-user-card">
          <span>{identity.displayName.slice(0, 1).toUpperCase()}</span>
          <div><strong>{identity.displayName}</strong><small>{roleLabels[identity.role] ?? identity.role}{identity.countryCode ? ` • ${countryName(identity.countryCode)}` : ""}</small></div>
        </div>
      </aside>

      <section className="sponsor-admin-canvas">
        <header className="sponsor-admin-header">
          <div><p>إدارة الشراكات التجارية</p><h1>نظام الرعاة حسب الدولة</h1></div>
          <div className="admin-header-actions"><Link href="/" target="_blank">معاينة الموقع ↗</Link>{canEdit && <button type="button" onClick={startCreate}>+ راعٍ جديد</button>}</div>
        </header>

        {message && <div className="admin-message" role="status">{message}<button type="button" onClick={() => setMessage("")}>×</button></div>}

        <div className="admin-stat-grid">
          <article><span>الرعاة النشطون</span><strong>{totals.active}</strong><small>حملة منشورة</small></article>
          <article><span>الأسواق المغطاة</span><strong>{totals.countries}</strong><small>دولة</small></article>
          <article><span>مرات الظهور</span><strong>{totals.impressions.toLocaleString("ar")}</strong><small>جميع المواضع</small></article>
          <article><span>النقرات</span><strong>{totals.clicks.toLocaleString("ar")}</strong><small>تفاعل مباشر</small></article>
        </div>

        {activeView === "campaigns" && (
          <section className="admin-panel">
            <div className="admin-panel-title"><div><p>الحملات</p><h2>الرعاة المسجلون</h2></div><span>{sponsors.length} سجل</span></div>
            <div className="sponsor-admin-list">
              {sponsors.map((sponsor) => (
                <article key={sponsor.id}>
                  <div className="admin-campaign-art" style={{ backgroundImage: `url("${sponsor.bannerUrl}")` }}>
                    {sponsor.logoUrl
                      ? <img src={sponsor.logoUrl} alt={`شعار ${sponsor.nameAr}`} />
                      : <span aria-hidden="true">{sponsor.nameAr.slice(0, 1)}</span>}
                  </div>
                  <div className="admin-sponsor-main"><span className={`admin-status status-${sponsor.status}`}>{statusLabel(sponsor.status)}</span><strong>{sponsor.nameAr}</strong><small>{countryName(sponsor.countryCode)} • {sponsor.tier}</small></div>
                  <div><small>المواضع</small><strong>{sponsor.placements.length}</strong></div>
                  <div><small>الظهور / النقر</small><strong>{sponsor.impressions} / {sponsor.clicks}</strong></div>
                  <div className="admin-row-actions">{canEdit && <button type="button" onClick={() => startEdit(sponsor)}>تعديل</button>}{canEdit && <button className="danger" type="button" onClick={() => archiveSponsor(sponsor.id)}>أرشفة</button>}</div>
                </article>
              ))}
              {!sponsors.length && <div className="admin-empty"><span>◇</span><strong>لا توجد حملات بعد</strong><p>أضف أول راعٍ وحدد الدولة وفترة الظهور والمواضع.</p>{canEdit && <button type="button" onClick={startCreate}>إضافة أول راعٍ</button>}</div>}
            </div>
          </section>
        )}

        {activeView === "analytics" && (
          <section className="admin-panel">
            <div className="admin-panel-title"><div><p>التحليلات</p><h2>أداء الحملات حسب الدولة</h2></div></div>
            <div className="admin-analytics-list">
              {sponsors.map((sponsor) => {
                const rate = sponsor.impressions ? ((sponsor.clicks / sponsor.impressions) * 100).toFixed(1) : "0.0";
                return <article key={sponsor.id}><div><strong>{sponsor.nameAr}</strong><small>{countryName(sponsor.countryCode)}</small></div><span>{sponsor.impressions.toLocaleString("ar")} ظهور</span><span>{sponsor.clicks.toLocaleString("ar")} نقرة</span><b>{rate}% CTR</b></article>;
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
      </section>

      {editing && (
        <div className="admin-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setEditing(false); }}>
          <form className="admin-dialog" onSubmit={saveCampaign}>
            <div className="admin-dialog-head"><div><p>{form.id ? "تعديل الحملة" : "حملة جديدة"}</p><h2>بيانات الراعي</h2></div><button type="button" aria-label="إغلاق" onClick={() => setEditing(false)}>×</button></div>
            {message && <div className="admin-dialog-message" role="status">{message}</div>}
            <div className="admin-form-grid">
              <label>الدولة<select required value={form.countryCode} disabled={Boolean(identity.countryCode)} onChange={(event) => setForm({ ...form, countryCode: event.target.value })}>{countries.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
              <label>الفئة<select value={form.tier} onChange={(event) => setForm({ ...form, tier: event.target.value })}><option value="exclusive">الراعي الحصري</option><option value="gold">الراعي الذهبي</option><option value="standard">راعٍ مشارك</option></select></label>
              <label>الاسم بالعربية<input required value={form.nameAr} onChange={(event) => setForm({ ...form, nameAr: event.target.value })} /></label>
              <label>الاسم بالإنجليزية<input required dir="ltr" value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} /></label>
              <label>الاسم بالتركية<input required dir="ltr" value={form.nameTr} onChange={(event) => setForm({ ...form, nameTr: event.target.value })} /></label>
              <label>الموقع الإلكتروني<input type="url" dir="ltr" value={form.websiteUrl || ""} onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })} /></label>
              <div className="admin-logo-field" role="group" aria-labelledby="sponsor-logo-label">
                <span id="sponsor-logo-label">شعار الراعي</span>
                <div
                  className={`admin-logo-dropzone${logoDragActive ? " drag-active" : ""}${logoUploading ? " uploading" : ""}`}
                  onDragEnter={(event) => { event.preventDefault(); setLogoDragActive(true); }}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setLogoDragActive(true); }}
                  onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setLogoDragActive(false); }}
                  onDrop={handleLogoDrop}
                >
                  <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { void uploadSponsorLogo(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                  <div className="admin-logo-preview">{form.logoUrl ? <img src={form.logoUrl} alt="معاينة شعار الراعي" /> : <span aria-hidden="true">⬆</span>}</div>
                  <div className="admin-logo-dropcopy"><strong>{logoUploading ? "جارٍ رفع الشعار..." : "اسحب الشعار وأفلته هنا"}</strong><small>PNG أو JPG أو WebP — بحد أقصى 4 MB</small></div>
                  <button type="button" disabled={logoUploading} onClick={() => logoInputRef.current?.click()}>{logoUploading ? "جارٍ الرفع" : "اختيار من الكمبيوتر"}</button>
                  {form.logoUrl && <button className="admin-logo-remove" type="button" onClick={() => setForm({ ...form, logoUrl: "" })}>إزالة</button>}
                </div>
                <div className="admin-logo-url"><span>أو من رابط مباشر</span><input dir="ltr" placeholder="https://example.com/logo.png" value={form.logoUrl || ""} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} /></div>
              </div>
              <label>صورة خلفية شريط الراعي<select value={form.bannerUrl} onChange={(event) => setForm({ ...form, bannerUrl: event.target.value })}>{bannerPresets.map(([url, label]) => <option value={url} key={url}>{label}</option>)}</select></label>
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
                  ? <img className="admin-campaign-preview-logo" src={form.logoUrl} alt={`شعار ${form.nameAr || "الراعي"}`} />
                  : <span className="admin-campaign-preview-fallback" aria-hidden="true">{(form.nameAr || "ر").slice(0, 1)}</span>}
                <div><small>معاينة الراعي</small><strong>{form.nameAr || "اسم الراعي"}</strong><span>{countryName(form.countryCode)}</span></div>
              </div>
            </div>
            <div className="admin-dialog-actions"><button type="button" onClick={() => setEditing(false)}>إلغاء</button><button className="admin-primary" type="submit" disabled={busy || logoUploading}>{logoUploading ? "جارٍ رفع الشعار..." : busy ? "جارٍ الحفظ..." : "حفظ الحملة"}</button></div>
          </form>
        </div>
      )}
    </main>
  );
}
