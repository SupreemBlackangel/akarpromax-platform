# Phase 4 — Dirty Worktree Inventory

**Date:** 2026-08-06
**Captured at:** commit `55e6872` (services) on branch `refactor/architecture-foundation`
**Snapshot:** `.local-backup/post-phase4/dirty-after-phase4.patch` + `dirty-files.txt`
**Scope:** classify every dirty (uncommitted) file after the Phase 4 commits.

Legend:
- **Related phase** — the work stream that produced the change.
- **Required by 46f8df5 / 55e6872** — does the committed code of that commit
  need this dirty file to build or test? Verified by clean-worktree builds
  (Steps 3–4). All rows are NO.
- **Safe to stash** — can the change be temporarily moved out of the worktree
  without losing it (backup patch exists).
- **Safe to commit later** — belongs to a future corrective commit, not mixed
  into Phase 4 history.

---

## 1. Runtime bridge (explicitly named)

| Field | `lib/runtime-db.ts` | `lib/mysql-runtime.ts` |
|---|---|---|
| Required by 46f8df5 | NO | NO |
| Required by 55e6872 | NO | NO |
| Tracked | YES | YES |
| Safe to stash | YES | YES |
| Safe to commit later | YES (runtime-bridge batch) | YES (runtime-bridge batch) |
| Risk | Low build risk; runtime gap | Low build risk; runtime gap |
| Recommended action | Defer to a services corrective commit with `ensureServicesMarketplaceSchema` + `ensurePropertiesSchema` wiring | Same |

Both add `ensureServicesMarketplaceSchema` / `seedServicesMarketplace` /
`ensurePropertiesSchema` calls to the runtime DB init. They were **excluded** from
commits 46f8df5/55e6872 because they import files from both Phase 3
(`lib/properties-schema.ts`) and the services module — committing them would have
made an intermediate commit unbuildable.

---

## 2. Services domain — OMITTED from commit 55e6872 (scope gap, not a dirty dependency)

`app/dashboard/services/**` (untracked, 10 files): `page.tsx`, `inbox`, `jobs`,
`jobs/[id]`, `matched-requests`, `my-requests`, `offers`, `offers/[id]`,
`provider-profile`, `reviews`.

| Field | Value |
|---|---|
| Related phase | Phase 4 — Services (provider dashboard) |
| Required by 46f8df5 | NO |
| Required by 55e6872 | NO (imports only committed `src/components/services/*` + `src/lib/services-client`; nothing in the commit imports the dashboard) |
| Tracked | NO (untracked) |
| Safe to stash | YES |
| Safe to commit later | YES — minimal corrective services commit |
| Risk | Feature incompleteness (provider dashboard pages not under version control); no build/test impact |
| Recommended action | Independent corrective commit `feat(services): provider dashboard` (services files only, no Phase 2/3 mixing) |

---

## 3. Phase 2 — design system / page shells

| Path | Required 46f8df5 | Required 55e6872 | Tracked | Safe to commit later | Recommended action |
|---|---|---|---|---|---|
| `app/globals.css` | NO | NO | YES | YES (Phase 2 batch) | Later Phase 2 commit |
| `app/page.tsx` | NO | NO | YES | YES | Later Phase 2 commit |
| `src/components/shared/Header.tsx` | NO | NO | YES | YES | Later Phase 2 commit |
| `src/components/shared/Footer.tsx` | NO | NO | YES | YES | Later Phase 2 commit |
| `src/data/translations.ts` | NO | NO | YES | YES | Later batch (with services translations) |
| `src/types/site.ts` | NO | NO | YES | YES | Later batch |
| `src/components/AccountDialog.tsx` | NO | NO | YES | YES | Auth-UI cleanup (removed verification step) |

---

## 4. Phase 3 — tools

| Path | Required 46f8df5 | Required 55e6872 | Tracked | Recommended action |
|---|---|---|---|---|
| `src/components/tools/PointsToDxf.tsx` | NO | NO | YES | Later Phase 3 commit |
| `src/components/tools/ToolsGate.tsx` | NO | NO | YES | Later Phase 3 commit |
| `src/components/tools/ToolsPageClient.tsx` | NO | NO | YES | Later Phase 3 commit |
| `src/components/tools/ToolCard.tsx` | NO | NO | NO | Later Phase 3 commit |
| `src/components/tools/ToolsEmptyState.tsx` | NO | NO | NO | Later Phase 3 commit |
| `src/components/tools/ToolsSkeletonLoader.tsx` | NO | NO | NO | Later Phase 3 commit |
| `src/data/toolsData.ts` | NO | NO | NO | Later Phase 3 commit |
| `src/components/cad/**` | NO | NO | NO | Later Phase 3 commit |
| `src/lib/cad/**` | NO | NO | NO | Later Phase 3 commit |
| `src/components/LocationChip.tsx` | NO | NO | YES | Later Phase 3 commit |
| `src/components/LocationPicker.tsx` | NO | NO | YES | Later Phase 3 commit |

