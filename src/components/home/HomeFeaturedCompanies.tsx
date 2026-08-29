"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import { CompanyCard } from "@/components/company/CompanyCard";

type CompanyRow = {
  id: string;
  nameAr?: string;
  nameEn?: string;
  name?: string;
  logoUrl?: string;
  cityId?: string;
  verifiedAt?: string | null;
};

export default function HomeFeaturedCompanies() {
  const [items, setItems] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/companies?limit=6", { cache: "no-store" })
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
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-primary">
            <span className="h-0.5 w-5 rounded-full bg-primary" />
            <Briefcase className="h-3.5 w-3.5" />
            شركاؤنا
          </span>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl">شركات مميزة</h2>
        </div>
        <Link href="/companies" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition hover:text-primary-hover">
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
          {items.map((c) => (
            <CompanyCard
              key={c.id}
              company={{
                id: c.id,
                name: c.nameAr || c.nameEn || c.name || "",
                logo: c.logoUrl,
                city: c.cityId,
                isVerified: !!c.verifiedAt,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
