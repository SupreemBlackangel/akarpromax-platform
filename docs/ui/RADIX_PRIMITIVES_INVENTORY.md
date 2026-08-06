# Radix Primitives Inventory

Generated: 2026-08-06

Scope: does the target app use `@radix-ui/*` primitives? What did Phase 0
choose, and what is the dependency/bundle/a11y impact?

## Existing shared primitives (pre-Phase 0)

| Component | Location | Notes |
| --- | --- | --- |
| `Modal` | `src/components/shared/Modal.tsx` | Basic dialog; hardened in Phase 0 (unique title id, focus trap, focus restore). |
| `Input` | `src/components/shared/Input.tsx` | Label + error wrapper; hardened in Phase 0 (`aria-invalid`/`aria-describedby`). |
| `AccountDialog` | `src/components/AccountDialog.tsx` | Custom auth dialog with tabs + multi-step register; hardened in Phase 0. |

## Duplicates

- Two dialog implementations exist: shared `Modal` (generic) and
  `AccountDialog` (auth-specific, owns its backdrop/focus logic). Both are
  hardened now; merging `AccountDialog` onto `Modal` is a future cleanup, not a
  Phase 0 requirement.

## Radix dependency status

**Not installed.** `package.json` has no `@radix-ui/*` packages. Phase 0
deliberately does **not** introduce a UI-component dependency; it ships the
native primitives instead.

## Chosen primitives (Phase 0, `src/components/ui/`)

| File | Purpose | Rationale |
| --- | --- | --- |
| `VisuallyHidden.tsx` | `sr-only` wrapper | One CSS class; no dependency. |
| `SkipLink.tsx` | Skip-to-content anchor | Static server component; no JS. |
| `FormError.tsx` | `role="alert"` error text | 15-line component; no dependency. |
| `FormField.tsx` | label + control + error/hint wiring | Generates ids + `aria-*`; mirrors native `<label>` semantics. |
| `focus-trap.ts` | Tab cycling for dialogs | Pure `clampFocusIndex` + thin DOM wrapper; unit-testable. |

## Files using the new primitives

- `app/layout.tsx` → `SkipLink`
- `src/components/shared/Modal.tsx` → `focus-trap`
- `src/components/AccountDialog.tsx` → `focus-trap`
- `src/components/shared/Input.tsx` → inline `aria-*` (no wrapper change)

## Deferred (future, not Phase 0)

- Replacing `AccountDialog` with a Radix `Dialog`/`Tabs` composition, if a
  dependency is ever acceptable.
- `Popover`/`Select`/`Tooltip` primitives for the marketplace tooling.
- Consolidating the two dialogs.

## Package impact

None — no new dependency, no `package-lock.json` change from Phase 0 UI work.

## Bundle impact

Negligible: the new files are small (< 100 LOC combined), and `focus-trap.ts`
is shared between the two dialog implementations.

## A11y impact

Positive: `aria-modal`/labelled-by/`aria-invalid`/`aria-describedby`/focus
trapping/restore/reduced-motion are now first-class in the shared surfaces.
Baseline contract: `tests/accessibility.test.mjs` (12 tests). Full WCAG
audit remains deferred (see `PHASE_0_ACCESSIBILITY_BASELINE.md`).
