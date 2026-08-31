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
    Promise.allSettled([
      // The professions directory is global — country scoping only filters
      // providers and requests, never the taxonomy itself.
      apiFetch<{ categories: CategoryRow[] }>(`/api/service-categories`),
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
  const groups = useMemo(
    () => categories
      .filter((category) => !category.parent_id)
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)),
    [categories],
  );
  const selectedGroupId = activeGroup ?? groups[0]?.id ?? null;
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;
  const professions = useMemo(
    () => categories
      .filter((category) => category.parent_id === selectedGroupId)
      .sort((a, b) => Number(b.is_featured ?? 0) - Number(a.is_featured ?? 0) || Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)),
    [categories, selectedGroupId],
  );

  const heroKicker = locale === "ar" ? "سوق الخدمات" : locale === "tr" ? "Hizmet Pazarı" : "Services Market";
  const heroTitle = locale === "ar" ? "اختر خدمة أو اطلبها بسهولة" : locale === "tr" ? "Bir hizmet seçin veya kolayca talep edin" : "Choose a service or request one easily";
  const heroSubtitle = locale === "ar" ? "استعرض مقدمي الخدمات الموثوقين، أو انشر طلبك واستقبل عروضاً مخصصة." : locale === "tr" ? "Güvenilir hizmet sağlayıcılarını keşfedin, talebinizi yayınlayın ve size özel teklifler alın." : "Browse trusted service providers, post your request, and receive tailored offers.";
  const postRequestLabel = locale === "ar" ? "انشر طلباً" : locale === "tr" ? "Talep Yayınla" : "Post a Request";
  const becomeProviderLabel = locale === "ar" ? "انضم كمقدم خدمة" : locale === "tr" ? "Hizmet Sağlayıcı Ol" : "Become a Provider";
  const categoriesLabel = locale === "ar" ? "التصنيفات" : locale === "tr" ? "Kategoriler" : "Categories";
  const browseByCategoryLabel = locale === "ar" ? "تصفح حسب التصنيف" : locale === "tr" ? "Kategoriye Göz At" : "Browse by Category";
  const viewAllLabel = locale === "ar" ? "عرض الكل" : locale === "tr" ? "Tümünü Gör" : "View all";
  const providersLabel = locale === "ar" ? "مقدمو الخدمات" : locale === "tr" ? "Hizmet Sağlayıcıları" : "Service Providers";
  const featuredProvidersLabel = locale === "ar" ? "مقدمو خدمات موثوقون" : locale === "tr" ? "Güvenilir Hizmet Sağlayıcıları" : "Trusted Service Providers";
  const recentRequestsLabel = locale === "ar" ? "أحدث الطلبات" : locale === "tr" ? "Son Talepler" : "Recent Requests";
  const providerCtaLabel = locale === "ar" ? "هل أنت مقدم خدمة محترف؟" : locale === "tr" ? "Profesyonel bir hizmet sağlayıcı mısınız?" : "Are you a professional service provider?";
  const providerCtaSubLabel = locale === "ar" ? "أنشئ ملفك الشخصي، واستقبل طلبات مناسبة لمنطقتك، وواصل النمو مع عقار بروماكس." : locale === "tr" ? "Profilinizi oluşturun, bölgenize uygun talepleri alın ve AkarPromax ile büyümeye devam edin." : "Create your profile, receive requests suited to your area, and keep growing with AkarPromax.";
  const applyNowLabel = locale === "ar" ? "قدم الآن" : locale === "tr" ? "Şimdi Başvur" : "Apply Now";
  const emptyLabel = locale === "ar" ? "لا توجد بيانات للعرض حالياً." : locale === "tr" ? "Şu anda gösterilecek veri yok." : "Nothing to show yet.";

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

        <section className="rounded-2xl border border-blue-100 dark:border-blue-900 bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-blue-950/40 dark:via-gray-900 dark:to-emerald-950/30 p-8 md:p-12 text-center">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold">
            ✨ {heroKicker}
          </p>
          <h1 className="mt-4 text-3xl md:text-4xl font-black text-gray-900 dark:text-white">{heroTitle}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            {heroSubtitle}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/service-requests/new" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition">
              ➕ {postRequestLabel}
            </Link>
            <Link href="/providers/apply" className="px-6 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold transition hover:border-blue-300">
              👨‍🔧 {becomeProviderLabel}
            </Link>
          </div>
        </section>

        <section className="mt-10">
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider">{categoriesLabel}</p>
            <h2 className="mt-1 text-2xl md:text-3xl font-black text-gray-900 dark:text-white">{browseByCategoryLabel}</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {locale === "ar" ? "اختر نوع الخدمة لعرض المهن المتاحة فيه" : locale === "tr" ? "Mevcut meslekleri görmek için bir hizmet türü seçin" : "Pick a service type to see its professions"}
            </p>
          </div>

          {dataLoading ? (
            <div className="flex flex-wrap justify-center gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 w-24 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">{emptyLabel}</p>
          ) : (
            <>
              {/* أيقونات أنواع الخدمات */}
              <div className="flex gap-3 md:gap-4 overflow-x-auto pb-3 md:flex-wrap md:justify-center md:overflow-visible">
                {groups.map((group) => {
                  const active = group.id === selectedGroupId;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setActiveGroup(group.id)}
                      aria-pressed={active}
                      className="group flex w-24 shrink-0 flex-col items-center gap-2 focus:outline-none"
                    >
                      <span
                        className={`grid h-16 w-16 place-items-center rounded-2xl border transition-all duration-200 ${
                          active
                            ? "border-transparent bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-600/30 scale-105"
                            : "border-gray-200 bg-white text-blue-600 shadow-sm group-hover:-translate-y-1 group-hover:border-blue-300 group-hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:text-blue-400"
                        }`}
                      >
                        <ServiceCategoryIcon name={typeof group.icon === "string" ? group.icon : null} className="h-7 w-7" />
                      </span>
                      <span className={`text-center text-[11px] font-bold leading-4 ${active ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-300"}`}>
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
                        {locale === "ar" ? `${professions.length} مهنة متاحة` : locale === "tr" ? `${professions.length} meslek mevcut` : `${professions.length} professions available`}
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
            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{providersLabel}</p>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">{featuredProvidersLabel}</h2>
            </div>
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
            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{locale === "ar" ? "الطلبات" : locale === "tr" ? "Talepler" : "Requests"}</p>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">{recentRequestsLabel}</h2>
            </div>
            <Link href="/service-requests" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
              {viewAllLabel} ←
            </Link>
          </div>
          <Grid columns={3}>
            {dataLoading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-44 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)
              : requests.slice(0, 6).map((request) => <RequestCard key={request.id} request={request} locale={locale} />)}
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
