# Phase 3 Result — Feature-Page Adoption

Baseline: commit `ea3eb1f` (Phase 2 final). Pilot `7c1d79a` committed the
services page adoption. This result covers the rollout commit that adopts
Phase 1–2 primitives across the remaining public feature pages.

## Scope

Adopt the unified primitive set (`PageContainer`, `Grid`, `Section`, `Stack`,
`Inline`, `ui/Button`) and the legacy→token color migration onto the
feature pages listed in `PHASE_3_BASELINE.md`. AdSlot output is wrapped in
`ui/AdFrame` (the shell-level composition policy). **Out of scope** (see
matrix): `app/page.tsx` landing rebuild, `app/admin/**`, `app/dashboard/**`,
`app/dev/**`, DB/auth/ads-engine/news-schema, full `globals.css` hex backfill.

## Changes made

| File | Primitive adoption |
| --- | --- |
| `app/services/catalog/page.tsx` | `PageContainer` + 2× `Grid(columns={3})` |
| `app/services/catalog/[code]/page.tsx` | `PageContainer` + 2× `Grid(columns={3})` (provider/request lists) |
| `app/service-requests/page.tsx` | `PageContainer` + `Grid(columns={3})` |
| `app/service-requests/new/page.tsx` | `PageContainer` (×2 blocks) + 2× `Grid(columns={2})` + `Button`(auth/submit) + `AdFrame` around bottom `AdSlot` |
| `app/service-requests/[id]/page.tsx` | `PageContainer` (×3 blocks) + `Button`(make-offer CTA) |
| `app/service-requests/[id]/offer/page.tsx` | `PageContainer` (×2 blocks) + `Grid(columns={2})` + `Button`(auth/submit, submit `loading={submitting}`) |
| `app/properties/[id]/page.tsx` | `PageContainer` (×3) + `Button`(ask CTA) + `AdFrame` around all 4 `AdSlot`s + full `var(--*)→--color-*` token migration (32 refs) |
| `app/providers/[id]/page.tsx` | `PageContainer` + `Grid(columns={3})` + token migration |
| `app/providers/apply/page.tsx` | `PageContainer` + `Grid(columns={2})` + token migration |
| `src/components/tools/ToolsPageClient.tsx` | `AdFrame` around hero `AdSlot` only (`tc-*` self-contained system preserved) |

### Color-token mapping applied
`--blue→--color-primary`, `--ink→--color-text-primary`, `--muted→--color-text-muted`,
`--gold→--color-accent`, `--sky→--color-surface-soft`, `--lavender→--color-surface-muted`,
`--paper→--color-background`, `--line→--color-border`, `--blue-dark→--color-primary-hover`.

### Preserved (intentional)
- Tailwind utility form controls (`<input>`/`<select>`/`<textarea>` with `bg-gray-*` etc.) — kept, consistent with the committed `service-requests/page.tsx` (select/Link CTA retained).
- `<Link>` CTAs with `bg-blue-600` — kept as links (navigation, not buttons).
- `tools` `tc-*` CSS system (`globals.css` 1271–1390) — self-contained, not legacy `var(--)`.
- `app/page.tsx` landing — untouched except Phase 2 `#main-content` anchors.

## Gate evidence

| Gate | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean (0 errors) |
| Lint | `npm run lint` | 0 errors (23 pre-existing warnings unchanged) |
| Build | `npm run build` | complete |
| Tests | `npm test` | 100/100 |
| Architecture | `npx tsx scripts/check-architecture.mjs` | PASS |

### ARCH-025 note
`app/service-requests/new/page.tsx` flags 316 lines (>300 page-component threshold).
The page was 312 lines in the Phase 2 baseline (already over), so this is a
pre-existing condition, not a regression introduced by the migration. The wizard
form itself is out of Phase-3 scope to split.

## Verification limits
- No visual screenshot/diff infra (no browser); correctness verified by tsc +
  build + unit tests. The `Button` variant uses `--color-primary` (#1769ff) vs the
  prior Tailwind `blue-600` (#2563eb) — accepted as the canonical design-token move.
- The `dir` prop passthrough on `PageContainer` (added in pilot `7c1d79a`) was
  confirmed needed by the services-* pages; no further `dir`-related changes
  were required.
