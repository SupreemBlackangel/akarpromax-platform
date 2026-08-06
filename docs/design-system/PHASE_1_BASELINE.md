# Phase 1 — Baseline

Generated: 2026-08-06

Target: `E:\Akarpromax new 2027\V 2.0 GPT - Copy`
Reference (read-only): `D:\new program - Copy\akarpromax-web\akar-frontend-src`
Phase 0 status: **COMPLETE** (`docs/verification/PHASE_0_RESULT.md`, 130/130 tests, all gates green).

## Git baseline

- Branch: `refactor/architecture-foundation`
- HEAD before Phase 1: `0ebdc92` (`docs(phase0): ADRs, security policies, inventories, and verification baselines`)
- Worktree: clean except untracked `docs/comparison/` (Phase 0 PLAN-mode reports, intentionally uncommitted).
- Phase 1 will not touch the reference repo.

## Current styling architecture

| Item | Status |
| --- | --- |
| CSS framework | Tailwind CSS **4.2.1** via `@tailwindcss/postcss` (PostCSS-only). **No `tailwind.config.*`** — Tailwind 4 is CSS-first (`@theme`). |
| Global stylesheet | Single `app/globals.css` (~1,540 lines). Contains the tiny existing `:root` token set, `@theme inline` mapping, all component styles (heavily class-based, mostly hardcoded hex), dark-mode overrides via `html[data-theme="dark"] .selector`, and RTL overrides via `html[dir="ltr"] .selector`. |
| Existing token source | `:root` in `app/globals.css`: `--ink #0b214c`, `--blue #1769ff`, `--blue-dark #0e4fd2`, `--sky #edf3ff`, `--lavender #f5f7ff`, `--paper #fbfcff`, `--line #dce5f4`, `--muted #7e8ca5`, `--gold #d8af55`. |
| `@theme inline` | `--color-background: var(--paper); --color-foreground: var(--ink); --font-sans: var(--font-site)` — `--font-site` is **referenced but never defined** (pre-existing gap). |
| UI libraries | None (no Radix, no shadcn, no MUI, no component kit). `lucide-react` present. |
| CSS variables | Only the 9 `:root` colors; everything else is literal hex (`394` unique hex values, `1166` occurrences). |
| Dark Mode | `data-theme="dark"` attribute set by the theme boot script (`app/layout.tsx`, `akarpromax-theme`); styles use `html[data-theme="dark"] .class` overrides (no dark: utilities because Tailwind config-free). |
| RTL | Default document is `dir="rtl" lang="ar"`; LTR handled by a few `html[dir="ltr"]` overrides. Physical properties (`right`, `left`, `margin-left`) used throughout, not logical properties. |
| Fonts | No `next/font`; font stacks in CSS: Arabic `"IBM Plex Sans Arabic", "Noto Kufi Arabic", "Noto Sans Arabic", Tahoma, Arial`; Latin `Inter, "Segoe UI", Roboto, Arial`. Weights 800/900 used heavily; body 15px/1.75. |
| Component primitives | `src/components/ui/` (Phase 0): `VisuallyHidden`, `SkipLink`, `FormError`, `FormField`, `focus-trap`. `src/components/shared/`: `Modal` (hardened), `Input`. |
| Layout components | None. Pages repeat `container`, `mx-auto`, `px-*`, `py-*`, `gap-*`. |

## Existing UI libraries / frameworks (inventory)

- `lucide-react` — the only icon set (tree-shakeable named imports).
- `tailwindcss` + `@tailwindcss/postcss` — utility framework, CSS-first.
- `leaflet` — maps (feature surfaces only).
- **No** Radix, floating-ui is a transitive dep of the reference only, **no** new UI framework will be added.

## Duplicate components (visual)

| Role | Implementations found |
| --- | --- |
| Buttons | `.button-primary`, `.button-quiet`, `.account-submit`, `.account-cancel`, `.location-save`, `.location-cancel`, `.sidebar-link`, `.menu-trigger`, `.country-trigger`, `.city-trigger`, `.tool-cluster` triggers, `.hero-ad-controls`, `.ad-slot` CTAs — ~25 distinct button-looking rules. |
| Inputs | `.shared-input`, `.input-default`, `.input-search`, `.account-field input/select`, `.location-field input/select`, `.admin-*` fields, `.cad-*` fields, `.tc-*` fields — ~15 distinct input rules. |
| Cards | `.property-*`, `.service-*`, `.tool-*`, `.office-*`, `.sponsor-*`, `.admin-stat-*`, `.news-*` — ~10 card families, each with bespoke padding/radius/shadow. |
| Dialogs | `src/components/shared/Modal.tsx` + `AccountDialog.tsx` (hardened in Phase 0). |
| Containers | `.container` (1140px), `max-w-*` utilities, `.admin-*` wrappers — inconsistent widths. |

## Hardcoded visual values (top offenders in `app/globals.css`)

| Value | Count | Typical use |
| --- | --- | --- |
| `#fff` | 109 | surfaces, text-on-primary |
| `#1769ff` | 79 | primary blue (duplicates `--blue`) |
| `#304867` / `#0f1d33` / `#263a5a` / `#10264c` | ~103 | dark-mode panels/borders |
| `#e8efff` | 26 | dark-mode text |
| `#d9e5f8` / `#eaf2ff` / `#f8fbff` / `#eef5ff` | ~50 | light borders/soft fills |
| `#667895` / `#7e8ca5` / `#536781` / `#8c9ab0` | ~35 | secondary/muted text |

Full audit: `VISUAL_IDENTITY_AUDIT.md`.

## Known visual inconsistencies

1. Font sizes 7–10px on many labels/meta (below comfortable readability; no token scale).
2. Border-radius mixes 7/8/10/11/12/999 with no scale.
3. Shadows are ad-hoc (several `rgba(25,64,123,…)` presets, no scale).
4. z-index values 3/16/20/35/36/999+ with no layer system.
5. Container widths vary (1140px `.container`, `max-w-*` variants).
6. No logical properties in the legacy sheet → RTL relies on scattered `html[dir="ltr"]` fixes.
7. Dark mode is class-by-class; new primitives will use tokens so they flip automatically.

## Files NOT to modify in Phase 1

- `app/page.tsx` and all public feature pages (no full page rebuilds in Phase 1).
- `app/api/**` (no API changes).
- `lib/db/**`, `lib/runtime-db.ts`, `drizzle*` (no DB changes).
- `lib/auth/**`, `app/api/auth/**`, `lib/security/**`, `lib/api/handler.ts` (auth already hardened in Phase 0; no changes).
- `scripts/**`, `.env.example` (already updated in Phase 0), `.env`.
- The legacy selector rules in `app/globals.css` (legacy styles stay; tokens are additive). Only the top of the file (imports + `:root` + `@theme`) is adjusted to load `src/styles/tokens.css`.

## Phase 1 scope guardrails

- Single token source: `src/styles/tokens.css` (+ `@theme` mapping).
- Primitives under `src/components/ui/` and `src/components/layout/`; patterns under `src/components/shared/`.
- No business/API/db/auth changes; no full page rebuilds; limited migration only as proof points (existing pages untouched except where a Phase 0 primitive is already in use).
