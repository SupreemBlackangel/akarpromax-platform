"use client";
// Unified office/company workspace module — replaces the copy-pasted
// OfficeWorkspaceShell/CompanyWorkspaceShell pairs and their duplicated
// branches/profile pages. Trilingual (ar/en/tr) throughout.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Edit, Mail, MapPin, Phone, Plus, Save, Trash2, X } from "lucide-react";
import Button from "@/src/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card";

export type OrgKind = "office" | "company";
type Locale = "ar" | "en" | "tr";
type Tri = { ar: string; en: string; tr: string };

const t3 = (ar: string, en: string, tr: string): Tri => ({ ar, en, tr });

export function useOrgLocale(): { locale: Locale; dir: "rtl" | "ltr" } {
  const [locale, setLocale] = useState<Locale>("ar");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("akarpromax-locale");
        if (stored === "en" || stored === "tr") setLocale(stored);
      } catch { /* keep ar */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return { locale, dir: locale === "ar" ? "rtl" : "ltr" };
}

const SHELL_COPY: Record<OrgKind, { title: Tri; subtitle: Tri; tabs: Array<[string, Tri, string]> }> = {
  office: {
    title: t3("مساحة عمل المكتب", "Office workspace", "Ofis çalışma alanı"),
    subtitle: t3("إدارة المؤسسة من عضوية المستخدم الحالية دون حساب دخول منفصل.", "Manage the organization through your membership — no separate login.", "Kuruluşu üyeliğiniz üzerinden yönetin."),
    tabs: [
      ["overview", t3("نظرة عامة", "Overview", "Genel bakış"), "/dashboard/office"],
      ["profile", t3("ملف المكتب", "Office profile", "Ofis profili"), "/dashboard/office/profile"],
      ["members", t3("الأعضاء والوكلاء", "Members & agents", "Üyeler"), "/dashboard/office/members"],
      ["branches", t3("الفروع", "Branches", "Şubeler"), "/dashboard/office/branches"],
      ["properties", t3("عقارات المكتب", "Office properties", "Ofis mülkleri"), "/dashboard/office/properties"],
      ["property-requests", t3("طلبات العقار", "Property requests", "Mülk talepleri"), "/dashboard/office/property-requests"],
      ["integration", t3("تكامل Office", "Office integration", "Office entegrasyonu"), "/dashboard/office/integration"],
      ["devices", t3("الأجهزة", "Devices", "Cihazlar"), "/dashboard/office/devices"],
      ["radar", t3("الرادار", "Radar", "Radar"), "/dashboard/office/radar"],
      ["sync", t3("المزامنة", "Sync", "Senkron"), "/dashboard/office/sync"],
      ["notifications", t3("التنبيهات", "Notifications", "Bildirimler"), "/dashboard/office/notifications"],
    ],
  },
  company: {
    title: t3("مساحة عمل الشركة", "Company workspace", "Şirket çalışma alanı"),
    subtitle: t3("إدارة الشركة حسب عضوية المستخدم وصلاحياته الفعلية.", "Manage the company through your actual membership and permissions.", "Şirketi üyeliğinize göre yönetin."),
    tabs: [
      ["dashboard", t3("لوحة التحكم", "Dashboard", "Panel"), "/dashboard/company"],
      ["profile", t3("ملف الشركة", "Company profile", "Şirket profili"), "/dashboard/company/profile"],
      ["members", t3("الأعضاء", "Members", "Üyeler"), "/dashboard/company/members"],
      ["branches", t3("الفروع", "Branches", "Şubeler"), "/dashboard/company/branches"],
      ["services", t3("الخدمات", "Services", "Hizmetler"), "/dashboard/company/services"],
    ],
  },
};

type ShellProps = { kind: OrgKind; activeTab: string; children: ReactNode };

