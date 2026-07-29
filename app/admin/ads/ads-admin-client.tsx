"use client";
/* eslint-disable @next/next/no-img-element -- Advertising media is uploaded at runtime. */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Identity = {
  authenticated: boolean;
  displayName: string;
  role: string;
  countryCode: string | null;
  permissions: string[];
};

type Campaign = {
  id: string;
  internalName: string;
  advertiserName: string;
  campaignType: string;
  status: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  mobileMediaUrl: string | null;
  posterUrl: string | null;
  eyebrowAr: string; eyebrowEn: string; eyebrowTr: string;
  titleAr: string; titleEn: string; titleTr: string;
  accentAr: string; accentEn: string; accentTr: string;
  descriptionAr: string; descriptionEn: string; descriptionTr: string;
  ctaAr: string; ctaEn: string; ctaTr: string;
  targetUrl: string;
  countries: string[];
  cities: string[];
  languages: string[];
  devices: string[];
  priority: number;
  weight: number;
  startAt: string | null;
  endAt: string | null;
  impressions: number;
  clicks: number;
  creatives?: Creative[];
  createdAt?: string;
  updatedAt?: string;
};

type Asset = {
  id: string;
  key: string;
  url: string;
  fileName: string;
  contentType: string;
  mediaType: "image" | "video";
  size: number;
  uploadedBy?: string | null;
  createdAt?: string;
};
type Creative = { id: string; mediaType: "image" | "video"; mediaUrl: string; mobileMediaUrl: string | null; posterUrl: string | null; position: number; durationSeconds: number };

type CampaignForm = Omit<Campaign, "impressions" | "clicks">;

const countries = [
  ["om", "عُمان"], ["sa", "السعودية"], ["ae", "الإمارات"], ["qa", "قطر"],
  ["kw", "الكويت"], ["bh", "البحرين"], ["eg", "مصر"], ["jo", "الأردن"],
  ["iq", "العراق"], ["lb", "لبنان"], ["ps", "فلسطين"], ["sy", "سوريا"],
  ["ye", "اليمن"], ["ma", "المغرب"], ["dz", "الجزائر"], ["tn", "تونس"],
  ["ly", "ليبيا"], ["sd", "السودان"], ["so", "الصومال"], ["dj", "جيبوتي"],
  ["mr", "موريتانيا"], ["km", "جزر القمر"], ["tr", "تركيا"],
];

const roleLabels: Record<string, string> = {
  viewer: "مشاهد",
  analyst: "محلل",
  content_editor: "محرر محتوى",
  country_manager: "مدير دولة",
  ad_manager: "مدير الإعلانات",
  sponsor_admin: "مدير الرعاة",
  super_admin: "المدير العام",
};

const emptyCampaign: CampaignForm = {
  id: "",
  internalName: "حملة الهيرو الرئيسية",
  advertiserName: "عقار بروماكس",
  campaignType: "platform",
  status: "draft",
  mediaType: "image",
  mediaUrl: "/og.png",
  mobileMediaUrl: null,
  posterUrl: null,
  eyebrowAr: "إعلان مميز من عقار بروماكس",
  eyebrowEn: "Featured advertisement by AkarPromax",
  eyebrowTr: "AkarPromax'tan öne çıkan reklam",
  titleAr: "اكتشف العقارات",
  titleEn: "Discover properties",
  titleTr: "Gayrimenkulleri keşfedin",
  accentAr: "للبيع والإيجار",
  accentEn: "for sale and rent",
  accentTr: "satılık ve kiralık",
  descriptionAr: "تجربة عقارية واضحة تجمع الإعلانات والخدمات والمكاتب في مكان واحد.",
  descriptionEn: "A clear property experience bringing listings, services and offices together.",
  descriptionTr: "İlanları, hizmetleri ve ofisleri tek yerde buluşturan net bir gayrimenkul deneyimi.",
  ctaAr: "استكشف الآن",
  ctaEn: "Explore now",
  ctaTr: "Şimdi keşfet",
  targetUrl: "#properties",
  countries: ["om"],
  cities: [],
  languages: ["ar", "en", "tr"],
  devices: ["desktop", "mobile"],
  priority: 100,
  weight: 100,
  startAt: null,
  endAt: null,
  creatives: [],
};

