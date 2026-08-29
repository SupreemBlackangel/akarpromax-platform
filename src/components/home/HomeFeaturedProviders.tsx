"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { ProviderCard, type ProviderRow } from "@/src/components/services/ServiceCards";
import { useGeo } from "@/src/contexts/GeoContext";
import type { Locale } from "@/src/types/site";

export default function HomeFeaturedProviders({ locale }: { locale: Locale }) {
  const { countryCode, governorate, city, district, isGlobal } = useGeo();
  const [items, setItems] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Same geo params the services pages pass (names resolve via aliases).
    const params = new URLSearchParams({ status: "approved", limit: "6", scope: isGlobal ? "global" : "local" });
    if (!isGlobal && countryCode) {
      params.set("country", countryCode.toUpperCase());
      if (governorate) params.set("governorate", governorate);
      if (city) params.set("cityId", city);
      if (district) params.set("districtId", district);
    }
    fetch(`/api/service-providers?${params.toString()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        const rows = d?.profiles ?? d?.providers ?? [];
        if (active && Array.isArray(rows)) setItems(rows);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [countryCode, governorate, city, district, isGlobal]);

  if (!loading && items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-primary">
            <span className="h-0.5 w-5 rounded-full bg-primary" />
            <Users className="h-3.5 w-3.5" />
            سوق الخدمات
          </span>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl">حرفيون مميزون</h2>
        </div>
        <Link href="/providers" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition hover:text-primary-hover">
          عرض الكل
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((provider, index) => (
            <ProviderCard key={String(provider.id)} provider={provider} locale={locale} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
