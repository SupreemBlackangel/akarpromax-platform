"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { ProviderCard, RequestCard, ServiceCategoryIcon, type CategoryRow, type ProviderRow, type RequestRow } from "@services-ui/ServiceCards";
import { apiFetch, nameFor } from "@services-client";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";

export default function ServicesHubPage() {
  const {
    locale, viewer, dir, country, city, governorate, district,
    isGlobal, openLogin, handleLogout, AccountDialog, copy,
  } = useServicesPage();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const providerParams = new URLSearchParams({ limit: "6", scope: isGlobal ? "global" : "local" });
    const requestParams = new URLSearchParams({ status: "published", limit: "6", scope: isGlobal ? "global" : "local" });
    if (!isGlobal) {
      for (const params of [providerParams, requestParams]) params.set("country", country);
      if (governorate) {
        providerParams.set("governorate", governorate);
        requestParams.set("governorate", governorate);
      }
      if (city) {
        providerParams.set("cityId", city);
        requestParams.set("cityId", city);
      }
      if (district) {
        providerParams.set("districtId", district);
        requestParams.set("districtId", district);
      }
    }
    // The taxonomy is per country: every country carries its own copy of the
    // same trades, keyed (country_code, code). Fetching it unscoped was
    // harmless while only Oman had one; the moment Saudi Arabia's was seeded
    // this page began listing all ten groups twice, once per country. Every
    // other services page already scopes it, and now so does this one.
    const categorySuffix = !isGlobal && country ? `?country=${encodeURIComponent(country)}` : "";
    Promise.allSettled([
      apiFetch<{ categories: CategoryRow[] }>(`/api/service-categories${categorySuffix}`),
      apiFetch<{ profiles: ProviderRow[] }>(`/api/service-providers?${providerParams.toString()}`),
      apiFetch<{ requests: RequestRow[] }>(`/api/service-requests?${requestParams.toString()}`),
    ]).then(([categoryResult, providerResult, requestResult]) => {
      if (!active) return;
      if (categoryResult.status === "fulfilled") setCategories(categoryResult.value.categories ?? []);
      if (providerResult.status === "fulfilled") setProviders(providerResult.value.profiles ?? []);
      if (requestResult.status === "fulfilled") setRequests(requestResult.value.requests ?? []);
      if (categoryResult.status === "rejected" && providerResult.status === "rejected" && requestResult.status === "rejected") {
        setError(locale === "ar" ? "تعذر تحميل بيانات سوق الخدمات، حاول تحديث الصفحة." : locale === "tr" ? "Hizmet pazarı verileri yüklenemedi." : "Could not load the services market data.");
      }
      setDataLoading(false);
    });
    return () => { active = false; };
  }, [locale, country, city, governorate, district, isGlobal]);

  // Groups are the top-level rows (no parent); professions are their children.
  const groups = useMemo(() => {
    // Browsing globally returns every country's copy of the same trade, so the
    // list is folded by code — the group's identity is its trade, not the
    // country whose row happened to arrive first.
    const byCode = new Map<string, CategoryRow>();
    for (const category of categories) {
      if (category.parent_id) continue;
      const key = String(category.code ?? category.id);
      if (!byCode.has(key)) byCode.set(key, category);
    }
    return [...byCode.values()].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  }, [categories]);
  // The card resolves a request's category through this. Without it the card
  // has nothing to print but the raw id.
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const selectedGroupId = activeGroup ?? groups[0]?.id ?? null;
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;
  const professions = useMemo(
    () => categories
      .filter((category) => category.parent_id === selectedGroupId)
      .sort((a, b) => Number(b.is_featured ?? 0) - Number(a.is_featured ?? 0) || Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)),
    [categories, selectedGroupId],
  );

  // One line per idea: each section used to repeat its own heading as a
  // kicker above itself.
  const viewAllLabel = locale === "ar" ? "عرض الكل" : locale === "tr" ? "Tümünü Gör" : "View all";
  const featuredProvidersLabel = locale === "ar" ? "مزوّدون موثوقون" : locale === "tr" ? "Güvenilir sağlayıcılar" : "Trusted providers";
  const recentRequestsLabel = locale === "ar" ? "أحدث الطلبات" : locale === "tr" ? "Son talepler" : "Recent requests";
  const providerCtaLabel = locale === "ar" ? "هل أنت مقدم خدمة محترف؟" : locale === "tr" ? "Profesyonel bir hizmet sağlayıcı mısınız?" : "Are you a professional service provider?";
  const providerCtaSubLabel = locale === "ar" ? "أنشئ ملفك واستقبل طلبات منطقتك." : locale === "tr" ? "Profilinizi oluşturun, bölgenizdeki talepleri alın." : "Create your profile and receive requests from your area.";
  const applyNowLabel = locale === "ar" ? "قدم الآن" : locale === "tr" ? "Şimdi Başvur" : "Apply Now";
  const emptyLabel = locale === "ar" ? "لا شيء هنا بعد." : locale === "tr" ? "Burada henüz bir şey yok." : "Nothing here yet.";

  /**
   * Arabic counts a thing in five shapes, and "6 مهنة متاحة" is none of them.
   * The other two locales need only one plural each.
   */
  const professionCount = (n: number): string => {
    if (locale === "tr") return `${n} meslek`;
    if (locale !== "ar") return n === 1 ? "1 profession" : `${n} professions`;
    if (n === 0) return "لا مهن";
    if (n === 1) return "مهنة واحدة";
    if (n === 2) return "مهنتان";
    if (n <= 10) return `${n} مهن`;
    return `${n} مهنة`;
  };

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/services"
      adLayout={{ mode: "standard", family: "services" }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <PageContainer className="py-8" dir={dir}>
        {error && <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}

        {/* The page opens on its categories.

            There was a header block here — a heading, a line under it and two
            buttons — filling the first screen with words that only named the
            page the visitor had just chosen from the menu. It is gone; the
            first thing on the page is now the thing the page is for. */}
        <section>

          {dataLoading ? (
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {/* The same footprint as a real tile, so the row does not jump. */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-20 w-20 animate-pulse rounded-[26px] bg-[var(--color-surface-muted)] md:h-24 md:w-24" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">{emptyLabel}</p>
          ) : (
            <>
              {/* The categories, and no heading above them: a row of trade
                  icons needs no line explaining that it is a row of trade
                  icons. Larger tiles, the page's own tokens, and one ring on
                  the chosen one instead of a gradient and a shadow. */}
              <div className="flex gap-4 overflow-x-auto pb-3 md:gap-6 md:flex-wrap md:justify-center md:overflow-visible">
                {groups.map((group) => {
                  const active = group.id === selectedGroupId;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setActiveGroup(group.id)}
                      aria-pressed={active}
                      className="group flex w-28 shrink-0 flex-col items-center gap-2.5 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] md:w-32"
                    >
                      <span
                        className={`grid h-20 w-20 place-items-center rounded-[26px] border transition-all duration-200 md:h-24 md:w-24 ${
                          active
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] group-hover:-translate-y-1 group-hover:border-[var(--color-primary)]"
                        }`}
                      >
                        <ServiceCategoryIcon name={typeof group.icon === "string" ? group.icon : null} className="h-9 w-9 md:h-11 md:w-11" />
                      </span>
                      <span className={`text-center text-xs font-bold leading-5 ${active ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                        {nameFor(locale, group.name_ar, group.name_en, group.name_tr, group.code)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* مهن النوع المختار */}
              <div className="mt-6 rounded-3xl border border-gray-100 bg-gradient-to-b from-gray-50 to-white p-5 md:p-7 dark:border-gray-800 dark:from-gray-900 dark:to-gray-950">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow shadow-blue-600/25">
                      <ServiceCategoryIcon name={typeof selectedGroup?.icon === "string" ? selectedGroup.icon : null} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">
                        {selectedGroup ? nameFor(locale, selectedGroup.name_ar, selectedGroup.name_en, selectedGroup.name_tr, selectedGroup.code) : ""}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {professionCount(professions.length)}
                      </p>
                    </div>
                  </div>
                  <Link href="/services/catalog" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    {viewAllLabel} ←
                  </Link>
                </div>

                {professions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {professions.map((profession) => (
                      <Link
                        key={profession.id}
                        href={`/services/catalog/${profession.code}`}
                        className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-950 dark:text-blue-400">
                          <ServiceCategoryIcon name={typeof profession.icon === "string" && profession.icon ? profession.icon : (typeof selectedGroup?.icon === "string" ? selectedGroup.icon : null)} className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-800 group-hover:text-blue-700 dark:text-gray-200 dark:group-hover:text-blue-300">
                          {nameFor(locale, profession.name_ar, profession.name_en, profession.name_tr, profession.code)}
                        </span>
                        <span className="text-gray-300 transition group-hover:text-blue-500 dark:text-gray-600" aria-hidden="true">←</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4 mb-4">
            <h2 className="text-2xl font-black text-[var(--color-text-primary)]">{featuredProvidersLabel}</h2>
            <Link href="/providers" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
              {viewAllLabel} ←
            </Link>
          </div>
          <Grid columns={3}>
            {dataLoading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-44 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)
              : providers.slice(0, 6).map((provider, i) => <ProviderCard key={provider.id} provider={provider} locale={locale} index={i} />)}
            {!dataLoading && providers.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-10">{emptyLabel}</p>
            )}
          </Grid>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4 mb-4">
            <h2 className="text-2xl font-black text-[var(--color-text-primary)]">{recentRequestsLabel}</h2>
            <Link href="/service-requests" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
              {viewAllLabel} ←
            </Link>
          </div>
          <Grid columns={3}>
            {dataLoading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-44 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)
              : requests.slice(0, 6).map((request) => <RequestCard key={request.id} request={request} locale={locale} categoryMap={categoryMap} />)}
            {!dataLoading && requests.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-10">{emptyLabel}</p>
            )}
          </Grid>
        </section>

        <section className="mt-12 rounded-2xl bg-gray-900 dark:bg-gray-950 p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-black">{providerCtaLabel}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-gray-300">
            {providerCtaSubLabel}
          </p>
          <Link href="/providers/apply" className="mt-6 inline-block px-6 py-3 rounded-xl bg-white text-gray-900 text-sm font-bold transition hover:bg-amber-300">
            {applyNowLabel}
          </Link>
        </section>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
