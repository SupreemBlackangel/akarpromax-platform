"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import LuxuryPropertyCard from "@/src/components/ui/LuxuryPropertyCard";
import { normalizeApiProperty, type ApiPropertyRecord, type NormalizedProperty } from "@/lib/properties-api-normalize";
import { useGeo } from "@/src/contexts/GeoContext";

export default function HomeFeatured() {
  const { countryCode, governorate, city, district, isGlobal } = useGeo();
  const [items, setItems] = useState<NormalizedProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Scoped to the visitor's platform location (same params as /properties).
    const params = new URLSearchParams({ limit: "6", scope: isGlobal ? "global" : "local" });
    if (!isGlobal && countryCode) {
      params.set("country", countryCode);
      if (governorate) params.set("governorate", governorate);
      if (city) params.set("city", city);
      if (district) params.set("district", district);
    }
    fetch(`/api/properties?${params.toString()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (active && d?.success && Array.isArray(d.data)) {
          setItems(d.data.map((raw: ApiPropertyRecord) => normalizeApiProperty(raw)));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [countryCode, governorate, city, district, isGlobal]);

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-16">
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-96 animate-pulse rounded-3xl bg-slate-200" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <LuxuryPropertyCard key={p.id} property={p} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Building2 className="h-8 w-8" />
          </span>
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">استكشف السوق العقاري</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)]">
              تصفح كامل العقارات المعروضة في عُمان، وفلاتر متقدمة حسب النوع والسعر والموقع وطريقة التسويق.
            </p>
          </div>
          <Link
            href="/properties/search"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover"
          >
            ابدأ البحث الآن
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
      )}
    </section>
  );
}
