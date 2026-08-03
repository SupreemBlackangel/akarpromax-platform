"use client";

import { useEffect, useState } from "react";
import type { Locale, Translation } from "@/src/types/site";

type Props = {
  copy: Translation;
  locale: Locale;
  country: string;
  city: string;
};

type NewsItem = {
  id: string;
  titleAr: string;
  titleEn: string;
  titleTr: string;
  linkUrl: string | null;
};

type TickerItem = {
  title: string;
};

function renderItem(item: TickerItem, locale: Locale, hidden: boolean) {
  const key = `${locale}-ticker-${hidden ? "b" : "a"}-${item.title}`;
  return (
    <span key={key} className="ticker-item">
      {item.title}
      <span className="ticker-dot" aria-hidden="true">•</span>
    </span>
  );
}

export default function NewsTicker({ copy, locale, country, city }: Props) {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const query = new URLSearchParams({ country });
        if (city) query.set("city", city);
        const res = await fetch(`/api/news?${query.toString()}`, { cache: "no-store", signal: controller.signal });
        const data = await res.json();
        if (!cancelled && Array.isArray(data.news) && data.news.length) {
          setItems(
            data.news.map((item: NewsItem) => ({
              title: locale === "ar" ? item.titleAr : locale === "tr" ? item.titleTr : item.titleEn,
            })),
          );
        }
      } catch {
        // Fallback to static copy when the news feed is unavailable.
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [country, city, locale]);

  const display: TickerItem[] = items.length
    ? items
    : copy.ticker.map((title) => ({ title }));
  if (!display.length) return null;

  const duration = Math.max(18, display.length * 7);

  return (
    <div className={`news-ticker${paused ? " is-paused" : ""}`} role="status" aria-label={copy.tickerAria}>
      <div className="container ticker-inner">
        <span className="ticker-label">{copy.tickerLabel}</span>
        <span className="ticker-pulse" aria-hidden="true" />
        <div className="ticker-track" dir={locale === "ar" ? "rtl" : "ltr"}>
          <div className="ticker-marquee" style={{ animationDuration: `${duration}s` }}>
            {display.map((item) => renderItem(item, locale, false))}
            {display.map((item) => renderItem(item, locale, true))}
          </div>
        </div>
        <button className="ticker-pause" type="button" aria-label={paused ? copy.tickerPlay : copy.tickerPause} onClick={() => setPaused((value) => !value)}>
          {paused ? "▶" : "Ⅱ"}
        </button>
      </div>
    </div>
  );
}
