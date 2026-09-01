"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MapPin, Search, SlidersHorizontal, Users, Wrench } from "lucide-react";

import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { CategoryCard, ProviderCard, ServiceCategoryIcon, type CategoryRow, type ProviderRow } from "@services-ui/ServiceCards";
import { apiFetch, nameFor } from "@services-client";

export default function ServicesCatalogPage() {
  const {
    locale, viewer, dir, country, city, governorate, district,
    latitude, longitude, isGlobal, openLogin, handleLogout, AccountDialog, copy,
  } = useServicesPage();
  const isArabic = locale === "ar";
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [groupId, setGroupId] = useState("");
  const [mode, setMode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    window.queueMicrotask(() => {
      setQuery(params.get("q") ?? "");
      setLocation(params.get("location") ?? "");
    });
  }, []);

  useEffect(() => {
    let active = true;
    const categoryParams = new URLSearchParams();
    if (!isGlobal && country) categoryParams.set("country", country.toUpperCase());
    const providerParams = new URLSearchParams({ limit: "100", scope: isGlobal ? "global" : "local" });
    if (!isGlobal) {
      providerParams.set("country", country);
      if (governorate) providerParams.set("governorate", governorate);
      if (city) providerParams.set("cityId", city);
      if (district) providerParams.set("districtId", district);
      if (latitude != null && longitude != null) {
        providerParams.set("latitude", String(latitude));
        providerParams.set("longitude", String(longitude));
        providerParams.set("radiusKm", "10");
      }
    }
    const categorySuffix = categoryParams.size ? `?${categoryParams.toString()}` : "";
    Promise.allSettled([
      apiFetch<{ categories: CategoryRow[] }>(`/api/service-categories${categorySuffix}`),
      apiFetch<{ profiles: ProviderRow[] }>(`/api/service-providers?${providerParams.toString()}`),
    ]).then(([categoryResult, providerResult]) => {
      if (!active) return;
      if (categoryResult.status === "fulfilled") setCategories(categoryResult.value.categories ?? []);
      if (providerResult.status === "fulfilled") setProviders(providerResult.value.profiles ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [city, country, district, governorate, isGlobal, latitude, longitude]);

  const groups = useMemo(() => categories.filter((category) => !category.parent_id), [categories]);
  const leaves = useMemo(() => categories.filter((category) => category.parent_id), [categories]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const normalizedLocation = location.trim().toLocaleLowerCase();
  const visibleCategories = useMemo(() => leaves.filter((category) => {
    if (groupId && category.parent_id !== groupId) return false;
    if (mode && category.booking_mode !== mode && category.booking_mode !== "both") return false;
    if (!normalizedQuery) return true;
    const text = [category.name_ar, category.name_en, category.name_tr, category.description_ar, category.description_en].filter(Boolean).join(" ").toLocaleLowerCase();
    return text.includes(normalizedQuery);
  }), [groupId, leaves, mode, normalizedQuery]);
  const visibleProviders = useMemo(() => providers.filter((provider) => {
    const text = [provider.business_name, provider.display_name_ar, provider.display_name_en, provider.bio_ar, provider.bio_en].filter(Boolean).join(" ").toLocaleLowerCase();
    const area = [provider.governorate, provider.city_id].filter(Boolean).join(" ").toLocaleLowerCase();
    return (!normalizedQuery || text.includes(normalizedQuery)) && (!normalizedLocation || area.includes(normalizedLocation));
  }), [normalizedLocation, normalizedQuery, providers]);

  const inputClass = "h-12 w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] dark:text-[var(--color-text-primary)]";

  return (
    <>
      <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} currentPath="/services/catalog" adLayout={{ mode: "standard", family: "services" }} onLogin={() => openLogin("login")} onLogout={handleLogout}>
        <main dir={dir} className="pb-12 pt-6">
          <Link href="/services" className="inline-flex items-center gap-1.5 text-sm font-black text-[var(--color-primary)] hover:underline dark:text-[var(--color-primary)]"><ArrowRight className="h-4 w-4" />{isArabic ? "سوق الخدمات" : "Services market"}</Link>

          <section className="mt-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] md:p-7">
            <p className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">{isArabic ? "دليل عقار بروماكس" : "AkarProMax directory"}</p>
            <h1 className="mt-1 text-3xl font-black text-[var(--color-text-primary)] dark:text-[var(--color-text-primary)]">{isArabic ? "ابحث في جميع المهن والمحترفين" : "Search every service and professional"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">{isArabic ? "استخدم البحث والتصفية للوصول إلى الخدمة المناسبة، ثم احجزها أو انشر طلبًا لاستقبال العروض." : "Filter the directory, book a service or post a request for quotes."}</p>

            <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_0.65fr]">
              <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] px-4 focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-blue-100 dark:border-[var(--color-border)] dark:focus-within:ring-blue-950"><Search className="h-5 w-5 shrink-0 text-[var(--color-primary)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder={isArabic ? "ابحث: تكييف، كهرباء، تنظيف..." : "Search services or professionals..."} /></label>
              <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] px-4 focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-blue-100 dark:border-[var(--color-border)] dark:focus-within:ring-blue-950"><MapPin className="h-5 w-5 shrink-0 text-[var(--color-primary)]" /><input value={location} onChange={(event) => setLocation(event.target.value)} className={inputClass} placeholder={isArabic ? "المحافظة أو الولاية" : "Governorate or city"} /></label>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-black text-[var(--color-text-primary)] dark:text-[var(--color-text-primary)]"><Wrench className="h-5 w-5 text-[var(--color-primary)]" />{isArabic ? "المهن والخدمات" : "Services"}</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">{visibleCategories.length} {isArabic ? "خدمة مطابقة" : "matching services"}</p></div><div className="flex flex-wrap gap-2"><label className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]"><SlidersHorizontal className="h-4 w-4 text-[var(--color-text-muted)]" /><select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="h-10 bg-transparent text-xs font-bold text-[var(--color-text-secondary)] outline-none dark:text-[var(--color-surface-muted)]"><option value="">{isArabic ? "جميع الأقسام" : "All groups"}</option>{groups.map((group) => <option key={group.id} value={group.id}>{nameFor(locale, group.name_ar, group.name_en, group.name_tr, group.code)}</option>)}</select></label><select value={mode} onChange={(event) => setMode(event.target.value)} className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-bold text-[var(--color-text-secondary)] outline-none dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] dark:text-[var(--color-surface-muted)]"><option value="">{isArabic ? "كل طرق الطلب" : "All booking modes"}</option><option value="instant">{isArabic ? "حجز مباشر" : "Instant booking"}</option><option value="quotes">{isArabic ? "طلب عروض" : "Request quotes"}</option></select></div></div>

            {groups.length > 0 && <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{groups.map((group) => <button key={group.id} onClick={() => setGroupId(groupId === group.id ? "" : group.id)} className={`flex items-center gap-3 rounded-2xl border p-3 text-start transition ${groupId === group.id ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/30 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] dark:text-[var(--color-surface-muted)]"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${groupId === group.id ? "bg-[var(--color-surface)]/15" : "bg-[var(--color-primary-soft)] text-[var(--color-primary)] dark:bg-blue-950/50 dark:text-[var(--color-primary)]"}`}><ServiceCategoryIcon name={group.icon} className="h-4.5 w-4.5" /></span><span className="text-xs font-black leading-5">{nameFor(locale, group.name_ar, group.name_en, group.name_tr, group.code)}</span></button>)}</div>}

            {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 9 }, (_, index) => <div key={index} className="h-48 animate-pulse rounded-2xl bg-[var(--color-background)] dark:bg-[var(--color-surface)]" />)}</div> : visibleCategories.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleCategories.map((category) => <CategoryCard key={category.id} category={category} locale={locale} />)}</div> : <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-12 text-center text-sm font-bold text-[var(--color-text-muted)] dark:border-[var(--color-border)]">{isArabic ? "لم نجد خدمة مطابقة. جرّب كلمة أو قسمًا آخر." : "No matching services. Try another search."}</div>}
          </section>

          <section className="mt-12">
            <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="flex items-center gap-2 text-xl font-black text-[var(--color-text-primary)] dark:text-[var(--color-text-primary)]"><Users className="h-5 w-5 text-[var(--color-primary)]" />{isArabic ? "محترفون مناسبون" : "Matching professionals"}</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">{visibleProviders.length} {isArabic ? "ملف معتمد" : "approved profiles"}</p></div><Link href="/providers/apply" className="text-xs font-black text-[var(--color-success)] hover:underline dark:text-[var(--color-success)]">{isArabic ? "سجّل مهنتك" : "List your profession"}</Link></div>
            {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl bg-[var(--color-background)] dark:bg-[var(--color-surface)]" />)}</div> : visibleProviders.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleProviders.map((provider, index) => <ProviderCard key={provider.id} provider={provider} locale={locale} index={index} />)}</div> : <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-10 text-center dark:border-[var(--color-border)]"><Users className="mx-auto h-7 w-7 text-[var(--color-text-muted)]" /><p className="mt-2 text-sm font-bold text-[var(--color-text-muted)]">{isArabic ? "لا يوجد محترفون مطابقون لهذا البحث حاليًا." : "No professionals match this search yet."}</p></div>}
          </section>
        </main>
      </PublicPageShell>
      {AccountDialog}
    </>
  );
}
