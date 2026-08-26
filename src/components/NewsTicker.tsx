"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  id: string;
  title: string;
  linkUrl?: string | null;
};

function isExternalLink(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isRelativeLink(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

function localizedTitle(item: NewsItem, locale: Locale): string {
  if (locale === "ar") return item.titleAr;
  if (locale === "tr") return item.titleTr;
  return item.titleEn;
}

export default function NewsTicker({ copy, locale, country, city }: Props) {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const page = typeof window !== "undefined" ? window.location.pathname : "/";
    (async () => {
      try {
        const query = new URLSearchParams({ channel: "WEBSITE_TICKER", country });
        if (city) query.set("city", city);
        query.set("lang", locale);
        query.set("page", page);
        const res = await fetch(`/api/news/feed?${query.toString()}`, { cache: "no-store", signal: controller.signal });
        const data = await res.json();
        if (!cancelled && Array.isArray(data.items) && data.items.length) {
          setItems(
            data.items.map((item: NewsItem) => ({
              id: item.id,
              title: localizedTitle(item, locale),
              linkUrl: typeof item.linkUrl === "string" && item.linkUrl.trim() ? item.linkUrl.trim() : null,
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
    : copy.ticker.map((title) => ({ id: title, title }));
  const count = display.length;

  const animationDuration = Math.max(18, count * 7);

  const advance = useCallback(
    (direction: 1 | -1) => {
      setIndex((value) => {
        const next = (value + direction) % count;
        return next < 0 ? count - 1 : next;
      });
    },
    [count],
  );

  useEffect(() => {
    if (paused || hovered || reducedMotion || count <= 1) return;
    const timer = window.setInterval(() => advance(1), animationDuration * 1000);
    return () => window.clearInterval(timer);
  }, [paused, hovered, reducedMotion, count, animationDuration, advance]);

  if (!count) return null;

  const safeIndex = index >= count ? 0 : index;
  const offset = `translateX(${-safeIndex * 100}%)`;

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      advance(locale === "ar" ? 1 : -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      advance(locale === "ar" ? -1 : 1);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setPaused((value) => !value);
    }
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    advance(delta > 0 ? (locale === "ar" ? 1 : -1) : locale === "ar" ? -1 : 1);
  };

  const isRtl = locale === "ar";

  return (
    <div
      className={`news-ticker${paused ? " is-paused" : ""}`}
      role="status"
      aria-label={copy.tickerAria}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="container ticker-inner">
        <span className="ticker-label">{copy.tickerLabel}</span>
        <span className="ticker-pulse" aria-hidden="true" />
        <div
          className="ticker-track"
          dir={isRtl ? "rtl" : "ltr"}
          tabIndex={0}
          aria-live="polite"
          onKeyDown={onKeyDown}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="ticker-marquee" style={{ transform: offset }}>
            {display.map((item) => (
              <span key={item.id} className="ticker-item">
                {item.linkUrl && isExternalLink(item.linkUrl) ? (
                  <a className="ticker-link" href={item.linkUrl} target="_blank" rel="noopener noreferrer">{item.title}</a>
                ) : item.linkUrl && isRelativeLink(item.linkUrl) ? (
                  <a className="ticker-link" href={item.linkUrl}>{item.title}</a>
                ) : (
                  item.title
                )}
                <span className="ticker-dot" aria-hidden="true">•</span>
              </span>
            ))}
          </div>
        </div>
        <button className="ticker-nav" type="button" aria-label={copy.tickerPrev} onClick={() => advance(isRtl ? 1 : -1)}>
          {isRtl ? "›" : "‹"}
        </button>
        <button
          className="ticker-pause"
          type="button"
          aria-label={paused ? copy.tickerPlay : copy.tickerPause}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? "▶" : "Ⅱ"}
        </button>
        <button className="ticker-nav" type="button" aria-label={copy.tickerNext} onClick={() => advance(isRtl ? -1 : 1)}>
          {isRtl ? "‹" : "›"}
        </button>
      </div>
    </div>
  );
}
