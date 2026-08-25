"use client";

import { useCallback, useEffect, useState } from "react";
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
  email?: string | null;
  website?: string | null;
  country_code?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  governorate?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  service_radius_km?: number | null;
  licenses_text?: string | null;
  insurance_text?: string | null;
  founded_year?: number | null;
  team_size?: number | null;
  is_business?: number;
};

export default function ProviderProfilePage() {
  const {
    locale, viewer, t: rawT, dir, country, city, governorate: selectedGovernorate,
    district: selectedDistrict, latitude: selectedLatitude, longitude: selectedLongitude,
    isGlobal, openLogin, handleLogout, AccountDialog, copy,
  } = useServicesPage();
  const t = (key: string): string | undefined => {
    const value = rawT(key);
    return value && value !== key ? value : undefined;
  };
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
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [serviceRadiusKm, setServiceRadiusKm] = useState("50");
  const [licensesText, setLicensesText] = useState("");
  const [insuranceText, setInsuranceText] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [isBusiness, setIsBusiness] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newCatPriceFrom, setNewCatPriceFrom] = useState("");
  const [newCatPriceTo, setNewCatPriceTo] = useState("");
  const [newCatInstantPrice, setNewCatInstantPrice] = useState("");
  const [newCatCurrency, setNewCatCurrency] = useState("");
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioImage, setPortfolioImage] = useState("");
  const [portfolioDesc, setPortfolioDesc] = useState("");

  const load = useCallback(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const categorySuffix = !isGlobal && country ? `?country=${encodeURIComponent(country)}` : "";
        const [me, cats] = await Promise.all([
          apiFetch<{ profile: Profile | null; categories: Array<Record<string, unknown>>; portfolio: Array<Record<string, unknown>> }>("/api/service-providers/me"),
          apiFetch<{ categories: CategoryRow[] }>(`/api/service-categories${categorySuffix}`),
        ]);
        if (controller.signal.aborted) return;
        const leafCategories = (cats.categories ?? []).filter((category) => category.parent_id);
        setCategories(leafCategories);
        const requestedCategory = new URLSearchParams(window.location.search).get("category") || window.localStorage.getItem("ak_provider_selected_category") || "";
        if (requestedCategory && leafCategories.some((category) => category.id === requestedCategory)) {
          setNewCategoryId(requestedCategory);
          window.localStorage.removeItem("ak_provider_selected_category");
        }
        setPortfolio(me.portfolio ?? []);
        setMyCategories(me.categories ?? []);
        const p = me.profile;
        setProfile(p);
        if (p) {
          setCountryCode(p.country_code ?? country);
          setDisplayNameAr(p.display_name_ar ?? "");
          setDisplayNameEn(p.display_name_en ?? "");
          setBusinessName(p.business_name ?? "");
          setBioAr(p.bio_ar ?? "");
          setBioEn(p.bio_en ?? "");
          setPhone(p.phone ?? "");
          setWhatsapp(p.whatsapp ?? "");
          setEmail(p.email ?? "");
          setWebsite(p.website ?? "");
          setCityId(p.city_id ?? "");
          setDistrictId(p.district_id ?? "");
          setGovernorate(p.governorate ?? "");
          setLatitude(p.latitude == null ? "" : String(p.latitude));
          setLongitude(p.longitude == null ? "" : String(p.longitude));
          setServiceRadiusKm(String(p.service_radius_km ?? 50));
          setLicensesText(p.licenses_text ?? "");
          setInsuranceText(p.insurance_text ?? "");
          setFoundedYear(p.founded_year == null ? "" : String(p.founded_year));
          setTeamSize(p.team_size == null ? "" : String(p.team_size));
          setIsBusiness(Boolean(p.is_business));
        } else if (!isGlobal && country) {
          setCountryCode(country);
          setGovernorate(selectedGovernorate);
          setCityId(city);
          setDistrictId(selectedDistrict);
          setLatitude(selectedLatitude == null ? "" : String(selectedLatitude));
          setLongitude(selectedLongitude == null ? "" : String(selectedLongitude));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [city, country, isGlobal, selectedDistrict, selectedGovernorate, selectedLatitude, selectedLongitude]);

  useEffect(() => {
    if (!viewer.authenticated) return;
    return load();
  }, [load, viewer.authenticated]);

  const saveProfile = async () => {
    setBusy(true);
    setMessage("");
    if (!countryCode) {
      setMessage("اختر دولة وموقعًا محليًا قبل حفظ الملف المهني.");
      setBusy(false);
      return;
    }
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
          email: email.trim() || null,
          website: website.trim() || null,
          countryCode,
          cityId: cityId.trim() || null,
          districtId: districtId.trim() || null,
          governorate: governorate.trim() || null,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          serviceRadiusKm: serviceRadiusKm ? Number(serviceRadiusKm) : 50,
          licensesText: licensesText.trim() || null,
          insuranceText: insuranceText.trim() || null,
          foundedYear: foundedYear ? Number(foundedYear) : null,
          teamSize: teamSize ? Number(teamSize) : null,
          isBusiness,
        }),
      });
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("services.error") ?? "تعذر حفظ الملف");
      setBusy(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
      },
      () => setMessage("تعذر تحديد الموقع. يمكنك إدخال الإحداثيات يدويًا."),
      { enableHighAccuracy: true, timeout: 12000 },
    );
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
          instantPrice: newCatInstantPrice ? Number(newCatInstantPrice) : null,
          currency: newCatInstantPrice ? newCatCurrency || null : null,
        }),
      });
      setNewCategoryId("");
      setNewCatPriceFrom("");
      setNewCatPriceTo("");
      setNewCatInstantPrice("");
      setNewCatCurrency("");
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("services.error") ?? "تعذر إضافة المهنة");
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
      setMessage(e instanceof Error ? e.message : t("services.error") ?? "تعذر إضافة العمل");
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
      setMessage(e instanceof Error ? e.message : t("services.error") ?? "تعذر إرسال الملف للمراجعة");
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-gray-400";
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
      <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={rawT} active="provider-profile">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900 dark:text-[var(--color-surface)]">{t("services.providerProfile") ?? "ملف مقدم الخدمة"}</h2>
          {profile && <ProviderStatusPill status={profile.status} locale={locale} />}
        </div>

        {message && <div className="mb-4 px-4 py-3 bg-[var(--color-error-soft)] dark:bg-red-900/30 text-[var(--color-error)] dark:text-[var(--color-error)] rounded-lg text-sm">{message}</div>}

        {loading ? (
          <div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ) : (
          <>
            <div className="bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
              <div className="rounded-xl border border-blue-100 bg-[var(--color-primary-soft)] p-4 dark:border-[var(--color-primary)]/30 dark:bg-[var(--color-primary-soft)]/30">
                <p className="text-sm font-black text-[var(--color-text-primary)] dark:text-[var(--color-primary)]/80">بيانات هذا النموذج هي نفسها التي تظهر في سوق الخدمات</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-primary)] dark:text-[var(--color-primary)]">المهنة والموقع ونطاق الخدمة والأسعار تُستخدم لمطابقة ملفك مع طلبات العملاء؛ أكملها بدقة قبل إرسال الملف للمراجعة.</p>
              </div>
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
                <label className="flex items-center gap-3 self-end rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 dark:border-gray-700 dark:text-gray-200">
                  <input type="checkbox" checked={isBusiness} onChange={(event) => setIsBusiness(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)]" />
                  التسجيل كشركة أو فريق خدمات
                </label>
                <div>
                  <label className={labelCls}>المحافظة</label>
                  <input value={governorate} onChange={(e) => setGovernorate(e.target.value)} className={inputCls} placeholder="مسقط" />
                </div>
                <div>
                  <label className={labelCls}>{t("services.city") ?? "الولاية / المدينة"}</label>
                  <input value={cityId} onChange={(e) => setCityId(e.target.value)} className={inputCls} placeholder="بوشر" />
                </div>
                <div>
                  <label className={labelCls}>المنطقة / الحي</label>
                  <input value={districtId} onChange={(e) => setDistrictId(e.target.value)} className={inputCls} placeholder="الخوير" />
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
                  <label className={labelCls}>البريد الإلكتروني المهني</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>الموقع الإلكتروني</label>
                  <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://" dir="ltr" />
                </div>
                <div>
                  <label className={labelCls}>{t("services.radius") ?? "نطاق الخدمة (كم)"}</label>
                  <input type="number" min={1} value={serviceRadiusKm} onChange={(e) => setServiceRadiusKm(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>سنة تأسيس النشاط</label>
                  <input type="number" min={1900} max={new Date().getFullYear()} value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>حجم الفريق</label>
                  <input type="number" min={1} value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-black text-gray-800 dark:text-gray-100">مركز نطاق الخدمة</p><p className="text-xs text-gray-500">تُستخدم الإحداثيات مع النطاق أعلاه لإرسال الطلبات القريبة إليك.</p></div><button type="button" onClick={useCurrentLocation} className="rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3 py-2 text-xs font-black text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] dark:border-[var(--color-primary)]/30 dark:bg-[var(--color-primary-soft)]/40 dark:text-[var(--color-primary)]">استخدم موقعي الحالي</button></div>
                <div className="grid gap-3 sm:grid-cols-2"><div><label className={labelCls}>خط العرض</label><input inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} className={inputCls} placeholder="23.5880" dir="ltr" /></div><div><label className={labelCls}>خط الطول</label><input inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} className={inputCls} placeholder="58.3829" dir="ltr" /></div></div>
              </div>
              <div>
                <label className={labelCls}>{t("services.bioAr") ?? "نبذة (عربي)"}</label>
                <textarea value={bioAr} onChange={(e) => setBioAr(e.target.value)} rows={3} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t("services.bioEn") ?? "نبذة (إنجليزي)"}</label>
                <textarea value={bioEn} onChange={(e) => setBioEn(e.target.value)} rows={3} className={inputCls} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={labelCls}>التراخيص والشهادات</label><textarea value={licensesText} onChange={(event) => setLicensesText(event.target.value)} rows={3} className={inputCls} placeholder="رقم الترخيص، الجهة، تاريخ الصلاحية..." /></div>
                <div><label className={labelCls}>التأمين أو الضمان المهني</label><textarea value={insuranceText} onChange={(event) => setInsuranceText(event.target.value)} rows={3} className={inputCls} placeholder="بيانات وثيقة التأمين أو الضمان إن وجدت" /></div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => void saveProfile()} disabled={busy} className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white text-sm font-bold transition">
                  {t("services.save") ?? "حفظ الملف"}
                </button>
                {profile && (profile.status === "draft" || profile.status === "rejected") && (
                  <button onClick={() => void apply()} disabled={busy} className="px-5 py-2.5 rounded-xl bg-[var(--color-success)] hover:bg-[var(--color-success)]/80 disabled:opacity-50 text-white text-sm font-bold transition">
                    {t("services.applyProvider") ?? "إرسال للمراجعة"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">{t("services.myCategories") ?? "تصنيفاتي"}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {myCategories.map((cat) => (
                  <span key={String(cat.id)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-soft)]/30 text-[var(--color-primary)] dark:text-[var(--color-primary)] text-sm font-semibold">
                    {nameFor(locale, cat.category_name_ar, cat.category_name_en, null, String(cat.id).slice(0, 6))}
                    {profile && (
                      <button
                        onClick={() => {
                          void apiFetch(`/api/service-providers/${encodeURIComponent(profile.id)}/categories?categoryId=${encodeURIComponent(String(cat.id))}`, { method: "DELETE" }).then(() => window.location.reload());
                        }}
                        className="text-red-500 hover:text-[var(--color-error)]"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} className={inputCls}>
                  <option value="">{t("services.selectCategory") ?? "اختر تصنيفاً..."}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{nameFor(locale, c.name_ar, c.name_en, c.name_tr, c.code)}</option>
                  ))}
                </select>
                <input type="number" min={0} value={newCatPriceFrom} onChange={(e) => setNewCatPriceFrom(e.target.value)} placeholder="سعر من" className={inputCls} />
                <input type="number" min={0} value={newCatPriceTo} onChange={(e) => setNewCatPriceTo(e.target.value)} placeholder="سعر إلى" className={inputCls} />
                <input type="number" min={1} value={newCatInstantPrice} onChange={(e) => setNewCatInstantPrice(e.target.value)} placeholder="سعر الحجز المباشر" className={inputCls} />
                <select value={newCatCurrency} onChange={(event) => setNewCatCurrency(event.target.value)} className={inputCls}>
                  <option value="">عملة الحجز</option>
                  {["OMR", "SAR", "AED", "USD", "EUR", "TRY"].map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </div>
              <p className="mt-2 text-xs text-gray-500">سعر الحجز المباشر وعملته مطلوبان فقط للمهن التي تدعم الحجز الفوري. هذا هو السعر الذي سيُحفظ داخل الحجز.</p>
              <button onClick={() => void addCategory()} disabled={busy || !newCategoryId || Boolean(newCatInstantPrice && !newCatCurrency)} className="mt-3 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white text-sm font-bold transition">
                {t("services.addCategory") ?? "إضافة تصنيف"}
              </button>
            </div>

            <div className="mt-6 bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h3 className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">{t("services.portfolio") ?? "أعمال سابقة"}</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <input value={portfolioTitle} onChange={(e) => setPortfolioTitle(e.target.value)} placeholder={t("services.portfolioTitle") ?? "عنوان العمل"} className={inputCls} />
                <input value={portfolioImage} onChange={(e) => setPortfolioImage(e.target.value)} placeholder="https://.../image.jpg" className={inputCls} />
                <input value={portfolioDesc} onChange={(e) => setPortfolioDesc(e.target.value)} placeholder={t("services.portfolioDesc") ?? "وصف مختصر"} className={inputCls} />
              </div>
              <button onClick={() => void addPortfolio()} disabled={busy || !portfolioTitle.trim()} className="mt-3 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white text-sm font-bold transition">
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