function OrgWorkspaceShellContent({ kind, activeTab, children }: ShellProps) {
  const search = useSearchParams();
  const { locale, dir } = useOrgLocale();
  const org = search.get("org");
  const href = (path: string) => (org ? `${path}?org=${encodeURIComponent(org)}` : path);
  const copy = SHELL_COPY[kind];

  return (
    <div dir={dir} className="min-h-screen bg-[var(--color-surface-muted)]">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:flex lg:gap-6 lg:px-8">
        <aside className="mb-4 lg:mb-0 lg:w-64 lg:shrink-0">
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 lg:sticky lg:top-6 lg:flex-col">
            {copy.tabs.map(([key, label, path]) => (
              <Link
                key={key}
                href={href(path)}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold ${activeTab === key ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"}`}
              >
                {label[locale]}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mb-5">
            <h1 className="text-2xl font-black text-[var(--color-text-primary)]">{copy.title[locale]}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">{copy.subtitle[locale]}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function OrgWorkspaceShell(props: ShellProps) {
  return (
    <Suspense fallback={<div dir="rtl" className="min-h-screen p-6">...</div>}>
      <OrgWorkspaceShellContent {...props} />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/* Branches — one CRUD view for both org kinds                         */
/* ------------------------------------------------------------------ */

interface Branch {
  id: string;
  nameAr: string | null;
  nameEn: string | null;
  countryCode: string | null;
  cityId: string | null;
  addressAr: string | null;
  phone: string | null;
  email: string | null;
  status: string;
}

const BRANCH_COPY = {
  title: t3("الفروع", "Branches", "Şubeler"),
  subtitleOffice: t3("إدارة فروع مكتبك العقاري", "Manage your office branches", "Ofis şubelerinizi yönetin"),
  subtitleCompany: t3("إدارة فروع شركتك", "Manage your company branches", "Şirket şubelerinizi yönetin"),
  add: t3("إضافة فرع", "Add branch", "Şube ekle"),
  edit: t3("تعديل فرع", "Edit branch", "Şubeyi düzenle"),
  newBranch: t3("فرع جديد", "New branch", "Yeni şube"),
  nameAr: t3("اسم الفرع (عربي)", "Branch name (Arabic)", "Şube adı (Arapça)"),
  nameEn: t3("اسم الفرع (إنجليزي)", "Branch name (English)", "Şube adı (İngilizce)"),
  city: t3("المدينة", "City", "Şehir"),
  address: t3("العنوان", "Address", "Adres"),
  phone: t3("رقم الهاتف", "Phone", "Telefon"),
  email: t3("البريد الإلكتروني", "Email", "E-posta"),
  save: t3("تحديث", "Update", "Güncelle"),
  create: t3("إضافة", "Add", "Ekle"),
  cancel: t3("إلغاء", "Cancel", "İptal"),
  empty: t3("لا توجد فروع", "No branches yet", "Henüz şube yok"),
  confirmDelete: t3("هل أنت متأكد من حذف هذا الفرع؟", "Delete this branch?", "Bu şube silinsin mi?"),
  error: t3("حدث خطأ", "Something went wrong", "Bir hata oluştu"),
};

const EMPTY_BRANCH = { nameAr: "", nameEn: "", countryCode: "", cityId: "", addressAr: "", phone: "", email: "", status: "active" };

function OrgBranchesContent({ kind }: { kind: OrgKind }) {
  const searchParams = useSearchParams();
  const { locale } = useOrgLocale();
  const organizationId = searchParams.get("org");
  const apiBase = `/api/${kind}/branches`;
  const orgSuffix = organizationId ? `?org=${encodeURIComponent(organizationId)}` : "";
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_BRANCH });
  const c = BRANCH_COPY;

  useEffect(() => {
    fetch(`${apiBase}${orgSuffix}`)
      .then((res) => res.json())
      .then((data) => { if (data.success) setBranches(data.data); setLoading(false); })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? "PATCH" : "POST";
      const payload = editingId ? { id: editingId, organizationId, ...formData } : { organizationId, ...formData };
      const res = await fetch(`${apiBase}${orgSuffix}`, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (editingId) setBranches((prev) => prev.map((b) => (b.id === editingId ? data.data : b)));
        else setBranches((prev) => [...prev, data.data]);
        setShowForm(false); setEditingId(null); setFormData({ ...EMPTY_BRANCH });
      }
    } catch { window.alert(c.error[locale]); }
  };

  const deleteBranch = async (id: string) => {
    if (!window.confirm(c.confirmDelete[locale])) return;
    try {
      const res = await fetch(`${apiBase}?id=${id}${organizationId ? `&org=${encodeURIComponent(organizationId)}` : ""}`, { method: "DELETE" });
      if (res.ok) setBranches((prev) => prev.filter((b) => b.id !== id));
    } catch { window.alert(c.error[locale]); }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-[var(--color-surface-muted)]" />;
  }

  const inputClass = "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 outline-none focus:border-[var(--color-primary)]";

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{c.title[locale]}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">{(kind === "office" ? c.subtitleOffice : c.subtitleCompany)[locale]}</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ ...EMPTY_BRANCH }); }}>
          <Plus className="me-2 h-4 w-4" /> {c.add[locale]}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle>{editingId ? c.edit[locale] : c.newBranch[locale]}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input type="text" value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} placeholder={c.nameAr[locale]} className={inputClass} required />
                <input type="text" value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} placeholder={c.nameEn[locale]} className={inputClass} />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input type="text" value={formData.cityId} onChange={(e) => setFormData({ ...formData, cityId: e.target.value })} placeholder={c.city[locale]} className={inputClass} />
                <input type="text" value={formData.addressAr} onChange={(e) => setFormData({ ...formData, addressAr: e.target.value })} placeholder={c.address[locale]} className={inputClass} />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder={c.phone[locale]} className={inputClass} />
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder={c.email[locale]} className={inputClass} />
              </div>
              <div className="flex gap-4">
                <Button type="submit">{editingId ? c.save[locale] : c.create[locale]}</Button>
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>{c.cancel[locale]}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {branches.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="mx-auto mb-3 h-12 w-12 text-[var(--color-text-muted)]/40" />
            <p className="text-[var(--color-text-muted)]">{c.empty[locale]}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)]">{branch.nameAr || branch.nameEn}</h3>
                    {branch.cityId && <p className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]"><MapPin className="h-3 w-3" /> {branch.cityId}</p>}
                    {branch.addressAr && <p className="text-sm text-[var(--color-text-muted)]">{branch.addressAr}</p>}
                    {branch.phone && <p className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]"><Phone className="h-3 w-3" /> {branch.phone}</p>}
                    {branch.email && <p className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]"><Mail className="h-3 w-3" /> {branch.email}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(branch.id); setFormData({ nameAr: branch.nameAr || "", nameEn: branch.nameEn || "", countryCode: branch.countryCode || "", cityId: branch.cityId || "", addressAr: branch.addressAr || "", phone: branch.phone || "", email: branch.email || "", status: branch.status }); setShowForm(true); }} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteBranch(branch.id)} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-error)]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export function OrgBranchesPage({ kind }: { kind: OrgKind }) {
  return (
    <Suspense fallback={<div className="p-6" dir="rtl">...</div>}>
      <OrgWorkspaceShell kind={kind} activeTab="branches">
        <OrgBranchesContent kind={kind} />
      </OrgWorkspaceShell>
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/* Profile — one form for both org kinds (company adds specialties)    */
/* ------------------------------------------------------------------ */

interface OrgProfile {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  countryCode: string;
  cityId: string;
  contactPhone: string;
  contactEmail: string;
  websiteUrl: string;
  logoUrl: string;
  coverUrl: string;
  specialties: string[];
}

const PROFILE_COPY = {
  titleOffice: t3("ملف المكتب", "Office profile", "Ofis profili"),
  titleCompany: t3("ملف الشركة", "Company profile", "Şirket profili"),
  subtitleOffice: t3("تعديل معلومات مكتبك العقاري", "Edit your office details", "Ofis bilgilerinizi düzenleyin"),
  subtitleCompany: t3("تعديل معلومات شركتك", "Edit your company details", "Şirket bilgilerinizi düzenleyin"),
  infoOffice: t3("معلومات المكتب", "Office information", "Ofis bilgileri"),
  infoCompany: t3("معلومات الشركة", "Company information", "Şirket bilgileri"),
  nameArL: t3("الاسم (عربي)", "Name (Arabic)", "Ad (Arapça)"),
  nameEnL: t3("الاسم (إنجليزي)", "Name (English)", "Ad (İngilizce)"),
  descAr: t3("الوصف (عربي)", "Description (Arabic)", "Açıklama (Arapça)"),
  country: t3("الدولة", "Country", "Ülke"),
  city: t3("المدينة", "City", "Şehir"),
  contact: t3("معلومات الاتصال", "Contact information", "İletişim bilgileri"),
  phone: t3("رقم الهاتف", "Phone", "Telefon"),
  email: t3("البريد الإلكتروني", "Email", "E-posta"),
  website: t3("الموقع الإلكتروني", "Website", "Web sitesi"),
  specialties: t3("التخصصات", "Specialties", "Uzmanlıklar"),
  addSpecialty: t3("أضف تخصصاً...", "Add a specialty...", "Uzmanlık ekleyin..."),
  save: t3("حفظ التغييرات", "Save changes", "Değişiklikleri kaydet"),
  saving: t3("جاري الحفظ...", "Saving...", "Kaydediliyor..."),
  saved: t3("تم تحديث الملف بنجاح", "Profile updated", "Profil güncellendi"),
  cancel: t3("إلغاء", "Cancel", "İptal"),
  error: t3("حدث خطأ", "Something went wrong", "Bir hata oluştu"),
};

function OrgProfileContent({ kind }: { kind: OrgKind }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale } = useOrgLocale();
  const organizationId = searchParams.get("org");
  const apiUrl = `/api/${kind}/profile${organizationId ? `?org=${encodeURIComponent(organizationId)}` : ""}`;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [profile, setProfile] = useState<OrgProfile>({
    nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", countryCode: "",
    cityId: "", contactPhone: "", contactEmail: "", websiteUrl: "", logoUrl: "", coverUrl: "", specialties: [],
  });
  const c = PROFILE_COPY;

  useEffect(() => {
    fetch(apiUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const d = data.data;
          setProfile({
            nameAr: d.nameAr || "", nameEn: d.nameEn || "",
            descriptionAr: d.descriptionAr || "", descriptionEn: d.descriptionEn || "",
            countryCode: d.countryCode || "", cityId: d.cityId || "",
            contactPhone: d.contactPhone || "", contactEmail: d.contactEmail || "",
            websiteUrl: d.websiteUrl || "", logoUrl: d.logoUrl || "", coverUrl: d.coverUrl || "",
            specialties: Array.isArray(d.specialties) ? d.specialties : [],
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, organizationId }),
      });
      if (res.ok) {
        window.alert(c.saved[locale]);
        router.refresh();
      }
    } catch {
      window.alert(c.error[locale]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-[var(--color-surface-muted)]" />;
  }

  const inputClass = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 outline-none focus:border-[var(--color-primary)]";
  const labelClass = "mb-1 block text-sm font-medium text-[var(--color-text-secondary)]";

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{(kind === "office" ? c.titleOffice : c.titleCompany)[locale]}</h2>
        <p className="text-sm text-[var(--color-text-muted)]">{(kind === "office" ? c.subtitleOffice : c.subtitleCompany)[locale]}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>{(kind === "office" ? c.infoOffice : c.infoCompany)[locale]}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>{c.nameArL[locale]}</label>
                <input type="text" value={profile.nameAr} onChange={(e) => setProfile({ ...profile, nameAr: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{c.nameEnL[locale]}</label>
                <input type="text" value={profile.nameEn} onChange={(e) => setProfile({ ...profile, nameEn: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>{c.descAr[locale]}</label>
              <textarea value={profile.descriptionAr} onChange={(e) => setProfile({ ...profile, descriptionAr: e.target.value })} className={`${inputClass} h-24`} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {kind === "office" && (
                <div>
                  <label className={labelClass}>{c.country[locale]}</label>
                  <input type="text" value={profile.countryCode} onChange={(e) => setProfile({ ...profile, countryCode: e.target.value })} className={inputClass} />
                </div>
              )}
              <div>
                <label className={labelClass}>{c.city[locale]}</label>
                <input type="text" value={profile.cityId} onChange={(e) => setProfile({ ...profile, cityId: e.target.value })} className={inputClass} />
              </div>
            </div>
            {kind === "company" && (
              <div>
                <label className={labelClass}>{c.specialties[locale]}</label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {profile.specialties.map((item) => (
                    <span key={item} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
                      {item}
                      <button type="button" onClick={() => setProfile({ ...profile, specialties: profile.specialties.filter((s) => s !== item) })} aria-label="×">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const value = newSpecialty.trim();
                        if (value && !profile.specialties.includes(value)) {
                          setProfile({ ...profile, specialties: [...profile.specialties, value] });
                        }
                        setNewSpecialty("");
                      }
                    }}
                    placeholder={c.addSpecialty[locale]}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{c.contact[locale]}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>{c.phone[locale]}</label>
                <input type="text" value={profile.contactPhone} onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{c.email[locale]}</label>
                <input type="email" value={profile.contactEmail} onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>{c.website[locale]}</label>
              <input type="text" value={profile.websiteUrl} onChange={(e) => setProfile({ ...profile, websiteUrl: e.target.value })} className={inputClass} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving} className="flex-1">
            <Save className="me-2 h-4 w-4" />
            {saving ? c.saving[locale] : c.save[locale]}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>{c.cancel[locale]}</Button>
        </div>
      </form>
    </>
  );
}

export function OrgProfilePage({ kind }: { kind: OrgKind }) {
  return (
    <Suspense fallback={<div className="p-6" dir="rtl">...</div>}>
      <OrgWorkspaceShell kind={kind} activeTab="profile">
        <OrgProfileContent kind={kind} />
      </OrgWorkspaceShell>
    </Suspense>
  );
}
