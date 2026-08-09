"use client";

import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { ProviderStatusPill } from "@services-ui/ServiceStatusBadges";
import { apiFetch, nameFor } from "@services-client";
import type { CategoryRow } from "@services-ui/ServiceCards";

type Profile = Record<string, unknown> & {
  id: string;
  status: string;
  display_name_ar?: string | null;
  display_name_en?: string | null;
  bio_ar?: string | null;
  bio_en?: string | null;
  business_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  city_id?: string | null;
  service_radius_km?: number | null;
};

export default function ProviderProfilePage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [myCategories, setMyCategories] = useState<Array<Record<string, unknown>>>([]);
  const [, setPortfolio] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [displayNameAr, setDisplayNameAr] = useState("");
  const [displayNameEn, setDisplayNameEn] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [bioAr, setBioAr] = useState("");
  const [bioEn, setBioEn] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cityId, setCityId] = useState("");
  const [serviceRadiusKm, setServiceRadiusKm] = useState("50");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newCatPriceFrom, setNewCatPriceFrom] = useState("");
  const [newCatPriceTo, setNewCatPriceTo] = useState("");
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioImage, setPortfolioImage] = useState("");
  const [portfolioDesc, setPortfolioDesc] = useState("");

  const load = () => {
    const controller = new AbortController();
    (async () => {
      try {
        const [me, cats] = await Promise.all([
          apiFetch<{ profile: Profile | null; categories: Array<Record<string, unknown>>; portfolio: Array<Record<string, unknown>> }>("/api/service-providers/me"),
          apiFetch<{ categories: CategoryRow[] }>("/api/service-categories?country=OM"),
        ]);
        if (controller.signal.aborted) return;
        setCategories(cats.categories ?? []);
        setPortfolio(me.portfolio ?? []);
        setMyCategories(me.categories ?? []);
        const p = me.profile;
        setProfile(p);
        if (p) {
          setDisplayNameAr(p.display_name_ar ?? "");
          setDisplayNameEn(p.display_name_en ?? "");
          setBusinessName(p.business_name ?? "");
          setBioAr(p.bio_ar ?? "");
          setBioEn(p.bio_en ?? "");
          setPhone(p.phone ?? "");
          setWhatsapp(p.whatsapp ?? "");
          setCityId(p.city_id ?? "");
          setServiceRadiusKm(String(p.service_radius_km ?? 50));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  };

  useEffect(() => {
    if (!viewer.authenticated) return;
    return load();
  }, [viewer.authenticated]);

  const saveProfile = async () => {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch("/api/service-providers", {
        method: "POST",
        body: JSON.stringify({
          displayNameAr: displayNameAr.trim() || null,
          displayNameEn: displayNameEn.trim() || null,
          businessName: businessName.trim() || null,
          bioAr: bioAr.trim() || null,
          bioEn: bioEn.trim() || null,
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          countryCode: "OM",
          cityId: cityId.trim() || null,
          serviceRadiusKm: serviceRadiusKm ? Number(serviceRadiusKm) : 50,
          isBusiness: Boolean(businessName.trim()),
        }),
      });
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("services.error"));
      setBusy(false);
    }
  };

  const addCategory = async () => {
    if (!profile || !newCategoryId) return;
    setBusy(true);
    try {
      await apiFetch(`/api/service-providers/${encodeURIComponent(profile.id)}/categories`, {
        method: "POST",
        body: JSON.stringify({
          categoryId: newCategoryId,
          priceFrom: newCatPriceFrom ? Number(newCatPriceFrom) : null,
          priceTo: newCatPriceTo ? Number(newCatPriceTo) : null,
        }),
      });
      setNewCategoryId("");
      setNewCatPriceFrom("");
      setNewCatPriceTo("");
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("services.error"));
      setBusy(false);
    }
  };

  const addPortfolio = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      await apiFetch(`/api/service-providers/${encodeURIComponent(profile.id)}/portfolio`, {
        method: "POST",
        body: JSON.stringify({ title: portfolioTitle.trim(), imageUrl: portfolioImage.trim() || null, description: portfolioDesc.trim() || null }),
      });
      setPortfolioTitle("");
      setPortfolioImage("");
      setPortfolioDesc("");
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("services.error"));
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!profile) return;
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/api/service-providers/${encodeURIComponent(profile.id)}/apply`, { method: "POST" });
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("services.error"));
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400";
  const labelCls = "block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1";

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/dashboard/services/provider-profile"
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="provider-profile">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">{t("services.providerProfile") ?? "ملف مقدم الخدمة"}</h2>
          {profile && <ProviderStatusPill status={profile.status} locale={locale} />}
        </div>

        {message && <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{message}</div>}

        {loading ? (
          <div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ) : (
          <>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("services.nameAr") ?? "الاسم (عربي)"}</label>
                  <input value={displayNameAr} onChange={(e) => setDisplayNameAr(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("services.nameEn") ?? "الاسم (إنجليزي)"}</label>
                  <input value={displayNameEn} onChange={(e) => setDisplayNameEn(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("services.businessName") ?? "اسم النشاط / الشركة"}</label>
                  <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("services.city") ?? "المدينة"}</label>
                  <input value={cityId} onChange={(e) => setCityId(e.target.value)} className={inputCls} placeholder="مسقط" />
                </div>
                <div>
                  <label className={labelCls}>{t("services.phone") ?? "الهاتف"}</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>WhatsApp</label>
                  <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("services.radius") ?? "نطاق الخدمة (كم)"}</label>
                  <input type="number" min={1} value={serviceRadiusKm} onChange={(e) => setServiceRadiusKm(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t("services.bioAr") ?? "نبذة (عربي)"}</label>
                <textarea value={bioAr} onChange={(e) => setBioAr(e.target.value)} rows={3} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t("services.bioEn") ?? "نبذة (إنجليزي)"}</label>
                <textarea value={bioEn} onChange={(e) => setBioEn(e.target.value)} rows={3} className={inputCls} />
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => void saveProfile()} disabled={busy} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition">
                  {t("services.save") ?? "حفظ الملف"}
                </button>
                {profile && (profile.status === "draft" || profile.status === "rejected") && (
                  <button onClick={() => void apply()} disabled={busy} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold transition">
                    {t("services.applyProvider") ?? "إرسال للمراجعة"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">{t("services.myCategories") ?? "تصنيفاتي"}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {myCategories.map((cat) => (
                  <span key={String(cat.id)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                    {nameFor(locale, cat.name_ar, cat.name_en, cat.name_tr, String(cat.id).slice(0, 6))}
                    {profile && (
                      <button
                        onClick={() => {
                          void apiFetch(`/api/service-providers/${encodeURIComponent(profile.id)}/categories?categoryId=${encodeURIComponent(String(cat.id))}`, { method: "DELETE" }).then(() => window.location.reload());
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} className={inputCls}>
                  <option value="">{t("services.selectCategory") ?? "اختر تصنيفاً..."}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{(c as { name_en?: string | null }).name_en || (c as { name_ar?: string | null }).name_ar || c.code}</option>
                  ))}
                </select>
                <input type="number" min={0} value={newCatPriceFrom} onChange={(e) => setNewCatPriceFrom(e.target.value)} placeholder="سعر من" className={inputCls} />
                <input type="number" min={0} value={newCatPriceTo} onChange={(e) => setNewCatPriceTo(e.target.value)} placeholder="سعر إلى" className={inputCls} />
              </div>
              <button onClick={() => void addCategory()} disabled={busy || !newCategoryId} className="mt-3 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition">
                {t("services.addCategory") ?? "إضافة تصنيف"}
              </button>
            </div>

            <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">{t("services.portfolio") ?? "أعمال سابقة"}</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <input value={portfolioTitle} onChange={(e) => setPortfolioTitle(e.target.value)} placeholder={t("services.portfolioTitle") ?? "عنوان العمل"} className={inputCls} />
                <input value={portfolioImage} onChange={(e) => setPortfolioImage(e.target.value)} placeholder="https://.../image.jpg" className={inputCls} />
                <input value={portfolioDesc} onChange={(e) => setPortfolioDesc(e.target.value)} placeholder={t("services.portfolioDesc") ?? "وصف مختصر"} className={inputCls} />
              </div>
              <button onClick={() => void addPortfolio()} disabled={busy || !portfolioTitle.trim()} className="mt-3 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition">
                {t("services.addPortfolio") ?? "إضافة عمل"}
              </button>
            </div>
          </>
        )}
      </ServiceDashboardShell>
      {AccountDialog}
    </PublicPageShell>
  );
}
