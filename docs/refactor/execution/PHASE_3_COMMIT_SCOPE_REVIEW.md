# Phase 3 — Commit Scope Review (tools + properties + home wiring)

**Commit (planned):** `feat(phase3): tools gate, properties backend, and home wiring`
**Parent:** `757e532`
**Date:** 2026-08-06

## Command

```bash
git status --porcelain   # classified per PHASE_4_DIRTY_WORKTREE_INVENTORY.md
```

## Rationale for ordering

`app/page.tsx` (home) mixes Phase 2 polish (lucide admin/sidebar icons, services
band) with Phase 3 work (featured-properties API grid, `/tools` service links)
and imports `PublicProperty` from `lib/properties-format` and
`service.href/ariaLabel/...` typed in `src/types/site.ts`. Both of those are
currently uncommitted, so **page.tsx, site.ts and translations.ts must land with
the Phase 3 batch** (a standalone Phase 2 commit first would not typecheck).
`lib/runtime-db.ts` / `lib/mysql-runtime.ts` also regain the
`ensurePropertiesSchema` call (removed from the Phase 4A diff deliberately).

## Files

### Create (untracked)
- `lib/properties-schema.ts` — `CREATE TABLE IF NOT EXISTS property_listings` +
  `ensurePropertiesSchema(db)`.
- `lib/properties-format.ts` — `PropertyRow`, `PublicProperty`, `PROPERTY_SELECT`,
  `parsePropertyFeatures`, `serialiseProperty`.
- `app/api/properties/route.ts` — GET list (`country`, `city`, `featured`, `limit`),
  active only, `force-dynamic`.
- `app/api/properties/[id]/route.ts` — GET by id/slug, active only.
- `src/lib/cad/**` (6) — `coordinates`, `dxf-generator`, `image-export`,
  `pdf-export`, `svg-export`, `types`, `validation`, `index`.
- `src/components/cad/**` (5) — `CadExportPanel`, `CadLayersPanel`, `CadPreview`,
  `CadValidationSummary`, `ToolFileDropzone`.
- `src/components/tools/{ToolCard,ToolsEmptyState,ToolsSkeletonLoader}.tsx`.
- `src/data/toolsData.ts`.
- `docs/refactor/execution/PHASE_3_TOOLS_AND_PROPERTIES_SUMMARY.md`.

### Modify (tracked)
- `app/page.tsx` — featured-properties grid + lucide icons + services-band `/tools` links.
- `app/properties/[id]/page.tsx` — client fetch detail page with ad slots.
- `src/components/tools/{PointsToDxf,ToolsGate,ToolsPageClient}.tsx` — gated tools page.
- `src/components/LocationChip.tsx`, `src/components/LocationPicker.tsx` —
  microtask set-state-in-effect fix (Phase 2/3 batch per inventory §4).
- `src/types/site.ts` — services copy gains `href/shortDescription/ariaLabel/iconAlt`.
- `src/data/translations.ts` — services-band tool links (ariaLabel/iconAlt) + role labels.
- `lib/runtime-db.ts`, `lib/mysql-runtime.ts` — `ensurePropertiesSchema` import + call.

## Excluded (later batches)

Ads `domains` (`lib/ad-schema.ts`, `lib/ads/*`, `app/api/ads/*`,
`AdSlot`, `AdRequestDialog`, `app/api/admin/ads`), Phase 2 shells
(`app/globals.css`, `Header`, `Footer`, `AccountDialog`), role-label admin clients
(`app/admin/sponsors/*`, `app/admin/ads`, `app/admin/i18n`, `app/api/sponsor-access`),
docs, and `akarpromax-pre-refactor.bundle`.

## Criterion

**Unrelated files = 0** — every staged file belongs to Phase 3 tools/properties or
is a hard build dependency of `app/page.tsx` (site.ts, translations.ts).
