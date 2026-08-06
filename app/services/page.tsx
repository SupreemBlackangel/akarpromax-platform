"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { CategoryCard, ProviderCard, RequestCard, type CategoryRow, type ProviderRow, type RequestRow } from "@services-ui/ServiceCards";
import { apiFetch } from "@services-client";
import AdSlot from "@/src/components/AdSlot";

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

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <div dir={dir} className="container py-8">
        {error && <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}

        <section className="rounded-2xl border border-blue-100 dark:border-blue-900 bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-blue-950/40 dark:via-gray-900 dark:to-emerald-950/30 p-8 md:p-12 text-center">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold">
            ✨ {t("services.kicker") ?? "سوق الخدمات"}
          </p>
          <h1 className="mt-4 text-3xl md:text-4xl font-black text-gray-900 dark:text-white">{t("services.title") ?? "اختر خدمة أو اطلبها بسهولة"}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            {t("services.subtitle") ?? "استعرض مقدمي الخدمات الموثوقين، أو انشر طلبك واستقبل عروضاً مخصصة."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/service-requests/new" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition">
              ➕ {t("services.postRequest") ?? "انشر طلباً"}
            </Link>
            <Link href="/providers/apply" className="px-6 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold transition hover:border-blue-300">
              👨‍🔧 {t("services.becomeProvider") ?? "انضم كمقدم خدمة"}
            </Link>
          </div>
        </section>

        <AdSlot
          placement="services_hub_mid"
          locale={locale}
          country={country}
          city={city}
          path="/services"
          entityType="services"
          variant="horizontal"
          className="mt-8"
        />

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{t("services.categories") ?? "التصنيفات"}</p>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">{t("services.browseByCategory") ?? "تصفح حسب التصنيف"}</h2>
            </div>
            <Link href="/services/catalog" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
              {t("services.viewAll") ?? "عرض الكل"} ←
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ))
              : categories.slice(0, 6).map((category) => <CategoryCard key={category.id} category={category} locale={locale} />)}
            {!dataLoading && categories.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-10">{t("services.empty")}</p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{t("services.providers") ?? "مقدمو الخدمات"}</p>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">{t("services.featuredProviders") ?? "مقدمو خدمات موثوقون"}</h2>
            </div>
            <Link href="/providers" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
              {t("services.viewAll") ?? "عرض الكل"} ←
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataLoading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-44 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)
              : providers.map((provider, i) => <ProviderCard key={provider.id} provider={provider} locale={locale} index={i} />)}
            {!dataLoading && providers.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-10">{t("services.empty")}</p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{t("services.requests") ?? "الطلبات"}</p>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">{t("services.recentRequests") ?? "أحدث الطلبات"}</h2>
            </div>
            <Link href="/service-requests" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
              {t("services.viewAll") ?? "عرض الكل"} ←
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataLoading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-44 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)
              : requests.map((request) => <RequestCard key={request.id} request={request} locale={locale} />)}
            {!dataLoading && requests.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-10">{t("services.empty")}</p>
            )}
          </div>
        </section>

        <section className="mt-12 rounded-2xl bg-gray-900 dark:bg-gray-950 p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-black">{t("services.providerCta") ?? "هل أنت مقدم خدمة محترف؟"}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-gray-300">
            {t("services.providerCtaSub") ?? "أنشئ ملفك الشخصي، واستقبل طلبات مناسبة لمنطقتك، وواصل النمو مع عقار بروماكس."}
          </p>
          <Link href="/providers/apply" className="mt-6 inline-block px-6 py-3 rounded-xl bg-white text-gray-900 text-sm font-bold transition hover:bg-amber-300">
            {t("services.applyProvider") ?? "قدم الآن"}
          </Link>
        </section>
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
