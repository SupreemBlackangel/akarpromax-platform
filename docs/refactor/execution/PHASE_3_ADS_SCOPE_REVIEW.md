# Phase 3 — Commit Scope Review (ads `domains` targeting)

**Commit (planned):** `feat(ads): domain targeting for campaigns`
**Parent:** `e480e50`
**Date:** 2026-08-06

## Files (9)

| Path | Change |
|---|---|
| `lib/ad-schema.ts` | `ADD COLUMN domains TEXT NULL` in `AD_CAMPAIGN_NEW_COLUMNS` (ALTER works on SQLite + MySQL via existing duplicate-column catch) |
| `lib/ads/types.ts` | `domains: string[]` on `ParsedAd` |
| `lib/ads/context.ts` | carry `domain` through `ResolvedAdContext` / `buildContext` |
| `lib/ads/engine.ts` | scoring rule: empty `domains` matches everywhere (backward compatible); otherwise context domain must be included (or `general`) |
| `lib/ads/admin.ts` | persist/read `domains` on campaigns |
| `app/api/ads/route.ts` | accept/return `domain`/`domains` |
| `app/api/admin/ads/route.ts` | store `domains` on campaign create/update |
| `src/components/AdSlot.tsx` | pass context `domain` |
| `src/components/AdRequestDialog.tsx` | `domains` field in form payload |

No `lib/mysql-runtime.ts` change: the ad_campaigns ALTER list in
`lib/ad-schema.ts` already runs on the MySQL adapter too.

## Excluded

`app/admin/ads/ads-admin-client.tsx` (role-label wiring batch — later commit).

## Criterion

**Unrelated files = 0.**