function countryName(code: string) {
  return countries.find(([id]) => id === code.toLowerCase())?.[1] ?? code.toUpperCase();
}

function statusLabel(status: string) {
  return ({ active: "نشطة", draft: "مسودة", paused: "متوقفة", expired: "منتهية", archived: "مؤرشفة" } as Record<string, string>)[status] ?? status;
}

function campaignTypeLabel(type: string) {
  return ({ platform: "المنصة", sponsor: "راعٍ", property: "عقار مميز", service: "خدمة" } as Record<string, string>)[type] ?? type;
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function AdsAdminClient({ initialUser }: { initialUser: { email: string; displayName: string } }) {
  const [identity, setIdentity] = useState<Identity>({
    authenticated: true,
    displayName: initialUser.displayName,
    role: "viewer",
    countryCode: null,
    permissions: [],
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeView, setActiveView] = useState<"campaigns" | "media" | "analytics">("campaigns");
  const [editing, setEditing] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [previewLocale, setPreviewLocale] = useState<"ar" | "en" | "tr">("ar");
  const [form, setForm] = useState<CampaignForm>({ ...emptyCampaign });
  const [busy, setBusy] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = identity.permissions.includes("ads:edit");
  const canPublish = identity.permissions.includes("ads:publish");
  const canUpload = identity.permissions.includes("media:upload");
  const canAnalytics = identity.permissions.includes("ads:analytics");

  async function loadCampaigns() {
    const response = await fetch("/api/ads?admin=1", { cache: "no-store" });
    const data = await response.json() as { identity?: Identity; campaigns?: Campaign[]; error?: string };
    if (!response.ok) throw new Error(data.error || "تعذر تحميل الحملات");
    if (data.identity) setIdentity(data.identity);
    setCampaigns(data.campaigns ?? []);
  }

  async function loadAssets() {
    const response = await fetch("/api/ad-assets", { cache: "no-store" });
    const data = await response.json() as { assets?: Asset[]; error?: string };
    if (!response.ok) throw new Error(data.error || "تعذر تحميل مكتبة الوسائط");
    setAssets(data.assets ?? []);
  }

  useEffect(() => {
    let mounted = true;
    window.queueMicrotask(() => {
      if (!mounted) return;
      Promise.all([loadCampaigns(), loadAssets()])
        .catch((error) => { if (mounted) setMessage(error instanceof Error ? error.message : "تعذر تحميل مركز الإعلانات"); })
        .finally(() => { if (mounted) setBusy(false); });
    });
    return () => { mounted = false; };
  }, []);

  const totals = useMemo(() => ({
    active: campaigns.filter((item) => item.status === "active").length,
    scheduled: campaigns.filter((item) => item.status === "active" && item.startAt && new Date(item.startAt) > new Date()).length,
    impressions: campaigns.reduce((sum, item) => sum + item.impressions, 0),
    clicks: campaigns.reduce((sum, item) => sum + item.clicks, 0),
  }), [campaigns]);

  function startCreate(asset?: Asset) {
    const initialCountries = identity.countryCode ? [identity.countryCode.toLowerCase()] : ["om"];
    setForm({
      ...emptyCampaign,
      countries: initialCountries,
      priority: Math.min(999, Math.max(0, ...campaigns.map((item) => item.priority)) + 1),
      ...(asset ? { mediaUrl: asset.url, mediaType: asset.mediaType } : {}),
    });
    setPreviewLocale("ar");
    setWizardStep(1);
    setEditing(true);
    setMessage("");
  }

  function startEdit(campaign: Campaign) {
    setForm({
      ...campaign,
      mobileMediaUrl: campaign.mobileMediaUrl || null,
      posterUrl: campaign.posterUrl || null,
      startAt: campaign.startAt || null,
      endAt: campaign.endAt || null,
    });
    setPreviewLocale("ar");
    setWizardStep(1);
    setEditing(true);
    setMessage("");
  }

  function toggleList(field: "countries" | "languages" | "devices", value: string) {
    const current = form[field];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    setForm({ ...form, [field]: next });
  }

  async function saveCampaign(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/ads", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الحملة");
      await loadCampaigns();
      setEditing(false);
      setMessage(form.id ? "تم تحديث الحملة بنجاح." : "تم إنشاء الحملة بنجاح.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الحملة");
    } finally {
      setBusy(false);
    }
  }

  async function archiveCampaign(id: string) {
    if (!window.confirm("هل تريد أرشفة هذه الحملة؟")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/ads?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = response.status === 204 ? {} : await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر أرشفة الحملة");
      await loadCampaigns();
      setMessage("تمت أرشفة الحملة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر أرشفة الحملة");
    } finally {
      setBusy(false);
    }
  }

  async function getVideoDuration(file: File) {
    return new Promise<number>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration); };
      video.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`تعذر قراءة مدة الفيديو: ${file.name}`)); };
      video.src = url;
    });
  }

  async function readUploadResponse<T>(response: Response): Promise<T & { error?: string }> {
    const text = await response.text();
    try { return JSON.parse(text) as T & { error?: string }; }
    catch { return { error: response.status === 413 ? "حجم الملف كبير للرفع المباشر؛ أعد المحاولة وسيتم تقسيمه تلقائيًا." : (text || "تعذر الاتصال بخدمة الرفع.") } as T & { error?: string }; }
  }

  async function uploadFileInParts(file: File, duration?: number): Promise<Asset> {
    const initResponse = await fetch("/api/ad-assets?upload=init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size, duration }) });
    const init = await readUploadResponse<{ id?: string; key?: string; uploadId?: string; mediaType?: "image" | "video"; contentType?: string }>(initResponse);
    if (!initResponse.ok || !init.id || !init.key || !init.uploadId || !init.mediaType || !init.contentType) throw new Error(init.error || `تعذر بدء رفع ${file.name}`);
    const chunkSize = 5 * 1024 * 1024;
    const parts: Array<{ partNumber: number; etag: string }> = [];
    for (let offset = 0, partNumber = 1; offset < file.size; offset += chunkSize, partNumber += 1) {
      const partResponse = await fetch("/api/ad-assets?upload=part", { method: "POST", headers: { "Content-Type": "application/octet-stream", "x-ad-object-key": init.key, "x-ad-upload-id": init.uploadId, "x-ad-part-number": String(partNumber) }, body: file.slice(offset, Math.min(offset + chunkSize, file.size)) });
      const part = await readUploadResponse<{ partNumber?: number; etag?: string }>(partResponse);
      if (!partResponse.ok || !part.etag || !part.partNumber) throw new Error(part.error || `تعذر رفع جزء من ${file.name}`);
      parts.push({ partNumber: part.partNumber, etag: part.etag });
    }
    const completeResponse = await fetch("/api/ad-assets?upload=complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: init.id, key: init.key, uploadId: init.uploadId, fileName: file.name, contentType: init.contentType, mediaType: init.mediaType, size: file.size, parts }) });
    const complete = await readUploadResponse<{ asset?: Asset }>(completeResponse);
    if (!completeResponse.ok || !complete.asset) throw new Error(complete.error || `تعذر حفظ ${file.name}`);
    return complete.asset;
  }

  async function uploadMedia(files: FileList | File[] | undefined) {
    const uploads = files ? Array.from(files) : [];
    if (!uploads.length) return;
    setUploading(true);
    setMessage("");
    try {
      const videoDurations = new Map<File, number>();
      for (const file of uploads) {
        if (file.type.startsWith("video/")) {
          const duration = await getVideoDuration(file);
          if (!Number.isFinite(duration) || duration <= 0 || duration > 15) throw new Error(`الفيديو «${file.name}» أطول من 15 ثانية.`);
          videoDurations.set(file, duration);
        }
      }
      const uploaded: Asset[] = [];
      for (const file of uploads) {
        const duration = videoDurations.get(file);
        uploaded.push(await uploadFileInParts(file, duration));
      }
      setAssets((items) => [...uploaded, ...items]);
      const selected = uploaded[0];
      if (selected) setForm((current) => ({ ...current, mediaUrl: current.creatives?.length ? current.mediaUrl : selected.url, mediaType: current.creatives?.length ? current.mediaType : selected.mediaType, creatives: [...(current.creatives || []), ...uploaded.map((asset, index) => ({ id: asset.id, mediaType: asset.mediaType, mediaUrl: asset.url, mobileMediaUrl: null, posterUrl: null, position: (current.creatives?.length || 0) + index + 1, durationSeconds: 6 }))] }));
      await loadAssets();
      setMessage(uploaded.length === 1 ? "تم رفع الملف واختياره للحملة." : `تم رفع ${uploaded.length} ملفات إلى المكتبة، واختير أول ملف للحملة.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر رفع الوسائط");
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  }

  async function deleteAsset(asset: Asset) {
    if (!window.confirm(`حذف ${asset.fileName} من المكتبة؟`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/ad-assets?key=${encodeURIComponent(asset.key)}`, { method: "DELETE" });
      const data = response.status === 204 ? {} : await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر حذف الملف");
      setAssets((items) => items.filter((item) => item.id !== asset.id));
      setMessage("تم حذف الملف.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حذف الملف");
    } finally {
      setBusy(false);
    }
  }

  const preview = {
    eyebrow: previewLocale === "ar" ? form.eyebrowAr : previewLocale === "tr" ? form.eyebrowTr : form.eyebrowEn,
    title: previewLocale === "ar" ? form.titleAr : previewLocale === "tr" ? form.titleTr : form.titleEn,
    accent: previewLocale === "ar" ? form.accentAr : previewLocale === "tr" ? form.accentTr : form.accentEn,
    description: previewLocale === "ar" ? form.descriptionAr : previewLocale === "tr" ? form.descriptionTr : form.descriptionEn,
    cta: previewLocale === "ar" ? form.ctaAr : previewLocale === "tr" ? form.ctaTr : form.ctaEn,
  };

  if (!busy && !identity.permissions.includes("ads:read")) {
    return <main className="ads-admin-denied" dir="rtl"><div><span>⌁</span><h1>لا توجد صلاحية لمركز الإعلانات</h1><p>اطلب من المدير العام منحك دور مدير الإعلانات أو صلاحية المشاهدة.</p><Link href="/">العودة إلى المنصة</Link></div></main>;
  }

  return (
    <main className={`ads-admin${editing ? " ads-admin-wizard-mode" : ""}`} dir="rtl">
      <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/ogg" hidden onChange={(event) => { void uploadMedia(event.target.files || undefined); event.currentTarget.value = ""; }} />
      <aside className="ads-admin-sidebar">
        <Link className="ads-admin-brand" href="/"><span>A</span><div><strong>عقار بروماكس</strong><small>Advertising Center</small></div></Link>
        <nav aria-label="مركز الإعلانات">
          <button className={activeView === "campaigns" ? "active" : ""} type="button" onClick={() => setActiveView("campaigns")}><span>▣</span>الحملات</button>
          <button className={activeView === "media" ? "active" : ""} type="button" onClick={() => setActiveView("media")}><span>▧</span>مكتبة الوسائط</button>
          {canAnalytics && <button className={activeView === "analytics" ? "active" : ""} type="button" onClick={() => setActiveView("analytics")}><span>↗</span>التحليلات</button>}
        </nav>
        <div className="ads-admin-links"><Link href="/admin/sponsors">إدارة الرعاة</Link><Link href="/" target="_blank">معاينة المنصة ↗</Link></div>
        <div className="ads-admin-user"><span>{identity.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{identity.displayName}</strong><small>{roleLabels[identity.role] ?? identity.role}{identity.countryCode ? ` • ${countryName(identity.countryCode)}` : ""}</small></div></div>
      </aside>

      <section className="ads-admin-canvas">
        <header className="ads-admin-header">
          <div><p>إدارة المساحة الرئيسية</p><h1>مركز إعلانات hero-ad-media</h1></div>
          <div><Link href="/" target="_blank">المعاينة المباشرة</Link>{canEdit && <button type="button" onClick={() => startCreate()}>+ حملة جديدة</button>}</div>
        </header>

        {message && <div className="ads-admin-message" role="status">{message}<button type="button" onClick={() => setMessage("")}>×</button></div>}

        <div className="ads-stat-grid">
          <article><span>الحملات النشطة</span><strong>{totals.active}</strong><small>حملة منشورة</small></article>
          <article><span>المجدولة</span><strong>{totals.scheduled}</strong><small>بانتظار موعد البداية</small></article>
          <article><span>مرات الظهور</span><strong>{totals.impressions.toLocaleString("ar")}</strong><small>ظهور مؤهل</small></article>
          <article><span>CTR</span><strong>{totals.impressions ? ((totals.clicks / totals.impressions) * 100).toFixed(1) : "0.0"}%</strong><small>{totals.clicks.toLocaleString("ar")} نقرة</small></article>
        </div>

        {activeView === "campaigns" && <section className="ads-panel">
          <div className="ads-panel-title"><div><p>الحملات</p><h2>إعلانات الهيرو</h2></div><span>{campaigns.length} حملة</span></div>
          <div className="ads-campaign-list">
            {campaigns.map((campaign) => <article key={campaign.id}>
              <div className="ads-campaign-thumb">{campaign.mediaType === "video" ? <video src={campaign.mediaUrl} poster={campaign.posterUrl || undefined} muted preload="metadata" /> : <img src={campaign.mediaUrl} alt="" />}<span>{campaign.mediaType === "video" ? "فيديو" : "صورة"}</span></div>
              <div className="ads-campaign-main"><span className={`ads-status ads-status-${campaign.status}`}>{statusLabel(campaign.status)}</span><strong>{campaign.internalName}</strong><small>{campaign.advertiserName} • {campaignTypeLabel(campaign.campaignType)}</small></div>
              <div><small>الاستهداف</small><strong>{campaign.countries.length ? campaign.countries.map(countryName).slice(0, 2).join("، ") : "جميع الدول"}</strong></div>
              <div><small>الظهور / النقر</small><strong>{campaign.impressions.toLocaleString("ar")} / {campaign.clicks.toLocaleString("ar")}</strong></div>
              <div><small>ترتيب الظهور</small><strong>#{campaign.priority}</strong></div>
              <div className="ads-row-actions">{canEdit && <button type="button" onClick={() => startEdit(campaign)}>تعديل</button>}{canEdit && <button className="danger" type="button" onClick={() => archiveCampaign(campaign.id)}>أرشفة</button>}</div>
            </article>)}
            {!campaigns.length && <div className="ads-empty"><span>◇</span><strong>لا توجد حملات إعلانية بعد</strong><p>أنشئ أول حملة وحدد الوسائط والترجمات والاستهداف والجدولة.</p>{canEdit && <button type="button" onClick={() => startCreate()}>إنشاء الحملة الأولى</button>}</div>}
          </div>
        </section>}

        {activeView === "media" && <section className="ads-panel">
          <div className="ads-panel-title"><div><p>التخزين</p><h2>مكتبة الصور والفيديو</h2></div>{canUpload && <button type="button" onClick={() => fileInputRef.current?.click()}>رفع ملف</button>}</div>
          {canUpload && <div className={`ads-upload-zone${dragActive ? " drag-active" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); void uploadMedia(event.dataTransfer.files); }}><span>⬆</span><div><strong>{uploading ? "جارٍ رفع الملفات..." : "اسحب الصور والفيديوهات وأفلتها هنا"}</strong><small>رفع متعدد: صور حتى 8MB وفيديو حتى 25MB وبحد أقصى 15 ثانية.</small></div><button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>اختيار ملفات</button></div>}
          <div className="ads-media-grid">{assets.map((asset) => <article key={asset.id}><div>{asset.mediaType === "video" ? <video src={asset.url} muted controls preload="metadata" /> : <img src={asset.url} alt={asset.fileName} />}</div><strong title={asset.fileName}>{asset.fileName}</strong><small>{asset.mediaType === "video" ? "فيديو" : "صورة"} • {formatSize(asset.size)}</small><footer>{canEdit && <button type="button" onClick={() => startCreate(asset)}>إنشاء حملة</button>}{canEdit && <button className="danger" type="button" onClick={() => deleteAsset(asset)}>حذف</button>}</footer></article>)}</div>
          {!assets.length && <div className="ads-empty"><span>▧</span><strong>مكتبة الوسائط فارغة</strong><p>ارفع أول صورة أو فيديو لاستخدامه في الحملات.</p></div>}
        </section>}

        {activeView === "analytics" && canAnalytics && <section className="ads-panel">
          <div className="ads-panel-title"><div><p>الأداء</p><h2>تحليلات الحملات</h2></div></div>
          <div className="ads-analytics-list">{campaigns.map((campaign) => {
            const ctr = campaign.impressions ? ((campaign.clicks / campaign.impressions) * 100).toFixed(1) : "0.0";
            return <article key={campaign.id}><div><strong>{campaign.internalName}</strong><small>{campaign.advertiserName}</small></div><span>{campaign.impressions.toLocaleString("ar")} ظهور</span><span>{campaign.clicks.toLocaleString("ar")} نقرة</span><b>{ctr}% CTR</b></article>;
          })}</div>
        </section>}
      </section>

      {editing && <section className="ads-wizard-shell">
        <form className="ads-wizard" onSubmit={saveCampaign}>
          <header className="ads-wizard-head"><div><p>{form.id ? "تعديل الحملة" : "حملة جديدة"}</p><h2>إعداد إعلان الهيرو</h2></div><button type="button" onClick={() => setEditing(false)}>العودة للحملات</button></header>
          <nav className="ads-wizard-steps" aria-label="خطوات إعداد الحملة">{["الأساسيات", "الوسائط", "المحتوى", "الاستهداف", "الجدولة", "المعاينة"].map((label, index) => <button type="button" key={label} className={wizardStep === index + 1 ? "active" : wizardStep > index + 1 ? "done" : ""} onClick={() => setWizardStep(index + 1)}><span>{index + 1}</span>{label}</button>)}</nav>
          {message && <div className="ads-wizard-message" role="status">{message}</div>}

          <section className="ads-form-section" hidden={wizardStep !== 1}><div><span>1</span><h3>البيانات الأساسية</h3></div><div className="ads-form-grid">
            <label>اسم الحملة الداخلي<input required value={form.internalName} onChange={(event) => setForm({ ...form, internalName: event.target.value })} /></label>
            <label>الجهة المعلنة<input required value={form.advertiserName} onChange={(event) => setForm({ ...form, advertiserName: event.target.value })} /></label>
            <label>نوع الحملة<select value={form.campaignType} onChange={(event) => setForm({ ...form, campaignType: event.target.value })}><option value="platform">إعلان المنصة</option><option value="sponsor">راعٍ</option><option value="property">عقار مميز</option><option value="service">خدمة</option></select></label>
            <label>رابط زر الإجراء<input required dir="ltr" value={form.targetUrl} onChange={(event) => setForm({ ...form, targetUrl: event.target.value })} /></label>
          </div></section>

          <section className="ads-form-section" hidden={wizardStep !== 2}><div><span>2</span><h3>الصورة أو الفيديو</h3></div>
            <div className={`ads-dialog-upload${dragActive ? " drag-active" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); void uploadMedia(event.dataTransfer.files); }}>
              <div className="ads-dialog-media-preview">{form.mediaType === "video" ? <video src={form.mediaUrl} poster={form.posterUrl || undefined} muted controls preload="metadata" /> : <img src={form.mediaUrl} alt="معاينة الوسائط" />}</div>
              <div><strong>{uploading ? "جارٍ رفع الملفات..." : "اسحب الصور والفيديوهات هنا"}</strong><small>ارفع عدة ملفات معًا؛ الفيديو لا يتجاوز 15 ثانية، ويُختار أول ملف للحملة.</small></div>
              {canUpload && <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>اختيار ملفات</button>}
            </div>
            <div className="ads-form-grid">
              <label>نوع الوسائط<select value={form.mediaType} onChange={(event) => setForm({ ...form, mediaType: event.target.value as "image" | "video" })}><option value="image">صورة</option><option value="video">فيديو</option></select></label>
              <label>رابط الوسائط الرئيسي<input required dir="ltr" value={form.mediaUrl} onChange={(event) => setForm({ ...form, mediaUrl: event.target.value })} /></label>
              <label>نسخة الهاتف (اختياري)<input dir="ltr" value={form.mobileMediaUrl || ""} onChange={(event) => setForm({ ...form, mobileMediaUrl: event.target.value || null })} /></label>
              <label>صورة غلاف الفيديو<input dir="ltr" value={form.posterUrl || ""} onChange={(event) => setForm({ ...form, posterUrl: event.target.value || null })} /></label>
            </div>
            {!!form.creatives?.length && <div className="ads-creative-playlist">{form.creatives.map((creative, index) => <article key={`${creative.id}-${index}`}><span>{index + 1}</span>{creative.mediaType === "video" ? <video src={creative.mediaUrl} muted /> : <img src={creative.mediaUrl} alt="" />}<strong>الشريحة {index + 1}</strong><label>ثوانٍ<input type="number" min="3" max="15" value={creative.durationSeconds} onChange={(event) => setForm({ ...form, creatives: form.creatives?.map((item, itemIndex) => itemIndex === index ? { ...item, durationSeconds: Number(event.target.value) } : item) })} /></label><button type="button" disabled={index === 0} onClick={() => setForm({ ...form, creatives: form.creatives?.map((item, itemIndex, list) => itemIndex === index ? { ...list[index - 1], position: index } : itemIndex === index - 1 ? { ...list[index], position: index - 1 } : item) })}>↑</button><button type="button" disabled={index === form.creatives!.length - 1} onClick={() => setForm({ ...form, creatives: form.creatives?.map((item, itemIndex, list) => itemIndex === index ? { ...list[index + 1], position: index + 2 } : itemIndex === index + 1 ? { ...list[index], position: index + 1 } : item) })}>↓</button></article>)}</div>}
          </section>

          <section className="ads-form-section" hidden={wizardStep !== 3}><div><span>3</span><h3>المحتوى والترجمات</h3></div>
            <div className="ads-language-columns">
              {(["ar", "en", "tr"] as const).map((language) => {
                const labels = { ar: "العربية", en: "English", tr: "Türkçe" };
                const suffix = language === "ar" ? "Ar" : language === "en" ? "En" : "Tr";
                return <fieldset key={language} dir={language === "ar" ? "rtl" : "ltr"}><legend>{labels[language]}</legend>
                  <label>التصنيف<input required value={form[`eyebrow${suffix}` as keyof CampaignForm] as string} onChange={(event) => setForm({ ...form, [`eyebrow${suffix}`]: event.target.value })} /></label>
                  <label>العنوان<input required value={form[`title${suffix}` as keyof CampaignForm] as string} onChange={(event) => setForm({ ...form, [`title${suffix}`]: event.target.value })} /></label>
                  <label>السطر المميز<input required value={form[`accent${suffix}` as keyof CampaignForm] as string} onChange={(event) => setForm({ ...form, [`accent${suffix}`]: event.target.value })} /></label>
                  <label>الوصف<textarea required rows={3} value={form[`description${suffix}` as keyof CampaignForm] as string} onChange={(event) => setForm({ ...form, [`description${suffix}`]: event.target.value })} /></label>
                  <label>نص الزر<input required value={form[`cta${suffix}` as keyof CampaignForm] as string} onChange={(event) => setForm({ ...form, [`cta${suffix}`]: event.target.value })} /></label>
                </fieldset>;
              })}
            </div>
          </section>

          <section className="ads-form-section" hidden={wizardStep !== 4}><div><span>4</span><h3>الاستهداف</h3></div>
            <fieldset className="ads-choice-fieldset"><legend>الدول — عدم تحديد دولة يعني جميع الدول</legend><div>{countries.map(([id, label]) => <label key={id}><input type="checkbox" disabled={Boolean(identity.countryCode && identity.countryCode.toLowerCase() !== id)} checked={form.countries.includes(id)} onChange={() => toggleList("countries", id)} />{label}</label>)}</div></fieldset>
            <label className="ads-wide-field">المدن (اختياري — اكتب معرّفات المدن مفصولة بفاصلة)<input dir="ltr" placeholder="om-muscat, sa-riyadh" value={form.cities.join(", ")} onChange={(event) => setForm({ ...form, cities: event.target.value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) })} /></label>
            <div className="ads-target-grid">
              <fieldset className="ads-choice-fieldset"><legend>اللغات</legend><div>{[["ar", "العربية"], ["en", "English"], ["tr", "Türkçe"]].map(([id, label]) => <label key={id}><input type="checkbox" checked={form.languages.includes(id)} onChange={() => toggleList("languages", id)} />{label}</label>)}</div></fieldset>
              <fieldset className="ads-choice-fieldset"><legend>الأجهزة</legend><div>{[["desktop", "كمبيوتر"], ["mobile", "هاتف"]].map(([id, label]) => <label key={id}><input type="checkbox" checked={form.devices.includes(id)} onChange={() => toggleList("devices", id)} />{label}</label>)}</div></fieldset>
            </div>
          </section>

          <section className="ads-form-section" hidden={wizardStep !== 5}><div><span>5</span><h3>الجدولة والنشر</h3></div><div className="ads-form-grid">
            <label>البداية<input type="datetime-local" value={(form.startAt || "").slice(0, 16)} onChange={(event) => setForm({ ...form, startAt: event.target.value || null })} /></label>
            <label>النهاية<input type="datetime-local" value={(form.endAt || "").slice(0, 16)} onChange={(event) => setForm({ ...form, endAt: event.target.value || null })} /></label>
            <label>ترتيب الظهور<input type="number" min="1" max="999" value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })} /><small>1 يظهر أولاً، ثم 2 وهكذا.</small></label>
            <label>وزن التكرار<input type="number" min="1" max="100" value={form.weight} onChange={(event) => setForm({ ...form, weight: Number(event.target.value) })} /></label>
            <label>الحالة<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">مسودة</option>{canPublish && <option value="active">نشطة</option>}<option value="paused">متوقفة</option><option value="expired">منتهية</option></select></label>
          </div></section>

          <section className="ads-form-section" hidden={wizardStep !== 6}><div><span>6</span><h3>المعاينة</h3></div>
            <div className="ads-preview-toolbar">{(["ar", "en", "tr"] as const).map((language) => <button className={previewLocale === language ? "active" : ""} type="button" onClick={() => setPreviewLocale(language)} key={language}>{language.toUpperCase()}</button>)}</div>
            <div className="ads-live-preview" dir={previewLocale === "ar" ? "rtl" : "ltr"}>
              {form.mediaType === "video" ? <video src={form.mediaUrl} poster={form.posterUrl || undefined} autoPlay muted loop playsInline /> : <img src={form.mediaUrl} alt="" />}
              <div><p>{preview.eyebrow}</p><h2>{preview.title}<br /><strong>{preview.accent}</strong></h2><span>{preview.description}</span><b>{preview.cta} ←</b></div>
            </div>
          </section>

          <footer className="ads-wizard-actions"><button type="button" onClick={() => wizardStep === 1 ? setEditing(false) : setWizardStep((step) => step - 1)}>{wizardStep === 1 ? "إلغاء" : "السابق"}</button>{wizardStep < 6 ? <button className="primary" type="button" onClick={() => setWizardStep((step) => step + 1)}>التالي</button> : <button className="primary" type="submit" disabled={busy || uploading}>{busy ? "جارٍ الحفظ..." : form.id ? "حفظ التعديلات" : "إنشاء الحملة"}</button>}</footer>
        </form>
      </section>}
    </main>
  );
}