---

## 5. Phase 3 — properties

| Path | Required 46f8df5 | Required 55e6872 | Tracked | Recommended action |
|---|---|---|---|---|
| `app/properties/[id]/page.tsx` | NO | NO | YES | Later Phase 3 commit |
| `app/api/properties/**` | NO | NO | NO | Later Phase 3 commit |
| `lib/properties-format.ts` | NO | NO | NO | Later Phase 3 commit |
| `lib/properties-schema.ts` | NO | NO | NO | Later Phase 3 commit |

---

## 6. Phase 3 — ads `domains` feature

| Path | Required 46f8df5 | Required 55e6872 | Tracked | Recommended action |
|---|---|---|---|---|
| `app/api/admin/ads/route.ts` | NO | NO | YES | Later ads/domains commit |
| `app/api/ads/route.ts` | NO | NO | YES | Later ads/domains commit |
| `lib/ad-schema.ts` | NO | NO | YES | Later ads/domains commit |
| `lib/ads/admin.ts` | NO | NO | YES | Later ads/domains commit |
| `lib/ads/context.ts` | NO | NO | YES | Later ads/domains commit |
| `lib/ads/engine.ts` | NO | NO | YES | Later ads/domains commit |
| `lib/ads/types.ts` | NO | NO | YES | Later ads/domains commit |
| `src/components/AdSlot.tsx` | NO | NO | YES | Later ads/domains commit |
| `src/components/AdRequestDialog.tsx` | NO | NO | YES | Later ads/domains commit |

---

## 7. Sponsors / i18n / ads admin — role & wiring labels

| Path | Required 46f8df5 | Required 55e6872 | Tracked | Recommended action |
|---|---|---|---|---|
| `app/admin/sponsors/sponsor-admin-client.tsx` | NO | NO | YES | Role-label wiring batch |
| `app/admin/sponsors/_components/SponsorRequestsView.tsx` | NO | NO | YES | Role-label wiring batch |
| `app/admin/sponsors/_components/SponsorsListView.tsx` | NO | NO | YES | Role-label wiring batch |
| `app/admin/ads/ads-admin-client.tsx` | NO | NO | YES | Role-label wiring batch |
| `app/admin/i18n/i18n-admin-client.tsx` | NO | NO | YES | Microtask fix (Phase 2/3 batch) |
| `app/api/sponsor-access/route.ts` | NO | NO | YES | New-role enumeration (auth wiring batch) |

All are additive role/permission surface updates that follow from the roles
added in commit 46f8df5; none is required for that commit to build.

---

## 8. Phase 2/3 documentation (untracked)

| Path | Required | Recommended action |
|---|---|---|
| `docs/refactor/execution/PHASE_2_COMPLETION_SUMMARY.md` | NO | Commit with Phase 2 batch |
| `docs/refactor/execution/PHASE_3_TOOLS_AND_PROPERTIES_SUMMARY.md` | NO | Commit with Phase 3 batch |

---

## 9. Backup artifact

| Path | Required | Tracked | Recommended action |
|---|---|---|---|
| `akarpromax-pre-refactor.bundle` | NO | NO | Keep untracked; never commit (2.8 MB pre-refactor git bundle). Consider adding `*.bundle` to `.gitignore` in a later hygiene commit. |

---

## Summary

- 30 tracked modified + 15 untracked paths, **none required by either Phase 4 commit**.
- 1 scope gap: `app/dashboard/services/**` (services provider dashboard) omitted from 55e6872 → corrective services commit proposed.
- 2 runtime-bridge files (`lib/runtime-db.ts`, `lib/mysql-runtime.ts`) intentionally deferred → corrective runtime-wiring commit proposed.
- All other dirty files are Phase 2/3 leftovers to be committed in their own batches.
- Backup patch and file list preserved in `.local-backup/post-phase4/` (gitignored).
