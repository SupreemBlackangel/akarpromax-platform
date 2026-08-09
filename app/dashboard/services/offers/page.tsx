"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import ServiceDashboardShell from "@services-ui/ServiceDashboardShell";
import { type OfferRow } from "@services-ui/ServiceCards";
import { OfferStatusPill } from "@services-ui/ServiceStatusBadges";
import { apiFetch, formatMoney, formatDate } from "@services-client";

export default function MyOffersPage() {
  const { locale, viewer, t, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewer.authenticated) return;
    const controller = new AbortController();
    apiFetch<{ offers: OfferRow[] }>("/api/service-offers?limit=100")
      .then((data) => {
        if (!controller.signal.aborted) setOffers(data.offers ?? []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [viewer.authenticated]);

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/dashboard/services/offers"
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <ServiceDashboardShell viewer={viewer} locale={locale} dir={dir} t={t} active="offers">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4">{t("services.offers") ?? "العروض"}</h2>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
        ) : offers.length === 0 ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-16">{t("services.empty")}</p>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => {
              const isProvider = offer.provider_user_id === viewer.email;
              return (
                <div key={offer.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/dashboard/services/offers/${offer.id}`} className="font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                        {offer.request_title ? String(offer.request_title) : `عرض #${String(offer.id).slice(0, 8)}`}
                      </Link>
                      <p className="mt-1 text-xs text-gray-400">
                        {offer.reference_number ? String(offer.reference_number) : "—"} • {isProvider ? t("services.sentOffer") ?? "عرض مرسل" : t("services.receivedOffer") ?? "عرض مستلم"} • {formatDate(offer.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatMoney(offer.total_price ?? offer.price, offer.currency)}</span>
                      <OfferStatusPill status={offer.status} locale={locale} />
                    </div>
                  </div>
                  {offer.offer_notes && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{offer.offer_notes}</p>}
                  <div className="mt-3">
                    <Link href={`/dashboard/services/offers/${offer.id}`} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition">
                      {t("services.viewOffer") ?? "عرض التفاصيل"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ServiceDashboardShell>
      {AccountDialog}
    </PublicPageShell>
  );
}
