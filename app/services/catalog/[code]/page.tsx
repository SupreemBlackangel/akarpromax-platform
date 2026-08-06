"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { ProviderCard, RequestCard, type CategoryRow, type ProviderRow, type RequestRow } from "@services-ui/ServiceCards";
import { apiFetch, nameFor } from "@services-client";

type Props = { code: string };

export default function CategoryDetailPage({ code }: Props) {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [category, setCategory] = useState<CategoryRow | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const categoriesData = await apiFetch<{ categories: CategoryRow[] }>("/api/service-categories?country=OM");
        if (controller.signal.aborted) return;
        const found = (categoriesData.categories ?? []).find((c) => c.code === code) ?? null;
        setCategory(found);
        if (found) {
          const [providersData, requestsData] = await Promise.all([
            apiFetch<{ providers: ProviderRow[] }>(`/api/service-providers?categoryId=${encodeURIComponent(found.id)}&status=approved&limit=50`),
            apiFetch<{ requests: RequestRow[] }>(`/api/service-requests?categoryId=${encodeURIComponent(found.id)}&status=published&limit=20`),
          ]);
          if (controller.signal.aborted) return;
          setProviders(providersData.providers ?? []);
          setRequests(requestsData.requests ?? []);
        }
      } catch {
        setCategory(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [code]);

  const name = category ? nameFor(locale, category.name_ar, category.name_en, category.name_tr, code) : code;
  const description = category ? nameFor(locale, category.description_ar, category.description_en, category.description_tr, "") : "";

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
        <div className="mb-6">
          <Link href="/services/catalog" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← {t("services.back") ?? "دليل الخدمات"}</Link>
          <div className="mt-3 flex items-center gap-4">
            <span className="h-16 w-16 grid place-items-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-4xl">{category?.icon ?? "🛠"}</span>
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white">{name}</h1>
              {description && <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {loading
              ? "جارٍ التحميل..."
              : category
                ? `${providers.length} ${t("services.providers")} • ${requests.length} ${t("services.requests")}`
                : t("services.empty")}
          </div>
          <Link href="/service-requests/new" className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition">
            ➕ {t("services.postRequest") ?? "انشر طلباً في هذا التصنيف"}
          </Link>
        </div>

        <section>
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">{t("services.providers") ?? "مقدمو الخدمات"}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider, i) => <ProviderCard key={provider.id} provider={provider} locale={locale} index={i} />)}
            {!loading && providers.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-8">{t("services.empty")}</p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">{t("services.requests") ?? "الطلبات المنشورة"}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((request) => <RequestCard key={request.id} request={request} locale={locale} />)}
            {!loading && requests.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-8">{t("services.empty")}</p>
            )}
          </div>
        </section>
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
