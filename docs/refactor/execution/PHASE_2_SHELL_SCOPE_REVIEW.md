# Phase 2 — Commit Scope Review (design system shells)

**Commit (planned):** `refactor(ui): phase 2 design system shells`
**Parent:** `160779d`
**Date:** 2026-08-06

## Files (4)

| Path | Change |
|---|---|
| `app/globals.css` | +253 lines design-system styles (service-tools cards, shared header/footer, sidebar polish) |
| `src/components/shared/Header.tsx` | `<a>` → `<Link>`; remove dead `menuOpen` state (lint + nav polish) |
| `src/components/shared/Footer.tsx` | `<a>` → `<Link>` |
| `src/components/AccountDialog.tsx` | −154 lines auth-UI cleanup (removed verification step) |

## Note

`src/data/translations.ts` and `src/types/site.ts` were classified under Phase 2
in the inventory but were required to build `app/page.tsx` and therefore
already committed in the Phase 3 batch (`e480e50`). This batch is the remaining
Phase 2 shell work.

## Excluded

Role-label admin clients (`app/admin/sponsors/*`, `app/admin/ads`,
`app/admin/i18n`, `app/api/sponsor-access`) — separate wiring batch.

## Criterion

**Unrelated files = 0.**
