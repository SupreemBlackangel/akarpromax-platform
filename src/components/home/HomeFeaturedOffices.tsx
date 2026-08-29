"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { OfficeCard } from "@/components/office/OfficeCard";
import { useGeo } from "@/src/contexts/GeoContext";

type OfficeRow = {
  id: string;
  nameAr?: string;
  nameEn?: string;
  name?: string;
  logoUrl?: string;
  cityId?: string;
  verifiedAt?: string | null;
};

export default function HomeFeaturedOffices() {
  const { countryCode, isGlobal } = useGeo();
  const [items, setItems] = useState<OfficeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Organizations are filtered at country level (the API's city param
    // matches raw cityId values, not registry codes).
    const params = new URLSearchParams({ limit: "6" });
    if (!isGlobal && countryCode) params.set("country", countryCode);
    fetch(`/api/offices?${params.toString()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (active && d?.success && Array.isArray(d.data)) setItems(d.data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [countryCode, isGlobal]);

  if (!loading && items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-primary">
            <span className="h-0.5 w-5 rounded-full bg-primary" />
            <Building2 className="h-3.5 w-3.5" />
            الوسطاء
          </span>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl">مكاتب عقارية مميزة</h2>
        </div>
        <Link href="/offices" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition hover:text-primary-hover">
          عرض الكل
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((o) => (
            <OfficeCard
              key={o.id}
              office={{
                id: o.id,
                name: o.nameAr || o.nameEn || o.name || "",
                logo: o.logoUrl,
                city: o.cityId,
                isVerified: !!o.verifiedAt,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
