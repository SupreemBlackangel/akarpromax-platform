"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Newspaper, CalendarDays } from "lucide-react";

type NewsItem = {
  id: string;
  title: string;
  link?: string;
  publishedAt?: string;
};

export default function HomeNewsBand() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/news?limit=4", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!active) return;
        const list = Array.isArray(d?.data) ? d.data : Array.isArray(d?.news) ? d.news : null;
        if (list) {
          setItems(
            list.map((raw: Record<string, unknown>) => ({
              id: String(raw.id ?? Math.random().toString(36).slice(2)),
              title: String(raw.title ?? raw.titleAr ?? raw.title_ar ?? raw.titleEn ?? "خبر جديد"),
              link: raw.linkUrl ? String(raw.linkUrl) : raw.link ? String(raw.link) : undefined,
              publishedAt: raw.createdAt ? String(raw.createdAt) : raw.publishedAt ? String(raw.publishedAt) : undefined,
            })),
          );
        }
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
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-6xl px-5 py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-primary">
              <span className="h-0.5 w-5 rounded-full bg-primary" />
              آخر المستجدات
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">أخبار القطاع العقاري</h2>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const Inner = (
                <div className="flex h-full items-start gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 transition hover:border-primary/40 hover:bg-[var(--color-surface)] hover:shadow-md">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Newspaper className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 font-bold leading-snug text-[var(--color-text-primary)]">{item.title}</h3>
                    {item.publishedAt && (
                      <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(item.publishedAt).toLocaleDateString("ar-OM", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <ArrowLeft className="ms-auto mt-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)] rtl:rotate-180" />
                </div>
              );
              return item.link ? (
                <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer" className="block">
                  {Inner}
                </a>
              ) : (
                <div key={item.id} className="block">
                  {Inner}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
