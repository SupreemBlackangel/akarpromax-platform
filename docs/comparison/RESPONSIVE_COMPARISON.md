# Responsive Comparison

**Mode:** PLAN (read-only). Live viewport testing deferred (needs running servers + browser tooling); conclusions below are static (source-of-truth evidence) and flagged accordingly.

---

## 1. Reference responsive evidence (static)

- **Mobile-first intent:** `MobileStickyContact.tsx`, `InstallPWA.tsx` (mobile PWA), `browserslist` including ios/android, hero/rotating ad components designed for both breakpoints.
- **Mechanics:** Tailwind responsive prefixes + Radix `navigation-menu`/`menubar`; `PageHeroSlideshow`/`PageHeroGallery` used per-page.
- **Weak signals:** no visible `viewport` meta logic to verify statically; CSR bundle is heavy (three.js, onnxruntime, tesseract, pdfjs, leaflet all in one client) → poor mobile perf risk; no code-splitting config evidence (`vite-plugin-compression` only).

## 2. Target responsive evidence (static)

- **Mobile-first directive (non-negotiable):** route groups `(public)`/`(account)`/`(workspace)` + responsive shells (`PublicPageShell`, `AdminPageShell`), `admin-sidebar`, services dashboards.
- **Mechanics:** Tailwind 4 breakpoints; `LocationPicker`/`CountryFlag` designed for compact layout; `FloatingAdSlotActions` implies mobile ad interactions.
- **Perf advantage:** SSR/RSC + route handlers; heavy libs (leaflet, proj4, pdfjs, tesseract) isolated to `/tools` and cad components (code-split per route), unlike reference's single-bundle inclusion.

## 3. Scorecard

| Dimension | Reference | Target | Verdict |
|---|---|---|---|
| Mobile layout intent | 3 | 4 | Target shells are mobile-first by directive |
| Performance on mobile | 1 (single big bundle) | 4 (route-split heavy deps) | Target superior |
| PWA/offline | 3 (InstallPWA) | 1 (none) | Optional rebuild (Wrangler) |
| Sticky/mobile CTAs | 3 (MobileStickyContact) | 2 | Port sticky contact on public pages |

## 4. Decisions

- **KEEP** target mobile-first shells. REUSE_AS_IS.
- **MERGE (ADAPT):** port `MobileStickyContact` and ad-rotating banners into `PublicPageShell` responsive layout.
- **REBUILD_FROM_BEHAVIOR:** PWA install/offline via `wrangler` static config + service worker (no new plugin required) — Phase 9, approval item.
- **DO_NOT_MIGRATE:** reference bundle structure (all-libs-in-one-client).

**Decision:** KEEP target responsive architecture; MERGE reference mobile components as ADAPT; PWA as optional Phase 9 REBUILD.
