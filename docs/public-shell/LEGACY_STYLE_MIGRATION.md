# Legacy Style Migration

Generated: 2026-08-06
Status: ACCEPTED (Phase 2)

## Principle

The unified public shell is **token-only**: every new component references
`var(--color-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`,
`var(--font-*)`, and `var(--layer-*)` tokens. No raw hex, no legacy `.class`
selectors, no `globals.css` legacy rules are used by the shell.

## What migrated

| Element | Before (legacy) | After (Phase 2) |
| --- | --- | --- |
| Header | `shared/Header` (raw locale ternaries, broken `/properties` link, no `aria-current`) | `public-header.tsx` (config-driven, `aria-current`, token-only) |
| Footer | `shared/Footer` (placeholder links) | `public-footer.tsx` (config-driven, only real routes, no placeholders) |
| Nav | inline links in `shared/Header` | `desktop-navigation.tsx` + `mobile-navigation.tsx` from `PUBLIC_NAV` |
| Mobile menu | none | `mobile-navigation.tsx` (Dialog semantics) |
| Ad regions | inline `AdSlot` in `PublicPageShell` | `ad-slot-frame.tsx` from `AD_PLACEMENT_REGISTRY` |
| Cookie consent | none | `cookie-notice.tsx` (localStorage-gated) |
| Skip link target | landing `<main id="top">` (no `#main-content`) | landing `<main id="main-content">` (global SkipLink now works on `/`) |

## What did NOT migrate (intentionally)

- `app/page.tsx` landing — not rebuilt (out of Phase 2 scope). Only its
  `#top`→`#main-content` anchors were retargeted so the global SkipLink resolves.
- `shared/Header.tsx` / `shared/Footer.tsx` — files kept (admin still uses the
  header); public shell no longer imports them.
- Legacy `.container`, `.reference-*`, `.brand` classes in `app/page.tsx` —
  untouched.
- `globals.css` legacy rules — untouched except the pre-existing
  `prefers-reduced-motion` block that already covers `.ticker-marquee`.

## Token coverage

All new shell components use the Phase-0/1 token set. No new custom properties
were added in Phase 2. Directionality uses logical properties
(`inset-inline-start`, `border-e`) so RTL/LTR works without duplicate rules.
