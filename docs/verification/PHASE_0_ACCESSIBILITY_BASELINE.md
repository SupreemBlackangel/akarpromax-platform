# Phase 0 — Accessibility Baseline

Generated: 2026-08-06

Scope: the a11y baseline shipped by Phase 0. It is a **foundation**, not a full
audit: it fixes the shared primitives and the primary interactive surfaces
(auth dialog, shared modal/input, root layout). Full-page WCAG audits remain a
follow-up (see the deferred list below).

## What was delivered

| Item | Location | Change |
| --- | --- | --- |
| Visually hidden utility | `src/components/ui/VisuallyHidden.tsx` | `sr-only` pattern (CSS in `app/globals.css`). |
| Skip link | `src/components/ui/SkipLink.tsx` | Rendered at the top of `app/layout.tsx`, targets `#main-content`. Visually hidden until focused (`.skip-link:focus`). |
| Form error | `src/components/ui/FormError.tsx` | `role="alert"` announcement + stable id. |
| Form field wrapper | `src/components/ui/FormField.tsx` | Wires `htmlFor`, `aria-invalid`, `aria-describedby` (error and hint) onto the child control. |
| Focus trap util | `src/components/ui/focus-trap.ts` | Tab-cycling inside modal dialogs (`clampFocusIndex` pure + `trapFocusKeydown`). |
| Shared `Input` | `src/components/shared/Input.tsx` | `aria-invalid`, `aria-describedby` → `id="<input>-error"`, error span `role="alert"`. |
| Shared `Modal` | `src/components/shared/Modal.tsx` | Unique title id (`useId` — fixes the old hardcoded `modal-title` collision), focus trap, initial focus to the dialog, focus restore to the trigger on close. |
| Account dialog | `src/components/AccountDialog.tsx` | Focus trap + focus restore; `aria-invalid`/`aria-describedby` wired on login/register fields and the country/city selects. |
| Landmark | `src/components/PublicPageShell.tsx` | `<main id="main-content">` target for the skip link. |
| Reduced motion | `app/globals.css` | Global `prefers-reduced-motion: reduce` block disabling animation/transition/scroll-behavior. |

## Baseline contract (covered by `tests/accessibility.test.mjs`)

- `VisuallyHidden` renders the `sr-only` class.
- `SkipLink` renders `a.skip-link[href="#main-content"]`.
- `FormError` renders `role="alert"` with the requested id.
- `FormField`/`Input` link `label[for]` ↔ control id, set `aria-invalid` only
  on error, and point `aria-describedby` at a real element (error/hint).
- `Modal` returns nothing when closed; when open it exposes `role="dialog"`,
  `aria-modal="true"`, a labelled title whose id is unique within the tree.
- `AccountDialog` exposes a labelled, modal dialog.
- `clampFocusIndex` wraps focus in both directions and handles edge counts.

## Baseline test run

```
node --import tsx --test tests/accessibility.test.mjs   # 12/12 pass
```

## Deferred (follow-up, not Phase 0)

- Full WCAG 2.1 AA page audits (color contrast, heading order, live regions).
- Header/navigation keyboard model and aria-current inventory.
- Admin surfaces (`app/admin/*`) — duplicate `main` landmarks exist and are out
  of scope for this phase.
- Focus styles audit across all components (targeted `:focus-visible` work is
  in progress elsewhere).
