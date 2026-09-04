"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, MapPin, ShieldCheck, WalletCards } from "lucide-react";

import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { apiFetch } from "@services-client";

type ProviderCategory = {
  id: string;
  category_id: string;
  category_name_ar?: string | null;
  category_name_en?: string | null;
  booking_mode?: "instant" | "quotes" | "both";
  instant_price?: number | null;
  currency?: string | null;
  pricing_unit?: string | null;
};

type ProviderPayload = {
  profile: { id: string; business_name?: string | null; display_name_ar?: string | null; display_name_en?: string | null };
  categories: ProviderCategory[];
};

const inputClass = "h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]";

export default function NewDirectBookingPage() {
  const { locale, viewer, copy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();
  const isArabic = locale === "ar";
  const [payload, setPayload] = useState<ProviderPayload | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [shortAddress, setShortAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [contactPreference, setContactPreference] = useState("platform");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const providerId = query.get("provider") ?? "";
    const requestedCategory = query.get("category") ?? "";
    let active = true;
    async function loadProvider() {
      await Promise.resolve();
      if (!active) return;
      if (!providerId) { setLoading(false); return; }
      try {
        const data = await apiFetch<ProviderPayload>(`/api/service-providers/${encodeURIComponent(providerId)}`);
        if (!active) return;
        setPayload(data);
        const eligible = (data.categories ?? []).filter((item) => ["instant", "both"].includes(item.booking_mode ?? "") && Number(item.instant_price) > 0 && item.currency);
        setCategoryId(eligible.some((item) => item.category_id === requestedCategory) ? requestedCategory : eligible[0]?.category_id ?? "");
      } catch {
        if (active) setPayload(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProvider();
    return () => { active = false; };
  }, []);

  const selected = useMemo(() => payload?.categories.find((item) => item.category_id === categoryId) ?? null, [categoryId, payload]);
  const eligible = useMemo(() => payload?.categories.filter((item) => ["instant", "both"].includes(item.booking_mode ?? "") && Number(item.instant_price) > 0 && item.currency) ?? [], [payload]);
  const providerName = payload?.profile.business_name || (isArabic ? payload?.profile.display_name_ar : payload?.profile.display_name_en) || payload?.profile.display_name_ar || payload?.profile.display_name_en || "مقدم الخدمة";

  const submit = async () => {
    if (!viewer.authenticated) { openLogin("login"); return; }
    if (!payload || !selected) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await apiFetch<{ id: string }>("/api/service-bookings", {
        method: "POST",
        body: JSON.stringify({
          providerId: payload.profile.id,
          categoryId: selected.category_id,
          countryCode: country || "OM",
          cityId: cityId.trim(),
          districtId: districtId.trim() || null,
          shortAddress: shortAddress.trim() || null,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          scheduledAt,
          contactPreference,
          contactPhone: contactPhone.trim() || null,
          contactEmail: contactEmail.trim() || null,
        }),
      });
      window.location.href = `/dashboard/services/jobs/${encodeURIComponent(result.id)}`;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isArabic ? "تعذر تأكيد الحجز" : "Could not confirm booking"));
      setBusy(false);
    }
  };

  return (
    <>
      <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} currentPath="/service-bookings/new" adLayout={{ mode: "standard", family: "services" }} onLogin={() => openLogin("login")} onLogout={handleLogout}>
        <main dir={dir} className="space-y-5 pb-12 pt-6">
          <section className="rounded-3xl bg-gradient-to-l from-[color:var(--brand-navy)] to-[color:var(--color-primary)] p-6 text-white md:p-8">
            <div className="flex items-center gap-2 text-sm font-black text-blue-100"><CalendarClock className="h-5 w-5" />{isArabic ? "الحجز المباشر" : "Direct booking"}</div>
            <h1 className="mt-3 text-2xl font-black md:text-3xl">{isArabic ? `احجز موعدًا مع ${providerName}` : `Book an appointment with ${providerName}`}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-blue-100">{isArabic ? "اختر الموعد والموقع، وسيُثبت السعر الظاهر الآن داخل الحجز حتى لو تغيّر سعر الخدمة لاحقًا." : "Choose a time and location. The current price is captured and will not change later."}</p>
          </section>

          {loading ? <div className="h-72 animate-pulse rounded-3xl bg-[var(--color-surface-muted)]" /> : !payload || eligible.length === 0 ? (
            <section className="rounded-3xl border border-dashed border-[var(--color-border)] p-10 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-[var(--color-text-muted)]" />
              <h2 className="mt-3 font-black">{isArabic ? "الحجز المباشر غير متاح لهذه الخدمة" : "Direct booking is unavailable"}</h2>
              <Link href="/service-requests/new" className="mt-4 inline-block font-black text-[var(--color-primary)]">{isArabic ? "أنشئ طلب عروض بدلًا من ذلك" : "Create an RFQ instead"}</Link>
            </section>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              <section className="space-y-5 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6">
                {message && <div className="rounded-xl bg-[var(--color-error-soft)] px-4 py-3 text-sm font-bold text-[var(--color-error)]">{message}</div>}
                <div>
                  <label className="text-xs font-black text-[var(--color-text-secondary)]">{isArabic ? "الخدمة" : "Service"}</label>
                  <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={`${inputClass} mt-1`}>
                    {eligible.map((item) => <option key={item.id} value={item.category_id}>{(isArabic ? item.category_name_ar : item.category_name_en) || item.category_name_ar || item.category_name_en}</option>)}
                  </select>
                </div>
                {selected?.booking_mode === "both" && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] p-4 text-sm">
                    <span className="font-bold">{isArabic ? "هذه الخدمة تدعم الحجز المباشر وطلب العروض." : "This service supports booking and RFQ."}</span>
                    <Link href={`/service-requests/new?category=${encodeURIComponent(selected.category_id)}`} className="font-black text-[var(--color-primary)]">{isArabic ? "استخدم طلب العروض" : "Use RFQ"}</Link>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="text-xs font-black">{isArabic ? "المدينة/الولاية" : "City"}</label><input value={cityId} onChange={(event) => setCityId(event.target.value)} className={`${inputClass} mt-1`} required /></div>
                  <div><label className="text-xs font-black">{isArabic ? "الحي" : "District"}</label><input value={districtId} onChange={(event) => setDistrictId(event.target.value)} className={`${inputClass} mt-1`} /></div>
                </div>
                <div><label className="text-xs font-black">{isArabic ? "العنوان التفصيلي" : "Detailed address"}</label><input value={shortAddress} onChange={(event) => setShortAddress(event.target.value)} className={`${inputClass} mt-1`} /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="text-xs font-black">Latitude</label><input type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} className={`${inputClass} mt-1`} /></div>
                  <div><label className="text-xs font-black">Longitude</label><input type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} className={`${inputClass} mt-1`} /></div>
                </div>
                <div><label className="text-xs font-black">{isArabic ? "التاريخ والوقت" : "Date and time"}</label><input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className={`${inputClass} mt-1`} /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="text-xs font-black">{isArabic ? "طريقة التواصل" : "Contact method"}</label><select value={contactPreference} onChange={(event) => setContactPreference(event.target.value)} className={`${inputClass} mt-1`}><option value="platform">{isArabic ? "داخل المنصة" : "Platform"}</option><option value="phone">{isArabic ? "هاتف" : "Phone"}</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></div>
                  <div><label className="text-xs font-black">{isArabic ? "رقم التواصل" : "Contact phone"}</label><input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className={`${inputClass} mt-1`} /></div>
                </div>
                <div><label className="text-xs font-black">Email</label><input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className={`${inputClass} mt-1`} /></div>
              </section>

              <aside className="h-fit rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
                <h2 className="font-black">{isArabic ? "ملخص الحجز" : "Booking summary"}</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-[var(--color-text-muted)]">{isArabic ? "مقدم الخدمة" : "Provider"}</span><strong>{providerName}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-[var(--color-text-muted)]">{isArabic ? "السعر المثبت" : "Price snapshot"}</span><strong className="text-[var(--color-primary)]">{selected?.instant_price} {selected?.currency}</strong></div>
                  <div className="flex items-center gap-2 rounded-xl bg-[var(--color-success-soft)] p-3 text-xs font-bold text-[var(--color-success)]"><CheckCircle2 className="h-4 w-4" />{isArabic ? "لن يتغير سعر هذا الحجز لاحقًا" : "This booking price will not change"}</div>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]"><MapPin className="h-4 w-4" />{isArabic ? "الموقع الدقيق لا يظهر للمقدم قبل قبول الحجز" : "Exact location is hidden until acceptance"}</div>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]"><WalletCards className="h-4 w-4" />{isArabic ? "لا يتم إنشاء طلب عروض أو عرض وهمي" : "No synthetic RFQ or offer is created"}</div>
                </div>
                <button onClick={() => void submit()} disabled={busy || !cityId.trim() || !scheduledAt || !selected} className="mt-5 w-full rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{viewer.authenticated ? (isArabic ? "تأكيد الحجز" : "Confirm booking") : (isArabic ? "سجل الدخول للحجز" : "Sign in to book")}</button>
              </aside>
            </div>
          )}
        </main>
      </PublicPageShell>
      {AccountDialog}
    </>
  );
}
