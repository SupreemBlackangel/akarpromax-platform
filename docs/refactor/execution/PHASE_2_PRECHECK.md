# Phase 2 Precheck

Generated: 2026-08-05

## Current State

```
Current branch: refactor/architecture-foundation
Current commit: 36f93ee
Working tree status: CLEAN (3 untracked docs)
Architecture tests: PASS (0 violations, 16 warnings)
Legacy exception count: 23
Blocking violations: 0
Typecheck: PASS
Tests: PASS
Build: PASS
```

## Files Already Modified

- None (clean working tree)

## Phase 2 Allowed Files

- `app/layout.tsx`
- `app/globals.css` (tokens only)
- `app/page.tsx` (wrap with PublicPageShell only)
- `app/services/page.tsx` (wrap with PublicPageShell only)
- `app/properties/[id]/page.tsx` (wrap with PublicPageShell only)
- `app/tools/page.tsx` (wrap with PublicPageShell only)
- `app/admin/**` (layout/shell wiring only)
- `src/components/shared/**` (new shared UI)
- `src/components/layout/**` (new layouts)
- `src/components/AdSlot.tsx` (standardize)
- `src/constants/advertising.ts` (classify only)
- `docs/design/**`
- `docs/refactor/execution/**`

## Phase 2 Forbidden Files

- `db/**`
- `lib/db/**`
- `lib/auth/**`
- `lib/mysql*.ts`
- `app/api/**`
- `package.json`
- `architecture-exceptions.json` (remove only)
- Environment files
- Lock files

## Rollback Point

```
Tag: pre-phase-2
Commit: 36f93ee
```
