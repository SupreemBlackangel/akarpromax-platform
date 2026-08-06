# NEWS TICKER INVENTORY

Phase 2 pre-edit inventory of the news/ticker implementation.

## Implementations

| File | Component | Used by | Audience | Duplicate | Accessibility | Responsive | DS compliance | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/components/NewsTicker.tsx` | `NewsTicker` (client) | `PublicPageShell`, landing `/` | Public | No (single impl) | `role="status"` (= `aria-live="polite"`), labelled via `copy.tickerAria`, dedicated pause button (aria-labels `copy.tickerPause/Play`) | Marquee track (`dir` rtl/ltr by locale), pause on hover, pulse dot | Legacy `.news-ticker` gradient + `.ticker-*`; token fonts/spacing elsewhere | **KEEP** |

## Data flow (no parallel DB)
1. `useEffect` → `GET /api/news?country={country}&city={city}` (`cache: no-store`, AbortController).
2. If the API returns `news[]`, items map to localized title (`titleAr/titleEn/titleTr`).
3. On any failure (or empty), fall back to static `copy.ticker` (3 items) — safe limited fallback.
4. Empty display → component returns `null` (no layout shift).

The dynamic admin management of ticker items stays with the existing `app/admin/news` flow (deferred; no schema change). Optional item model `{id,type,title,url,priority,language,startsAt,endsAt,isActive,target}` is documented in NEWS_TICKER_DESIGN.md as the future contract — **no DB migration** in this phase.

## Accessibility decision (documented)
- Region announces content changes politely via `role="status"`. The marquee animates via CSS transforms only (DOM unchanged while running), so there is no repeated live-region noise; a single polite announcement occurs when the item set loads. This matches the directive's "aria-live polite only for breaking" rule — all current items are generic news/announcements; if a true breaking/alert item type is added later it must use `role="alert"` or `aria-live="assertive"` (NEWS_TICKER_DESIGN.md).
- Pause: explicit pause button (click/keyboard) toggles `.is-paused`; hover pauses. Pausing is possible when continuously animating → directive satisfied.
- No `<marquee>` element (CSS animation instead).

## Reduced motion
`tokens.css` already collapses `--motion-*` under `@media (prefers-reduced-motion: reduce)`. The legacy `.ticker-marquee` animation is defined in `app/globals.css` (not a token), so an explicit override is added there: under `prefers-reduced-motion: reduce`, `.ticker-marquee { animation: none }` (items shown as a wrapped list, no scroll). No layout shift.

## Phase 2 changes
- KEEP file as-is.
- Add `globals.css` reduced-motion override for `.ticker-marquee`.
- Document the item model + breaking/alert aria contract in NEWS_TICKER_DESIGN.md.
