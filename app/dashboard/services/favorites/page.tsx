"use client";

import { useEffect, useState } from "react";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { apiFetch } from "@services-client";
import { ProviderCard, type ProviderRow } from "@services-ui/ServiceCards";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";
import { usePathname } from "next/navigation";

export default function ServiceFavoritesPage() {
  const pathname = usePathname();
  const { locale, viewer, t, dir } = useServicesPage();
  const [favorites, setFavorites] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!viewer.authenticated) return;
    const controller = new AbortController();
    apiFetch<{ bookmarks: ProviderRow[] }>("/api/service-bookmarks?mine=1")
      .then((data) => {
        if (!controller.signal.aborted) {
          setFavorites(data.bookmarks ?? []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t("services.error"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [viewer.authenticated]);

  const handleRemove = async (listingId: string) => {
    try {
      await apiFetch(`/api/service-bookmarks/${listingId}`, { method: "DELETE" });
      setFavorites((prev) => prev.filter((f) => f.id !== listingId));
    } catch {
      setError(t("services.error"));
    }
  };

  return (
    <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="favorites">
      <PageContainer dir={dir} className="py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-[var(--color-surface)]">{t("services.favorites") ?? "المفضلة"}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("services.favoritesSub") ?? "مقدمو الخدمات والطلبات التي حفظتها للرجوع إليها لاحقاً"}</p>
          </div>
        </div>

        {error && <div className="mb-4 px-4 py-3 bg-[var(--color-error-soft)] dark:bg-red-900/30 text-[var(--color-error)] dark:text-[var(--color-error)] rounded-lg text-sm">{error}</div>}

        {loading ? (
          <Grid columns={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </Grid>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">⭐</div>
            <h2 className="text-xl font-black text-gray-900 dark:text-[var(--color-surface)]">{t("services.noFavorites") ?? "لا توجد عناصر مفضلة"}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("services.noFavoritesSub") ?? "ابدأ بحفظ مقدمي الخدمات أو الطلبات التي تعجبك"}</p>
            <button onClick={() => window.location.href = "/services"} className="mt-4 px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-bold transition">
              {t("services.browseServices") ?? "استعرض الخدمات"}
            </button>
          </div>
        ) : (
          <Grid columns={3}>
            {favorites.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} locale={locale} />
            ))}
          </Grid>
        )}
      </PageContainer>
    </ServiceDashboardShell>
  );
}