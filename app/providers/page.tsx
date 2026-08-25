"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { BadgeCheck, MapPin, Search, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";

import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { ProviderCard, type CategoryRow, type ProviderRow } from "@services-ui/ServiceCards";
import { apiFetch, nameFor } from "@services-client";

export default function ProvidersPage() {
  const {
    locale, viewer, copy, dir, country, city, governorate, district,
    latitude, longitude, isGlobal, openLogin, handleLogout, AccountDialog,
  } = useServicesPage();
  const isArabic = locale === "ar";
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const requestedCategoryId = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get("categoryId") ?? "",
    () => "",
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const categoryId = selectedCategoryId ?? requestedCategoryId;
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (!isGlobal && country) params.set("country", country.toUpperCase());
    const queryString = params.size ? `?${params.toString()}` : "";
    apiFetch<{ categories: CategoryRow[] }>(`/api/service-categories${queryString}`).then((data) => {
      if (active) setCategories(data.categories?.filter((category) => category.parent_id) ?? []);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [country, isGlobal]);

  useEffect(() => {
    let active = true;
    async function loadProviders() {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      const params = new URLSearchParams({ limit: "100", scope: isGlobal ? "global" : "local" });
      if (!isGlobal) {
        params.set("country", country);
        if (governorate) params.set("governorate", governorate);
        if (city) params.set("cityId", city);
        if (district) params.set("districtId", district);
        if (latitude != null && longitude != null) {
          params.set("latitude", String(latitude));
          params.set("longitude", String(longitude));
          params.set("radiusKm", "10");
        }
      }
      if (categoryId) params.set("categoryId", categoryId);
      try {
        const data = await apiFetch<{ profiles: ProviderRow[] }>(`/api/service-providers?${params.toString()}`);
        if (active) setProviders(data.profiles ?? []);
      } catch {
        if (active) setProviders([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProviders();
    return () => { active = false; };
  }, [categoryId, city, country, district, governorate, isGlobal, latitude, longitude]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const areaQuery = location.trim().toLocaleLowerCase();
    return providers.filter((provider) => {
      const profile = [provider.business_name, provider.display_name_ar, provider.display_name_en, provider.bio_ar, provider.bio_en].filter(Boolean).join(" ").toLocaleLowerCase();
      const area = [provider.governorate, provider.city_id].filter(Boolean).join(" ").toLocaleLowerCase();
      return (!q || profile.includes(q)) && (!areaQuery || area.includes(areaQuery));
    });
  }, [location, providers, query]);

  return (
    <>
      <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} currentPath="/providers" adLayout={{ mode: "standard", family: "providers" }} onLogin={() => openLogin("login")} onLogout={handleLogout}>
        <main dir={dir} className="space-y-8 pb-12 pt-6">
          <section className="relative overflow-hidden rounded-3xl bg-[var(--color-surface)] px-5 py-8 text-white md:px-8 md:py-10">
            <div className="absolute -end-20 -top-24 h-64 w-64 rounded-full bg-[var(--color-primary)]/30 blur-3xl" />
            <div className="relative"><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[var(--color-surface)]/5 px-3 py-1.5 text-xs font-bold text-blue-200"><BadgeCheck className="h-4 w-4" />{isArabic ? "دليل المحترفين المعتمدين" : "Approved professional directory"}</div><h1 className="mt-4 text-3xl font-black md:text-4xl">{isArabic ? "ابحث عن المحترف المناسب لعقارك" : "Find the right professional for your property"}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-muted)]">{isArabic ? "قارن الخبرة والتقييم وسجل الإنجاز ونطاق الخدمة، ثم تواصل أو اطلب عرضًا داخل المنصة." : "Compare experience, reviews, completed work and service area."}</p></div>
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]">
            <div className="grid gap-3 lg:grid-cols-[1fr_0.7fr_0.7fr]">
              <label className="flex h-12 items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 focus-within:border-[var(--color-primary)] dark:border-[var(--color-border)]"><Search className="h-5 w-5 text-[var(--color-primary)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none dark:text-[var(--color-surface)]" placeholder={isArabic ? "اسم المحترف أو الشركة" : "Professional or company"} /></label>
              <label className="flex h-12 items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 focus-within:border-[var(--color-primary)] dark:border-[var(--color-border)]"><MapPin className="h-5 w-5 text-[var(--color-primary)]" /><input value={location} onChange={(event) => setLocation(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none dark:text-[var(--color-surface)]" placeholder={isArabic ? "المحافظة أو الولاية" : "Governorate or city"} /></label>
              <label className="flex h-12 items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 dark:border-[var(--color-border)]"><SlidersHorizontal className="h-4 w-4 text-[var(--color-primary)]" /><select value={categoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[var(--color-text-secondary)] outline-none dark:text-[var(--color-surface-muted)]"><option value="">{isArabic ? "جميع المهن" : "All services"}</option>{categories.map((category) => <option key={category.id} value={category.id}>{nameFor(locale, category.name_ar, category.name_en, category.name_tr, category.code)}</option>)}</select></label>
            </div>
          </section>

          <section>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 className="flex items-center gap-2 text-xl font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface)]"><Users className="h-5 w-5 text-[var(--color-primary)]" />{isArabic ? "المحترفون" : "Professionals"}</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">{loading ? (isArabic ? "جارٍ البحث..." : "Searching...") : `${filtered.length} ${isArabic ? "نتيجة مطابقة" : "matching results"}`}</p></div><Link href="/providers/apply" className="rounded-xl bg-[var(--color-success)] px-4 py-2.5 text-xs font-black text-white hover:bg-[var(--color-success)]/80">{isArabic ? "سجّل كحرفي أو شركة" : "Join as a professional"}</Link></div>
            {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-48 animate-pulse rounded-2xl bg-[var(--color-background)] dark:bg-[var(--color-surface)]" />)}</div> : filtered.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((provider, index) => <ProviderCard key={provider.id} provider={provider} locale={locale} index={index} />)}</div> : <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] py-12 text-center dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]/50"><ShieldCheck className="mx-auto h-9 w-9 text-[var(--color-text-muted)]" /><h3 className="mt-3 font-black text-[var(--color-text-secondary)] dark:text-[var(--color-surface-muted)]">{isArabic ? "لا توجد ملفات مطابقة الآن" : "No matching profiles yet"}</h3><p className="mt-1 text-sm text-[var(--color-text-muted)]">{isArabic ? "جرّب توسيع البحث أو انشر طلب خدمة ليصل إلى المحترفين المناسبين." : "Broaden your search or post a service request."}</p><Link href="/service-requests/new" className="mt-4 inline-block text-sm font-black text-[var(--color-primary)] hover:underline dark:text-[var(--color-primary)]">{isArabic ? "انشر طلب خدمة" : "Post a request"}</Link></div>}
          </section>
        </main>
      </PublicPageShell>
      {AccountDialog}
    </>
  );
}
