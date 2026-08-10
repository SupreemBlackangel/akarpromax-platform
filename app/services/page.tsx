"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { CategoryCard, ProviderCard, RequestCard, type CategoryRow, type ProviderRow, type RequestRow } from "@services-ui/ServiceCards";
import { apiFetch } from "@services-client";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";

export default function ServicesHubPage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [categoriesData, providersData, requestsData] = await Promise.all([
          apiFetch<{ categories: CategoryRow[] }>("/api/service-categories?country=OM"),
          apiFetch<{ providers: ProviderRow[] }>("/api/service-providers?status=approved&limit=6"),
          apiFetch<{ requests: RequestRow[] }>("/api/service-requests?status=published&limit=6"),
        ]);
        if (controller.signal.aborted) return;
        setCategories(categoriesData.categories ?? []);
        setProviders(providersData.providers ?? []);
        setRequests(requestsData.requests ?? []);
      } catch {
        if (!controller.signal.aborted) setError(t("services.error"));
      } finally {
        if (!controller.signal.aborted) setDataLoading(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

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
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{categoriesLabel}</p>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">{browseByCategoryLabel}</h2>
            </div>
            <Link href="/services/catalog" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
              {viewAllLabel} ←
            </Link>
          </div>
          <Grid columns={3}>
            {dataLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ))
              : categories.slice(0, 6).map((category) => <CategoryCard key={category.id} category={category} locale={locale} />)}
            {!dataLoading && categories.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-10">{t("services.empty")}</p>
            )}
          </Grid>
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
              : providers.map((provider, i) => <ProviderCard key={provider.id} provider={provider} locale={locale} index={i} />)}
            {!dataLoading && providers.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-10">{t("services.empty")}</p>
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
              : requests.map((request) => <RequestCard key={request.id} request={request} locale={locale} />)}
            {!dataLoading && requests.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-10">{t("services.empty")}</p>
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
