# News Ticker Design

Generated: 2026-08-06
Status: ACCEPTED (Phase 2 — kept, not rebuilt)

## Implementation

`src/components/NewsTicker.tsx` is the single ticker implementation. Phase 2
keeps it unchanged. It:

- fetches `/api/news?country(&city)` and falls back to static `copy.ticker`,
- renders `role="status"` with an `aria-label` (announced politely, not a live
  marquee alert),
- supports pause/play (`tickerPause`/`tickerPlay`), and
- respects `dir` per locale.

## No marquee, reduced-motion

The visual scroll uses a CSS animation on `.ticker-marquee`. Per the
continuous-animation rule, `app/globals.css` already contains:

```css
@media (prefers-reduced-motion: reduce) {
  .hero-ad-media, .hero-ad-dots button.active span, .ticker-marquee, .ticker-pulse { animation: none; }
}
```

The existing pause button satisfies the "user can stop" requirement; the
reduced-motion block covers users who prefer no motion. No new CSS was added in
Phase 2.

## Why it is not duplicated

Pre-Phase-2 audit found exactly one `NewsTicker`. It is used by the shell and by
the landing page. Keeping one implementation avoids divergent news sources and
keeps a single fallback path.
