"use client";

import { useEffect, useMemo, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@/src/components/services/useServicesPage";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";

type NewsItem = {
  id: string;
  titleAr: string;
  titleEn: string;
  titleTr: string;
  summaryAr: string | null;
  summaryEn: string | null;
  summaryTr: string | null;
  bodyAr: string | null;
  bodyEn: string | null;
  bodyTr: string | null;
  category: string;
  sourceName: string | null;
  sourceUrl: string | null;
  linkUrl: string | null;
  updatedAt: string;
  imageUrl: string | null;
  isBreaking: boolean;
  isPinned: boolean;
};

function pickLocaleValue(locale: "ar" | "en" | "tr", item: NewsItem, kind: "title" | "summary" | "body"): string {
  if (kind === "title") {
    if (locale === "tr") return item.titleTr || item.titleEn || item.titleAr;
    if (locale === "en") return item.titleEn || item.titleAr || item.titleTr;
    return item.titleAr || item.titleEn || item.titleTr;
  }
  if (kind === "summary") {
    if (locale === "tr") return item.summaryTr || item.summaryEn || item.summaryAr || "";
    if (locale === "en") return item.summaryEn || item.summaryAr || item.summaryTr || "";
    return item.summaryAr || item.summaryEn || item.summaryTr || "";
  }
  if (locale === "tr") return item.bodyTr || item.bodyEn || item.bodyAr || "";
  if (locale === "en") return item.bodyEn || item.bodyAr || item.bodyTr || "";
  return item.bodyAr || item.bodyEn || item.bodyTr || "";
}

function formatNewsDate(value: string, locale: "ar" | "en" | "tr"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const tag = locale === "tr" ? "tr-TR" : locale === "en" ? "en-GB" : "ar-OM";
  return date.toLocaleString(tag, { day: "2-digit", month: "short", year: "numeric" });
}

export default function NewsPageClient() {
  const { locale, viewer, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/news?country=${encodeURIComponent(country)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as { news?: NewsItem[] };
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!controller.signal.aborted) setItems(data.news ?? []);
      } catch {
        if (!controller.signal.aborted) setError(locale === "ar" ? "تعذر تحميل الأخبار حالياً" : locale === "tr" ? "Haberler şu anda yüklenemedi" : "Unable to load news right now");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [country, locale]);

  const categories = useMemo(() => {
    const unique = new Set(items.map((item) => item.category || "GENERAL"));
    return ["ALL", ...unique];
  }, [items]);

  const filtered = useMemo(
    () => (selectedCategory === "ALL" ? items : items.filter((item) => item.category === selectedCategory)),
    [items, selectedCategory],
  );

  const pageHeader = {
    eyebrow: locale === "ar" ? "الأخبار" : locale === "tr" ? "Haberler" : "News",
    title: locale === "ar" ? "آخر أخبار AkarProMax" : locale === "tr" ? "AkarProMax Haberleri" : "Latest AkarProMax News",
    description:
      locale === "ar"
        ? "تحديثات المنصة وأخبار السوق والمصادر الموثوقة في صفحة عامة واحدة."
        : locale === "tr"
          ? "Platform güncellemeleri, pazar haberleri ve güvenilir kaynaklar tek bir genel sayfada."
          : "Platform updates, market news, and trusted sources in one public page.",
  };

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/news"
      pageHeader={pageHeader}
      adLayout={{ mode: "standard", family: "news" }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <PageContainer className="py-8" dir={dir}>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                selectedCategory === category
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {category === "ALL" ? (locale === "ar" ? "الكل" : locale === "tr" ? "Tümü" : "All") : category}
            </button>
          ))}
        </div>

        {error && <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>}

        <Grid columns={3}>
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))
            : filtered.map((item) => {
                const title = pickLocaleValue(locale, item, "title");
                const summary = pickLocaleValue(locale, item, "summary") || pickLocaleValue(locale, item, "body").slice(0, 220);
                const href = item.linkUrl || item.sourceUrl;
                return (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- dynamic news image URL
                      <img src={item.imageUrl} alt="" className="h-44 w-full object-cover" />
                    ) : (
                      <div className="h-44 w-full bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-blue-950 dark:to-emerald-950" />
                    )}
                    <div className="p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{item.category}</span>
                        {item.isBreaking && (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700 dark:bg-red-900/40 dark:text-red-300">{locale === "ar" ? "عاجل" : locale === "tr" ? "Son Dakika" : "Breaking"}</span>
                        )}
                        {item.isPinned && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{locale === "ar" ? "مثبت" : locale === "tr" ? "Sabit" : "Pinned"}</span>
                        )}
                      </div>
                      <h2 className="text-xl font-black text-gray-900 dark:text-white">{title}</h2>
                      <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{summary}</p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatNewsDate(item.updatedAt, locale)}</span>
                        <span>{item.sourceName || (locale === "ar" ? "AkarProMax" : locale === "tr" ? "AkarProMax" : "AkarProMax")}</span>
                      </div>
                      {href && (
                        <div className="mt-4">
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-black dark:bg-white dark:text-gray-900"
                          >
                            {locale === "ar" ? "اقرأ المزيد" : locale === "tr" ? "Devamını oku" : "Read more"}
                          </a>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              {locale === "ar" ? "لا توجد أخبار مطابقة حالياً." : locale === "tr" ? "Şu anda eşleşen haber yok." : "No matching news is available right now."}
            </div>
          )}
        </Grid>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
